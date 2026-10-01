import { FormularEinreichungStatus } from "@/generated/prisma/enums"
import { prisma } from "@/lib/db"
import { formularSichtbarFuer, formularEmpfaengerFuer, istFormularEmpfaenger } from "@/lib/formulare/sichtbarkeit"

type FormularKontext = { personId: string }

const ELEMENT_INCLUDE = {
  orderBy: { reihenfolge: "asc" as const },
  include: { optionen: { orderBy: { reihenfolge: "asc" as const } } },
}

const ANHANG_SELECT = { id: true, dateiname: true, groesseBytes: true, mimetyp: true, elementId: true } as const

/** Für Spalte 1 der Übersicht — aktive, für die Person freigeschaltete Vorlagen. Dieselbe Liste dient auch als Auswahl für die Formulare-Kachel-Shortcuts auf der Startseite. */
export async function verfuegbareFormulare(kontext: FormularKontext) {
  return prisma.formularVorlage.findMany({
    where: { aktiv: true, istEntwurf: false, ...formularSichtbarFuer(kontext.personId) },
    orderBy: { titel: "asc" },
  })
}

/** Für die Formulare-Kachel auf der Startseite (Form BREIT) — die als Schnellzugriff gewählten Vorlagen in Auswahl-Reihenfolge. Nicht mehr verfügbare/deaktivierte Vorlagen fallen dabei still raus (Muster: personenFuerKachel/ordnerVorschauFuerKachel). */
export async function formularVorlagenFuerKachel(vorlagenIds: string[], kontext: FormularKontext) {
  if (vorlagenIds.length === 0) return []
  const vorlagen = await prisma.formularVorlage.findMany({
    where: { id: { in: vorlagenIds }, aktiv: true, istEntwurf: false, ...formularSichtbarFuer(kontext.personId) },
    select: { id: true, titel: true },
  })
  const nachId = new Map(vorlagen.map((v) => [v.id, v]))
  return vorlagenIds.map((id) => nachId.get(id)).filter((v): v is NonNullable<typeof v> => v !== undefined)
}

const EINREICHUNG_UEBERSICHT_INCLUDE = {
  vorlage: { select: { titel: true } },
  eingereichtVon: { select: { vorname: true, nachname: true } },
} as const

/**
 * Für die Tabs/Spalten "Offene Formulare" und "Erledigt" — eigene und an
 * die Person adressierte Einreichungen zusammengeführt (Rückmeldung
 * 2026-10-01: die Spalte entscheidet sich über den Status, nicht mehr
 * über die Richtung "von mir"/"an mich"). Eine Einreichung, bei der die
 * Person sich selbst als Empfänger eingetragen hat, taucht sonst doppelt
 * auf — deshalb Zusammenführung über eine Map nach `id`. `vonMir` sagt
 * der Oberfläche, ob der Name der einreichenden Person angezeigt werden
 * muss oder nicht.
 *
 * Im Admin-Modus (`firmenweit`, Rückmeldung 2026-10-01) zählt weder
 * Einreichende/-r noch Empfänger — es werden alle Einreichungen der
 * Firma geladen, unabhängig von Vorlage und Person.
 */
