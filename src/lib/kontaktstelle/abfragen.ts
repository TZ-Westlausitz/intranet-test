import { prisma } from "@/lib/db"
import { istKontaktstelle } from "@/lib/kontaktstelle/sichtbarkeit"

/**
 * Kernstück der Anonymitäts-Garantie (Rückmeldung 2026-09-22): Ist eine
 * Meldung `istAnonym`, darf die Kontaktstelle-Sicht die meldende Person
 * NIRGENDS erfahren — weder Liste noch Detail noch Kommentare. Das wird
 * hier technisch erzwungen, nicht nur in der UI verborgen: Für die
 * Kontaktstelle-Sicht wird `erstelltVon`/`person` grundsätzlich NIE in
 * derselben Abfrage selektiert wie die übrigen Daten. Namen werden in
 * einer zweiten, expliziten Abfrage nachgeladen, die nur für die
 * nicht-anonyme Teilmenge läuft — für anonyme Meldungen verlässt der Name
 * niemals die Datenbank in Richtung dieser Sicht.
 */

export type MeldungListenEintrag = {
  id: string
  titel: string
  status: string
  istAnonym: boolean
  erstelltAm: Date
}

export type MeldungListenEintragKontaktstelle = MeldungListenEintrag & {
  melder: { vorname: string; nachname: string } | null
}

type MeldungAnhangAnzeige = { id: string; dateiname: string; groesseBytes: number; mimetyp: string }

/** Ein Eintrag im Verlauf — entweder eine Nachricht oder ein automatisch protokollierter Statuswechsel (siehe meldungVerlaufFuerAnsicht). */
export type MeldungVerlaufEintrag =
  | { art: "kommentar"; id: string; erstelltAm: Date; text: string; autorLabel: string; anhaenge: MeldungAnhangAnzeige[] }
  | { art: "status"; id: string; erstelltAm: Date; status: string }

const ANHANG_SELECT = { id: true, dateiname: true, groesseBytes: true, mimetyp: true } as const

/** Eigene Meldungen — für die meldende Person selbst gibt es nichts zu verbergen. */
export async function meineMeldungen(kontext: { personId: string }): Promise<MeldungListenEintrag[]> {
  return prisma.meldung.findMany({
    where: { erstelltVonId: kontext.personId },
    select: { id: true, titel: true, status: true, istAnonym: true, erstelltAm: true },
    orderBy: { erstelltAm: "desc" },
  })
}

/** Detail für die meldende Person — nur wenn es wirklich die eigene Meldung ist, sonst null (kein 403, siehe Aufrufer: notFound). */
export async function meldungDetailFuerMelder(
  meldungId: string,
  kontext: { personId: string },
): Promise<{ id: string; titel: string; beschreibung: string; istAnonym: boolean; status: string; erstelltAm: Date } | null> {
  const meldung = await prisma.meldung.findUnique({
    where: { id: meldungId },
    select: { id: true, titel: true, beschreibung: true, istAnonym: true, status: true, erstelltAm: true, erstelltVonId: true },
  })
  if (!meldung || meldung.erstelltVonId !== kontext.personId) return null
  return meldung
}

/**
 * Alle Meldungen für die Kontaktstelle-Sicht — zweistufig: Erst die
 * Meldungsdaten OHNE jeden Personenbezug, danach die Namen NUR für die
 * nicht-anonyme Teilmenge in einer zweiten Abfrage nachladen.
 */
export async function meldungenFuerKontaktstelle(): Promise<MeldungListenEintragKontaktstelle[]> {
  const meldungen = await prisma.meldung.findMany({
    select: { id: true, titel: true, status: true, istAnonym: true, erstelltAm: true },
    orderBy: { erstelltAm: "desc" },
  })

  const nichtAnonymeIds = meldungen.filter((m) => !m.istAnonym).map((m) => m.id)
  const namen =
    nichtAnonymeIds.length === 0
      ? []
      : await prisma.meldung.findMany({
          where: { id: { in: nichtAnonymeIds } },
          select: { id: true, erstelltVon: { select: { vorname: true, nachname: true } } },
        })
  const nameNachId = new Map(namen.map((n) => [n.id, n.erstelltVon]))

  return meldungen.map((m) => ({ ...m, melder: m.istAnonym ? null : (nameNachId.get(m.id) ?? null) }))
}

