import { prisma } from "@/lib/db"
import { formularSichtbarFuer, formularEmpfaengerFuer, istFormularEmpfaenger } from "@/lib/formulare/sichtbarkeit"

type FormularKontext = { personId: string }

const ELEMENT_INCLUDE = {
  orderBy: { reihenfolge: "asc" as const },
  include: { optionen: { orderBy: { reihenfolge: "asc" as const } } },
}

const ANHANG_SELECT = { id: true, dateiname: true, groesseBytes: true, mimetyp: true, elementId: true } as const

/** Für Spalte 1 der Übersicht — aktive, für die Person freigeschaltete Vorlagen. */
export async function verfuegbareFormulare(kontext: FormularKontext) {
  return prisma.formularVorlage.findMany({
    where: { aktiv: true, istEntwurf: false, ...formularSichtbarFuer(kontext.personId) },
    orderBy: { titel: "asc" },
  })
}

/** Für Spalte 2 — von der Person selbst eingereichte Formulare. */
export async function meineEinreichungen(kontext: FormularKontext) {
  return prisma.formularEinreichung.findMany({
    where: { eingereichtVonId: kontext.personId },
    include: { vorlage: { select: { titel: true } } },
    orderBy: { eingereichtAm: "desc" },
  })
}

/** Für Spalte 3 — Einreichungen, deren Vorlage die Person (direkt, über Gruppe oder Abteilung) als Empfänger hinterlegt hat. */
export async function anMichAdressierteEinreichungen(kontext: FormularKontext) {
  return prisma.formularEinreichung.findMany({
    where: { vorlage: formularEmpfaengerFuer(kontext.personId) },
    include: { vorlage: { select: { titel: true } }, eingereichtVon: { select: { vorname: true, nachname: true } } },
    orderBy: { eingereichtAm: "desc" },
  })
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
