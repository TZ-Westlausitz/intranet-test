export const MONATSNAMEN = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
] as const

export const WOCHENTAGE_KURZ = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const

export type Kalendertag = {
  datum: Date
  tag: number
  imAktuellenMonat: boolean
}

/**
 * Ein Monat als feste 6-Wochen-Matrix (42 Tage), aufgefüllt mit den
 * Rand-Tagen des Vor-/Folgemonats — die einfachste Darstellung, die für
 * jeden Monat gleich aussieht, statt je nach Wochentag des 1. mal 5, mal 6
 * Zeilen zu zeichnen.
 */
export function monatsraster(jahr: number, monatIndex0: number): Kalendertag[][] {
  const ersterDesMonats = new Date(jahr, monatIndex0, 1)
  const wochentagErster = (ersterDesMonats.getDay() + 6) % 7 // Montag = 0

  const start = new Date(jahr, monatIndex0, 1 - wochentagErster)

  const wochen: Kalendertag[][] = []
  const cursor = new Date(start)

  for (let woche = 0; woche < 6; woche++) {
    const tage: Kalendertag[] = []
    for (let tag = 0; tag < 7; tag++) {
      tage.push({
        datum: new Date(cursor),
        tag: cursor.getDate(),
        imAktuellenMonat: cursor.getMonth() === monatIndex0,
      })
      cursor.setDate(cursor.getDate() + 1)
    }
    wochen.push(tage)
  }

  return wochen
}

/** Verschiebt einen Jahr/Monat-Anker um `delta` Monate (auch über Jahresgrenzen). */
export function monatVerschieben(jahr: number, monatIndex0: number, delta: number) {
  const gesamt = jahr * 12 + monatIndex0 + delta
  return { jahr: Math.floor(gesamt / 12), monatIndex0: ((gesamt % 12) + 12) % 12 }
}

export function istGleicherTag(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  )
}
