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
 */
export async function auftraegeFuerPerson(personId: string) {
  const [zugewiesenOffen, zugewiesenErledigt, vergebenOffen, vergebenErledigt] = await Promise.all([
    prisma.auftrag.findMany({
      where: { zugewiesenAnId: personId, erledigtAm: null },
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
      where: { erstelltVonId: personId, erledigtAm: null },
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

/** Für den Badge auf der Aufgaben-Übersichtsseite (Kachel "Aufgaben"). */
export async function offeneAuftraegeAnzahl(personId: string): Promise<number> {
  return prisma.auftrag.count({ where: { zugewiesenAnId: personId, erledigtAm: null } })
}
