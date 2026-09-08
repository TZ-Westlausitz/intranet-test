import { prisma } from "@/lib/db"

const ANHANG_SELECT = { id: true, dateiname: true, groesseBytes: true, mimetyp: true } as const

const KOMMENTARE_INCLUDE = {
  include: {
    person: { select: { vorname: true, nachname: true } },
    anhaenge: { select: ANHANG_SELECT },
  },
  orderBy: { erstelltAm: "asc" as const },
}

/**
 * Vier Listen statt zwei (wie bei den To-dos): Aufträge lassen sich in
 * zwei Richtungen anschauen — was mir zugewiesen wurde (das arbeite ich
 * ab) und was ich selbst vergeben habe (das behalte ich im Blick, ob es
 * erledigt wird). Jeweils offen/erledigt getrennt, dieselbe Sortierung
 * wie bei den To-dos (Fälligkeit, bei Gleichstand höchste Priorität
 * zuerst — siehe Kommentar an AufgabePrioritaet).
 *
 * Ein noch nicht aktiver geplanter Auftrag (geplantAm in der Zukunft,
 * siehe Kommentar am Feld) taucht in KEINER der beiden "offen"-Listen auf
 * — auch nicht bei der erstellenden Person selbst, dieselbe strikte Regel
 * wie bei aufgabenFuerPerson. Verwalten geht bis dahin nur über
 * /geplante-aktionen.
 */
export async function auftraegeFuerPerson(personId: string) {
  const jetzt = new Date()
  const nochNichtGeplant = { OR: [{ geplantAm: null }, { geplantAm: { lte: jetzt } }] }
  const [zugewiesenOffen, zugewiesenErledigt, vergebenOffen, vergebenErledigt] = await Promise.all([
    prisma.auftrag.findMany({
      where: { zugewiesenAnId: personId, erledigtAm: null, ...nochNichtGeplant },
      include: {
        erstelltVon: { select: { vorname: true, nachname: true } },
        anhaenge: { where: { kommentarId: null }, select: ANHANG_SELECT },
        kommentare: KOMMENTARE_INCLUDE,
      },
      orderBy: [{ faelligAm: { sort: "asc", nulls: "last" } }, { prioritaet: "asc" }, { erstelltAm: "asc" }],
    }),
    prisma.auftrag.findMany({
      where: { zugewiesenAnId: personId, erledigtAm: { not: null } },
      include: {
        erstelltVon: { select: { vorname: true, nachname: true } },
        anhaenge: { where: { kommentarId: null }, select: ANHANG_SELECT },
        kommentare: KOMMENTARE_INCLUDE,
      },
      orderBy: { erledigtAm: "desc" },
    }),
    prisma.auftrag.findMany({
      where: { erstelltVonId: personId, erledigtAm: null, ...nochNichtGeplant },
      include: {
        zugewiesenAn: { select: { vorname: true, nachname: true } },
        anhaenge: { where: { kommentarId: null }, select: ANHANG_SELECT },
        kommentare: KOMMENTARE_INCLUDE,
      },
      orderBy: [{ faelligAm: { sort: "asc", nulls: "last" } }, { prioritaet: "asc" }, { erstelltAm: "asc" }],
    }),
    prisma.auftrag.findMany({
      where: { erstelltVonId: personId, erledigtAm: { not: null } },
      include: {
        zugewiesenAn: { select: { vorname: true, nachname: true } },
        anhaenge: { where: { kommentarId: null }, select: ANHANG_SELECT },
        kommentare: KOMMENTARE_INCLUDE,
      },
      orderBy: { erledigtAm: "desc" },
    }),
  ])

  return { zugewiesenOffen, zugewiesenErledigt, vergebenOffen, vergebenErledigt }
}

/**
 * Für die Startseiten-Kachel "Aufgaben": Anzahl je Status, nicht nur eine
 * Gesamtzahl — die Kachel zeigt Offen/Angenommen getrennt (siehe
 * Rückmeldung zur Statusabstufung bei Aufträgen). Ein noch nicht aktiver
 * geplanter Auftrag zählt hier nicht mit — sonst würde das Badge etwas
 * anzeigen, das die zugewiesene Person gar nicht sehen kann.
 */
export async function auftraegeStatusAnzahl(personId: string): Promise<{ offen: number; angenommen: number }> {
  const jetzt = new Date()
  const nochNichtGeplant = { OR: [{ geplantAm: null }, { geplantAm: { lte: jetzt } }] }
  const [offen, angenommen] = await Promise.all([
    prisma.auftrag.count({ where: { zugewiesenAnId: personId, status: "OFFEN", ...nochNichtGeplant } }),
    prisma.auftrag.count({ where: { zugewiesenAnId: personId, status: "ANGENOMMEN", ...nochNichtGeplant } }),
  ])
  return { offen, angenommen }
}

/** Für die Kalenderseite "Geplante Aktionen" — eigene (von mir vergebene) geplante Aufträge im Zeitraum. */
export async function auftraegeGeplantFuerZeitraum(personId: string, von: Date, bis: Date) {
  return prisma.auftrag.findMany({
    where: { erstelltVonId: personId, geplantAm: { not: null, gte: von, lte: bis } },
    include: { zugewiesenAn: { select: { vorname: true, nachname: true } } },
    orderBy: { geplantAm: "asc" },
  })
}

/** Für die Startseiten-Kachel "Geplante Aktionen" — die nächsten NOCH ausstehenden geplanten Aufträge. */
export async function naechsteGeplantAuftraege(personId: string, limit: number) {
  const jetzt = new Date()
  return prisma.auftrag.findMany({
    where: { erstelltVonId: personId, geplantAm: { gt: jetzt } },
    orderBy: { geplantAm: "asc" },
    take: limit,
  })
}
