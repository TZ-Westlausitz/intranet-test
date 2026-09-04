/**
 * Gesetzliche Feiertage in Sachsen — vollständig berechenbar (anders als
 * Schulferien, siehe schulferien-sachsen.ts), deshalb keine Datentabelle,
 * sondern eine Formel pro Jahr. Grundlage: Sächsisches Feiertagsgesetz.
 *
 * Ostersonntag über den bekannten Gauß'schen Osteralgorithmus (gültig für
 * den gregorianischen Kalender, also jedes hier relevante Jahr).
 */

function ostersonntag(jahr: number): Date {
  const a = jahr % 19
  const b = Math.floor(jahr / 100)
  const c = jahr % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const monatIndex0 = Math.floor((h + l - 7 * m + 114) / 31) - 1
  const tag = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(jahr, monatIndex0, tag)
}

function tagePlus(datum: Date, tage: number): Date {
  const ergebnis = new Date(datum)
  ergebnis.setDate(ergebnis.getDate() + tage)
  return ergebnis
}

/**
 * Buß- und Bettag: der Mittwoch vor dem 23. November — Sachsen ist das
 * einzige Bundesland, das ihn noch als vollen gesetzlichen Feiertag führt.
 */
function bussUndBettag(jahr: number): Date {
  const der23 = new Date(jahr, 10, 23)
  const wochentag = der23.getDay() // Mittwoch = 3
  const tageZurueck = ((wochentag - 3 + 7) % 7) || 7
  return tagePlus(der23, -tageZurueck)
}

function alsSchluessel(datum: Date): string {
  return `${datum.getFullYear()}-${String(datum.getMonth() + 1).padStart(2, "0")}-${String(
    datum.getDate(),
  ).padStart(2, "0")}`
}

/** Feiertage eines Jahres als Map von "YYYY-MM-DD" auf den Namen. */
export function feiertageFuerJahr(jahr: number): Map<string, string> {
  const ostern = ostersonntag(jahr)

  const feiertage: [Date, string][] = [
    [new Date(jahr, 0, 1), "Neujahr"],
    [tagePlus(ostern, -2), "Karfreitag"],
    [tagePlus(ostern, 1), "Ostermontag"],
    [new Date(jahr, 4, 1), "Tag der Arbeit"],
    [tagePlus(ostern, 39), "Christi Himmelfahrt"],
    [tagePlus(ostern, 50), "Pfingstmontag"],
    [new Date(jahr, 9, 3), "Tag der Deutschen Einheit"],
    [new Date(jahr, 9, 31), "Reformationstag"],
    [bussUndBettag(jahr), "Buß- und Bettag"],
    [new Date(jahr, 11, 25), "1. Weihnachtstag"],
    [new Date(jahr, 11, 26), "2. Weihnachtstag"],
  ]

  return new Map(feiertage.map(([datum, name]) => [alsSchluessel(datum), name]))
}

/** Holt den Feiertagsnamen für ein Datum, sofern es einer ist. */
export function feiertagFuer(datum: Date): string | null {
  return feiertageFuerJahr(datum.getFullYear()).get(alsSchluessel(datum)) ?? null
}
