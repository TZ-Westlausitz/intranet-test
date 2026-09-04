/** "2026-11-20" → "20.11.2026". Für Datumsfelder aus `<input type="date">`. */
export function formatiereDatum(iso: string): string {
  if (!iso) return ""
  const [jahr, monat, tag] = iso.split("-")
  return `${tag}.${monat}.${jahr}`
}

/**
 * Heutiges Datum als "2026-11-20" — als Defaultwert für
 * `<input type="date">`. Ohne den sieht das Feld leer aus, zeigt aber je
 * nach Browser das heutige Datum nur als graue Platzhalter-Anzeige, kein
 * echter Wert — required schlägt dann beim Absenden fehl, obwohl es so
 * aussieht, als stünde schon ein Datum drin.
 */
export function heutigesDatumIso(): string {
  const heute = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${heute.getFullYear()}-${pad(heute.getMonth() + 1)}-${pad(heute.getDate())}`
}

/**
 * Datum als "2026-11-20T00:00" — als Defaultwert für
 * `<input type="datetime-local">`, wenn ein bestimmter Tag (nicht "jetzt")
 * eingesetzt werden soll, z.B. der Ausleihe-Beginn beim ersten Anlegen des
 * Übergabeprotokolls.
 */
export function datumUmMitternachtFuerDatumUhrzeitFeld(datum: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${datum.getFullYear()}-${pad(datum.getMonth() + 1)}-${pad(datum.getDate())}T00:00`
}

/** "2026-08-27T14:30" → "27.08.2026, 14:30 Uhr". Für die Anzeige im PDF-Text. */
export function formatiereDatumUhrzeit(eingabe: string): string {
  const [datumTeil, uhrzeitTeil] = eingabe.split("T")
  if (!datumTeil) return ""
  return `${formatiereDatum(datumTeil)}${uhrzeitTeil ? ", " + uhrzeitTeil + " Uhr" : ""}`
}

/**
 * Date-Objekt → "27.08.2026" — wie formatiereDatum, aber wenn kein
 * <input type="date">-String zur Hand ist, sondern schon ein Date (z. B.
 * beim Zusammenbauen von "Ort, Datum" für eine Unterschrift).
 */
export function formatiereDatumAusDate(datum: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(datum.getDate())}.${pad(datum.getMonth() + 1)}.${datum.getFullYear()}`
}

/** Date-Objekt → "2026-09-03" — wie heutigesDatumIso, aber für ein beliebiges Date. */
export function datumIsoAusDate(datum: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${datum.getFullYear()}-${pad(datum.getMonth() + 1)}-${pad(datum.getDate())}`
}

/** Date-Objekt → "14:05" — für <input type="time">-Defaultwerte aus einem vorhandenen Date. */
export function zeitAusDate(datum: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(datum.getHours())}:${pad(datum.getMinutes())}`
}

/**
 * Date-Objekt → "Heute"/"Morgen"/"Übermorgen"/"Gestern"/"Vorgestern" für
 * nahe Tage, sonst das formatierte Datum — für die Zwischenziel-Liste, wo
 * die Nähe zu "heute" auf den ersten Blick zählt, ein weiter entferntes
 * Datum aber ohnehin nur als Zahl orientiert. Beide Parameter müssen auf
 * Mitternacht normiert sein (wie `frist` beim Anlegen eines Zwischenziels),
 * sonst verschiebt sich die Tagesdifferenz um Uhrzeit-Reste.
 */
export function relativesDatum(datum: Date, heute: Date): string {
  const tagMs = 24 * 60 * 60 * 1000
  const diffTage = Math.round((datum.getTime() - heute.getTime()) / tagMs)
  switch (diffTage) {
    case -2:
      return "Vorgestern"
    case -1:
      return "Gestern"
    case 0:
      return "Heute"
    case 1:
      return "Morgen"
    case 2:
      return "Übermorgen"
    default:
      return formatiereDatumAusDate(datum)
  }
}