export async function offeneUndErledigteEinreichungen(kontext: FormularKontext, firmenweit: boolean) {
  const alle = firmenweit
    ? await prisma.formularEinreichung.findMany({
        include: EINREICHUNG_UEBERSICHT_INCLUDE,
        orderBy: { eingereichtAm: "desc" },
      })
    : await (async () => {
        const [eigene, adressiert] = await Promise.all([
          prisma.formularEinreichung.findMany({
            where: { eingereichtVonId: kontext.personId },
            include: EINREICHUNG_UEBERSICHT_INCLUDE,
            orderBy: { eingereichtAm: "desc" },
          }),
          prisma.formularEinreichung.findMany({
            where: { vorlage: formularEmpfaengerFuer(kontext.personId) },
            include: EINREICHUNG_UEBERSICHT_INCLUDE,
            orderBy: { eingereichtAm: "desc" },
          }),
        ])
        const nachId = new Map<string, (typeof eigene)[number]>()
        for (const einreichung of [...eigene, ...adressiert]) nachId.set(einreichung.id, einreichung)
        return [...nachId.values()]
      })()

  const sortiert = alle
    .map((einreichung) => ({ ...einreichung, vonMir: einreichung.eingereichtVonId === kontext.personId }))
    .sort((a, b) => b.eingereichtAm.getTime() - a.eingereichtAm.getTime())

  return {
    offen: sortiert.filter((einreichung) => einreichung.status !== FormularEinreichungStatus.ERLEDIGT),
    erledigt: sortiert.filter((einreichung) => einreichung.status === FormularEinreichungStatus.ERLEDIGT),
  }
}

/** Für die Formulare-Kachel auf der Startseite — was sich seit dem letzten Blick geändert haben könnte: eigene noch nicht erledigte Einreichungen + an die Person adressierte, noch gar nicht angefasste Einreichungen (Rückmeldung 2026-09-28, "Stand statt Katalog"). */
export async function formulareStartseitenStand(kontext: FormularKontext) {
  const [eigeneOffen, adressiertOffen] = await Promise.all([
    prisma.formularEinreichung.findMany({
      where: { eingereichtVonId: kontext.personId, status: { not: "ERLEDIGT" } },
      include: { vorlage: { select: { titel: true } } },
      orderBy: { eingereichtAm: "desc" },
    }),
    prisma.formularEinreichung.findMany({
      where: { vorlage: formularEmpfaengerFuer(kontext.personId), status: "OFFEN" },
      include: { vorlage: { select: { titel: true } } },
      orderBy: { eingereichtAm: "desc" },
    }),
  ])
  return { eigeneOffen, adressiertOffen }
}

/** Vorlage + Elemente (+ Optionen) zum Ausfüllen — `null`, wenn für die Person nicht sichtbar. */
export async function formularZumAusfuellen(vorlageId: string, kontext: FormularKontext) {
  return prisma.formularVorlage.findFirst({
    where: { id: vorlageId, aktiv: true, istEntwurf: false, ...formularSichtbarFuer(kontext.personId) },
    include: { elemente: ELEMENT_INCLUDE },
  })
}

/**
 * Nur für Wissensmanager (Berechtigung wird vom Aufrufer geprüft) — alle
 * Vorlagen, aktiv und inaktiv, mit Einreichungs-Zähler. Die
 * Verwaltungstabelle zeigt "Benutzbar für" statt Empfänger an (Rückmeldung
 * 2026-09-09: leichter erkennbar, welcher Zielgruppe ein Formular
 * zugeordnet ist) — Empfänger bleibt weiterhin beim Bearbeiten pflegbar,
 * wird hier aber nicht mehr geladen. Entwürfe (siehe
 * vorlageAlsEntwurfSpeichern) sind NUR für die erstellende Person
 * sichtbar, auch wenn andere Wissensmanager existieren — deshalb
 * `personId`, nicht nur die Berechtigung.
 */
export async function alleVorlagenFuerVerwaltung(personId: string) {
  return prisma.formularVorlage.findMany({
    where: { OR: [{ istEntwurf: false }, { istEntwurf: true, erstelltVonId: personId }] },
    include: {
      benutzbarPersonen: { select: { person: { select: { vorname: true, nachname: true } } } },
      benutzbarGruppen: { select: { gruppe: { select: { name: true } } } },
      benutzbarAbteilungen: { select: { abteilung: { select: { name: true } } } },
      _count: { select: { einreichungen: true } },
    },
    orderBy: { aktualisiertAm: "desc" },
  })
}

