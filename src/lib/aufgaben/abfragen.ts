import { prisma } from "@/lib/db"

/**
 * Offene zuerst (nach Fälligkeit, undatierte danach; bei gleichem
 * Fälligkeitsdatum die höchste Priorität zuerst — HOCH vor MITTEL vor
 * NIEDRIG entspricht der Deklarationsreihenfolge der enum
 * AufgabePrioritaet, siehe Kommentar am Model Aufgabe), erledigte ans
 * Ende (nach Erledigt-Zeitpunkt, neueste zuerst).
 */
export async function aufgabenFuerPerson(personId: string) {
  const [offen, erledigt] = await Promise.all([
    prisma.aufgabe.findMany({
      where: { personId, erledigtAm: null },
      include: { anhaenge: { select: { id: true, dateiname: true, groesseBytes: true, mimetyp: true } } },
      orderBy: [{ faelligAm: { sort: "asc", nulls: "last" } }, { prioritaet: "asc" }, { erstelltAm: "asc" }],
    }),
    prisma.aufgabe.findMany({
      where: { personId, erledigtAm: { not: null } },
      include: { anhaenge: { select: { id: true, dateiname: true, groesseBytes: true, mimetyp: true } } },
      orderBy: { erledigtAm: "desc" },
    }),
  ])

  return { offen, erledigt }
}