/** Detail für die Kontaktstelle-Sicht — dieselbe zweistufige Technik wie oben. */
export async function meldungDetailFuerKontaktstelle(meldungId: string): Promise<
  | ({ id: string; titel: string; beschreibung: string; istAnonym: boolean; status: string; erstelltAm: Date } & {
      melder: { vorname: string; nachname: string } | null
    })
  | null
> {
  const meldung = await prisma.meldung.findUnique({
    where: { id: meldungId },
    select: { id: true, titel: true, beschreibung: true, istAnonym: true, status: true, erstelltAm: true },
  })
  if (!meldung) return null

  if (meldung.istAnonym) {
    return { ...meldung, melder: null }
  }

  const mitName = await prisma.meldung.findUnique({
    where: { id: meldungId },
    select: { erstelltVon: { select: { vorname: true, nachname: true } } },
  })
  return { ...meldung, melder: mitName?.erstelltVon ?? null }
}

/**
 * Verlauf für die Detailansicht — Kommentare UND automatisch protokollierte
 * Statuswechsel (MeldungStatusEintrag, siehe meldungStatusAktualisieren),
 * chronologisch zusammengeführt. Statuswechsel haben keinen Personenbezug,
 * brauchen also keine Anonymisierung; für Kommentare gilt weiterhin:
 * - Die meldende Person selbst sieht alles inkl. Namen (kein
 *   Anonymitätsbedarf gegenüber sich selbst).
 * - Die Kontaktstelle sieht bei einer NICHT-anonymen Meldung ebenfalls
 *   alles inkl. Namen.
 * - Die Kontaktstelle sieht bei einer anonymen Meldung zwei getrennt
 *   geladene und danach gemergte Gruppen: eigene Kommentare (voller
 *   Name) und Kommentare der meldenden Person, die über eine zweite
 *   Abfrage OHNE `person`/`personId`-Selektion geladen werden — der Name
 *   wird dafür gar nicht erst aus der Datenbank gezogen.
 */
