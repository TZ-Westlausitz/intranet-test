import { prisma } from "@/lib/db"

/**
 * Offene zuerst (nach Fälligkeit, undatierte danach; bei gleichem
 * Fälligkeitsdatum die höchste Priorität zuerst — HOCH vor MITTEL vor
 * NIEDRIG entspricht der Deklarationsreihenfolge der enum
 * AufgabePrioritaet, siehe Kommentar am Model Aufgabe), erledigte ans
 * Ende (nach Erledigt-Zeitpunkt, neueste zuerst).
 *
 * Eine noch nicht aktive geplante Aufgabe (geplantAm in der Zukunft, siehe
 * Kommentar am Feld) taucht in "offen" NICHT auf — sie ist bis dahin nur
 * über /geplante-aktionen erreichbar, exakt wie eine geplante Info nicht
 * im Newsfeed erscheint. "Erledigt" bleibt davon unberührt: eine erledigte
 * Aufgabe war per Definition schon aktiv.
 */
export async function aufgabenFuerPerson(personId: string) {
  const jetzt = new Date()
  const [offen, erledigt] = await Promise.all([
    prisma.aufgabe.findMany({
      where: { personId, erledigtAm: null, OR: [{ geplantAm: null }, { geplantAm: { lte: jetzt } }] },
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

/**
 * Für die Kalenderseite "Geplante Aktionen" — eigene Aufgaben, bei denen
 * jemals ein Sichtbarkeitstermin gesetzt wurde, im angezeigten Zeitraum
 * (zeigt damit sowohl noch ausstehende als auch schon aktive geplante
 * Aufgaben, genau wie infosGeplantFuerZeitraum es für Infos tut).
 */
export async function aufgabenGeplantFuerZeitraum(personId: string, von: Date, bis: Date) {
  return prisma.aufgabe.findMany({
    where: { personId, geplantAm: { not: null, gte: von, lte: bis } },
    include: { anhaenge: { select: { id: true, dateiname: true, groesseBytes: true, mimetyp: true } } },
    orderBy: { geplantAm: "asc" },
  })
}

/** Für die Startseiten-Kachel "Geplante Aktionen" — die nächsten NOCH ausstehenden geplanten Aufgaben. */
export async function naechsteGeplantAufgaben(personId: string, limit: number) {
  const jetzt = new Date()
  return prisma.aufgabe.findMany({
    where: { personId, geplantAm: { gt: jetzt } },
    orderBy: { geplantAm: "asc" },
    take: limit,
  })
}
