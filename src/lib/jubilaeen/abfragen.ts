import { prisma } from "@/lib/db"
import { berlinerTagesbeginn } from "@/lib/datum"
import { FIRMENKONTO_BENUTZERNAME, jubilaeenFuerUebersicht, tageBis } from "./berechnung"

/** Zeile der Jubiläums-Übersicht — Eintrittsdatum selbst bleibt serverseitig, nur das Jubiläum geht an die Seite. */
export type JubilaeumZeile = {
  benutzername: string
  name: string
  abteilungen: string[]
  jahre: number
  datum: Date
  /** Negativ = schon vorbei. */
  tage: number
}

/**
 * Anstehende Jubiläen aller aktiven Personen mit Eintrittsdatum, nach Datum
 * sortiert. Nur für den Adminbereich gedacht (HR-Angabe) — die aufrufende
 * Seite prüft die Berechtigung.
 */
export async function anstehendeJubilaeen(): Promise<{ zeilen: JubilaeumZeile[]; ohneEintrittsdatum: number }> {
  const heute = berlinerTagesbeginn()
  const jetzt = new Date()

  const personen = await prisma.person.findMany({
    where: { aktiv: true, NOT: { benutzername: FIRMENKONTO_BENUTZERNAME } },
    select: {
      benutzername: true,
      vorname: true,
      nachname: true,
      eintrittAm: true,
      zugehoerigkeiten: {
        where: { OR: [{ bisDatum: null }, { bisDatum: { gt: jetzt } }] },
        select: { abteilung: { select: { name: true } } },
      },
    },
  })

  const zeilen: JubilaeumZeile[] = []
  let ohneEintrittsdatum = 0
  for (const person of personen) {
    if (!person.eintrittAm) {
      ohneEintrittsdatum++
      continue
    }
    for (const jubilaeum of jubilaeenFuerUebersicht(person.eintrittAm, heute)) {
      zeilen.push({
        benutzername: person.benutzername,
        name: `${person.vorname} ${person.nachname}`,
        abteilungen: [...new Set(person.zugehoerigkeiten.map((z) => z.abteilung.name))],
        jahre: jubilaeum.jahre,
        datum: jubilaeum.datum,
        tage: tageBis(jubilaeum.datum, heute),
      })
    }
  }

  zeilen.sort((a, b) => a.datum.getTime() - b.datum.getTime() || a.name.localeCompare(b.name, "de"))
  return { zeilen, ohneEintrittsdatum }
}