/** Eine Vorlage + ihre Elemente/Optionen fürs Bearbeiten — unabhängig von Sichtbarkeit, nur für die Verwaltung (Aufrufer prüft die Berechtigung). */
export async function vorlageDetailFuerVerwaltung(vorlageId: string) {
  return prisma.formularVorlage.findUnique({
    where: { id: vorlageId },
    include: {
      elemente: ELEMENT_INCLUDE,
      empfaengerPersonen: { select: { personId: true } },
      empfaengerGruppen: { select: { gruppeId: true } },
      empfaengerAbteilungen: { select: { abteilungId: true } },
      benutzbarPersonen: { select: { personId: true } },
      benutzbarGruppen: { select: { gruppeId: true } },
      benutzbarAbteilungen: { select: { abteilungId: true } },
    },
  })
}

/** Volle Ansicht einer Einreichung — nur für die einreichende Person oder einen Empfänger, sonst `null`. */
export async function einreichungDetail(einreichungId: string, kontext: FormularKontext) {
  const einreichung = await prisma.formularEinreichung.findUnique({
    where: { id: einreichungId },
    include: {
      vorlage: { include: { elemente: ELEMENT_INCLUDE } },
      eingereichtVon: { select: { vorname: true, nachname: true } },
      antworten: true,
      anhaenge: { select: ANHANG_SELECT },
    },
  })
  if (!einreichung) return null

  const darfSehen =
    einreichung.eingereichtVonId === kontext.personId ||
    (await istFormularEmpfaenger(einreichung.vorlageId, kontext.personId))
  return darfSehen ? einreichung : null
}

/** Kleiner Helfer für die Struktur-Sperre (siehe Plan): sobald es Einreichungen gibt, sind Elemente/Optionen nicht mehr veränderbar. */
export async function vorlageHatEinreichungen(vorlageId: string): Promise<boolean> {
  const treffer = await prisma.formularEinreichung.findFirst({ where: { vorlageId }, select: { id: true } })
  return treffer !== null
}

/** Ob mindestens eine Person/Gruppe/Abteilung als Empfänger hinterlegt ist — Voraussetzung fürs Aktivieren (siehe vorlageAktivSetzen), sonst gäbe es niemanden, der Einreichungen sähe. */
export async function vorlageHatEmpfaenger(vorlageId: string): Promise<boolean> {
  const treffer = await prisma.formularVorlage.findFirst({
    where: {
      id: vorlageId,
      OR: [
        { empfaengerPersonen: { some: {} } },
        { empfaengerGruppen: { some: {} } },
        { empfaengerAbteilungen: { some: {} } },
      ],
    },
    select: { id: true },
  })
  return treffer !== null
}

/** Alle Empfänger-Personen einer Vorlage, dedupliziert — direkt, über Gruppenmitgliedschaft oder aktive Abteilungszugehörigkeit. Für die Benachrichtigung beim Absenden (siehe formularEinreichen). */
export async function formularEmpfaengerPersonenIds(vorlageId: string): Promise<string[]> {
  const vorlage = await prisma.formularVorlage.findUnique({
    where: { id: vorlageId },
    select: {
      empfaengerPersonen: { select: { personId: true } },
      empfaengerGruppen: { select: { gruppe: { select: { mitglieder: { select: { personId: true } } } } } },
      empfaengerAbteilungen: {
        select: {
          abteilung: {
            select: {
              zugehoerigkeiten: {
                where: { OR: [{ bisDatum: null }, { bisDatum: { gt: new Date() } }] },
                select: { personId: true },
              },
            },
          },
        },
      },
    },
  })
  if (!vorlage) return []

  const ids = new Set<string>()
  vorlage.empfaengerPersonen.forEach((e) => ids.add(e.personId))
  vorlage.empfaengerGruppen.forEach((g) => g.gruppe.mitglieder.forEach((m) => ids.add(m.personId)))
  vorlage.empfaengerAbteilungen.forEach((a) => a.abteilung.zugehoerigkeiten.forEach((z) => ids.add(z.personId)))
  return [...ids]
}
