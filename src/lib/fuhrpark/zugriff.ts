import type { Kontext } from "@/lib/auth/berechtigung"

/**
 * Wer im Fuhrpark was darf — an EINER Stelle, damit Seiten und Aktionen
 * dieselbe Antwort bekommen. Die Berechtigungen selbst kommen wie überall
 * aus `berechtigung()` (Regel 5); das hier ist nur die Übersetzung in die
 * drei Stufen des Fuhrparks:
 *
 * - Bearbeiten: "Werkstattleiter" (und, wie im übrigen Fahrzeugbereich,
 *   "Adminbereich").
 * - Alle Fahrzeuge lesen: zusätzlich die Berechtigung "Fahrzeuge lesen"
 *   (gedacht für Verwaltung und Geschäftsführung, rein lesend).
 * - Nur "eigene" Fahrzeuge: jede andere Person sieht ausschließlich die
 *   Fahrzeuge, bei denen sie als Halter/Verantwortliche eingetragen ist
 *   (Pro-Datensatz-Sichtbarkeit, wie bei Projekten über die Mitgliedschaft).
 */
export const BERECHTIGUNG_FAHRZEUGE_LESEN = "Fahrzeuge lesen"

export function fuhrparkRechte(kontext: Pick<Kontext, "berechtigungen">) {
  const darfBearbeiten =
    kontext.berechtigungen.includes("Werkstattleiter") || kontext.berechtigungen.includes("Adminbereich")
  const darfAlleSehen = darfBearbeiten || kontext.berechtigungen.includes(BERECHTIGUNG_FAHRZEUGE_LESEN)
  return { darfBearbeiten, darfAlleSehen }
}
