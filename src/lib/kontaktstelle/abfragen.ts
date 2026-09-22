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

export type MeldungKommentarAnzeige = {
  id: string
  text: string
  erstelltAm: Date
  autorLabel: string
  anhaenge: { id: string; dateiname: string; groesseBytes: number; mimetyp: string }[]
}

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
 * Kommentare für die Detailansicht — verzweigt je nach Blickwinkel:
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
export async function meldungKommentareFuerAnsicht(
  meldungId: string,
  kontext: { personId: string; berechtigungen: string[] },
): Promise<MeldungKommentarAnzeige[]> {
  const meldung = await prisma.meldung.findUnique({
    where: { id: meldungId },
    select: { istAnonym: true, erstelltVonId: true },
  })
  if (!meldung) return []

  const istMelderSelbst = meldung.erstelltVonId === kontext.personId
  const brauchtAnonymisierung = !istMelderSelbst && istKontaktstelle(kontext) && meldung.istAnonym

  if (!brauchtAnonymisierung) {
    const kommentare = await prisma.meldungKommentar.findMany({
      where: { meldungId },
      select: {
        id: true,
        text: true,
        erstelltAm: true,
        person: { select: { vorname: true, nachname: true } },
        anhaenge: { select: ANHANG_SELECT },
      },
      orderBy: { erstelltAm: "asc" },
    })
    return kommentare.map((k) => ({
      id: k.id,
      text: k.text,
      erstelltAm: k.erstelltAm,
      autorLabel: `${k.person.vorname} ${k.person.nachname}`,
      anhaenge: k.anhaenge,
    }))
  }

  const [vonKontaktstelle, vomMelder] = await Promise.all([
    prisma.meldungKommentar.findMany({
      where: { meldungId, personId: { not: meldung.erstelltVonId } },
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
      where: { meldungId, personId: meldung.erstelltVonId },
      select: { id: true, text: true, erstelltAm: true, anhaenge: { select: ANHANG_SELECT } },
    }),
  ])

  const zusammengefuehrt: MeldungKommentarAnzeige[] = [
    ...vonKontaktstelle.map((k) => ({
      id: k.id,
      text: k.text,
      erstelltAm: k.erstelltAm,
      autorLabel: `${k.person.vorname} ${k.person.nachname}`,
      anhaenge: k.anhaenge,
    })),
    ...vomMelder.map((k) => ({ id: k.id, text: k.text, erstelltAm: k.erstelltAm, autorLabel: "Anonym", anhaenge: k.anhaenge })),
  ]
  return zusammengefuehrt.sort((a, b) => a.erstelltAm.getTime() - b.erstelltAm.getTime())
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