export async function meldungVerlaufFuerAnsicht(
  meldungId: string,
  kontext: { personId: string; berechtigungen: string[] },
  seitDatum?: Date,
): Promise<MeldungVerlaufEintrag[]> {
  const meldung = await prisma.meldung.findUnique({
    where: { id: meldungId },
    select: { istAnonym: true, erstelltVonId: true },
  })
  if (!meldung) return []

  const seitFilter = seitDatum ? { erstelltAm: { gt: seitDatum } } : {}

  const statusEintraege = await prisma.meldungStatusEintrag.findMany({
    where: { meldungId, ...seitFilter },
    select: { id: true, status: true, erstelltAm: true },
  })
  const statusAlsVerlauf: MeldungVerlaufEintrag[] = statusEintraege.map((s) => ({
    art: "status",
    id: s.id,
    erstelltAm: s.erstelltAm,
    status: s.status,
  }))

  const istMelderSelbst = meldung.erstelltVonId === kontext.personId
  const brauchtAnonymisierung = !istMelderSelbst && istKontaktstelle(kontext) && meldung.istAnonym

  let kommentareAlsVerlauf: MeldungVerlaufEintrag[]

  if (!brauchtAnonymisierung) {
    const kommentare = await prisma.meldungKommentar.findMany({
      where: { meldungId, ...seitFilter },
      select: {
        id: true,
        text: true,
        erstelltAm: true,
        person: { select: { vorname: true, nachname: true } },
        anhaenge: { select: ANHANG_SELECT },
      },
    })
    kommentareAlsVerlauf = kommentare.map((k) => ({
      art: "kommentar",
      id: k.id,
      text: k.text,
      erstelltAm: k.erstelltAm,
      autorLabel: `${k.person.vorname} ${k.person.nachname}`,
      anhaenge: k.anhaenge,
    }))
  } else {
    const [vonKontaktstelle, vomMelder] = await Promise.all([
      prisma.meldungKommentar.findMany({
        where: { meldungId, personId: { not: meldung.erstelltVonId }, ...seitFilter },
        select: {
          id: true,
          text: true,
          erstelltAm: true,
          person: { select: { vorname: true, nachname: true } },
          anhaenge: { select: ANHANG_SELECT },
        },
      }),
      // Bewusst KEIN personId/person in dieser Selektion — der technische
      // Kern der Anonymitäts-Garantie für Kommentare der meldenden Person.
      prisma.meldungKommentar.findMany({
        where: { meldungId, personId: meldung.erstelltVonId, ...seitFilter },
        select: { id: true, text: true, erstelltAm: true, anhaenge: { select: ANHANG_SELECT } },
      }),
    ])

    kommentareAlsVerlauf = [
      ...vonKontaktstelle.map(
        (k): MeldungVerlaufEintrag => ({
          art: "kommentar",
          id: k.id,
          text: k.text,
          erstelltAm: k.erstelltAm,
          autorLabel: `${k.person.vorname} ${k.person.nachname}`,
          anhaenge: k.anhaenge,
        }),
      ),
      ...vomMelder.map(
        (k): MeldungVerlaufEintrag => ({
          art: "kommentar",
          id: k.id,
          text: k.text,
          erstelltAm: k.erstelltAm,
          autorLabel: "Anonym",
          anhaenge: k.anhaenge,
        }),
      ),
    ]
  }

  return [...statusAlsVerlauf, ...kommentareAlsVerlauf].sort((a, b) => a.erstelltAm.getTime() - b.erstelltAm.getTime())
}

/** Gelesen-Stand einer Person für eine Meldung — Muster ChatKonversationGelesen. `null` heißt "noch nie besucht". */
export async function meldungGelesenStand(meldungId: string, personId: string): Promise<Date | null> {
  const zeile = await prisma.meldungGelesen.findUnique({ where: { meldungId_personId: { meldungId, personId } } })
  return zeile?.zuletztGelesenAm ?? null
}

/**
 * Anzahl der Verlaufseinträge (Kommentare + Statuswechsel), die NEUER
 * sind als der zuletzt bekannte Gelesen-Stand — für die Badge neben
 * "Verlauf" (Rückmeldung 2026-09-22: ersetzt den vorherigen, nutzlosen
 * Gesamt-Zähler). Reine Zählung, keine Anonymisierung nötig — eine Zahl
 * verrät keine Identität.
 */
export async function meldungUngeleseneAnzahl(meldungId: string, personId: string): Promise<number> {
  const seit = await meldungGelesenStand(meldungId, personId)
  const seitFilter = seit ? { erstelltAm: { gt: seit } } : {}

  const [kommentare, statusEintraege] = await Promise.all([
    prisma.meldungKommentar.count({ where: { meldungId, ...seitFilter } }),
    prisma.meldungStatusEintrag.count({ where: { meldungId, ...seitFilter } }),
  ])
  return kommentare + statusEintraege
}

/** Zugriff auf einen Anhang — nur die meldende Person selbst oder die Kontaktstelle, sonst false (Aufrufer liefert 404). */
export async function meldungAnhangZugriffPruefen(
  anhangId: string,
  kontext: { personId: string; berechtigungen: string[] },
): Promise<boolean> {
  const anhang = await prisma.meldungAnhang.findUnique({
    where: { id: anhangId },
    select: { meldung: { select: { erstelltVonId: true } } },
  })
  if (!anhang) return false
  return anhang.meldung.erstelltVonId === kontext.personId || istKontaktstelle(kontext)
}
