/** Reicht für ein Profilfoto — deutlich kleiner als der 15-MB-Rahmen für Info-Anhänge. */
const MAX_DATEIGROESSE_BYTES = 5 * 1024 * 1024

const ERLAUBTE_MIMETYPEN = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"])

/**
 * Prüft ein hochgeladenes Profilbild, BEVOR irgendetwas gespeichert wird —
 * dasselbe "eigene kleine Kopie statt geteilter Abstraktion"-Muster wie bei
 * infoAnhaengePruefen, nur auf Bilder beschränkt (kein PDF als Profilbild).
 */
export function profilbildPruefen(datei: File): "zuGross" | "typUngueltig" | null {
  if (datei.size > MAX_DATEIGROESSE_BYTES) return "zuGross"
  if (!ERLAUBTE_MIMETYPEN.has(datei.type)) return "typUngueltig"
  return null
}
