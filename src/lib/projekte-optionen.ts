/**
 * Label/Farbe für die drei neuen Projekte-Enums an einer Stelle, geteilt
 * zwischen Formularen und Listen-Anzeige — nach Vorbild
 * src/lib/aufgaben-optionen.ts.
 */
export const PROJEKT_STATUS: { wert: string; name: string; klasse: string }[] = [
  { wert: "PLANUNG", name: "Planung", klasse: "bg-flaeche-100 text-primaer" },
  { wert: "AKTIV", name: "Aktiv", klasse: "bg-marke-gruen/15 text-marke-gruen-dunkel" },
  { wert: "ABGESCHLOSSEN", name: "Abgeschlossen", klasse: "bg-flaeche-200 text-primaer" },
  { wert: "ABGEBROCHEN", name: "Abgebrochen", klasse: "bg-red-100 text-red-700" },
]

export const PROJEKT_STATUS_NAMEN: Record<string, string> = Object.fromEntries(
  PROJEKT_STATUS.map((s) => [s.wert, s.name]),
)

export const PROJEKT_STATUS_KLASSEN: Record<string, string> = Object.fromEntries(
  PROJEKT_STATUS.map((s) => [s.wert, s.klasse]),
)

/** Status einer Projekt-Aufgabe (siehe enum AufgabeStatus) — nicht zu verwechseln mit AufgabePrioritaet. */
export const AUFGABE_STATUS: { wert: string; name: string; klasse: string }[] = [
  { wert: "OFFEN", name: "Offen", klasse: "bg-flaeche-100 text-primaer" },
  { wert: "ANGENOMMEN", name: "Angenommen", klasse: "bg-marke-orange/15 text-ueberschrift" },
  { wert: "IN_ARBEIT", name: "In Arbeit", klasse: "bg-blue-100 text-blue-700" },
  { wert: "ERLEDIGT", name: "Erledigt", klasse: "bg-marke-gruen/15 text-marke-gruen-dunkel" },
]

export const AUFGABE_STATUS_NAMEN: Record<string, string> = Object.fromEntries(
  AUFGABE_STATUS.map((s) => [s.wert, s.name]),
)

export const AUFGABE_STATUS_KLASSEN: Record<string, string> = Object.fromEntries(
  AUFGABE_STATUS.map((s) => [s.wert, s.klasse]),
)

export const PROJEKTMITGLIED_ROLLE_NAMEN: Record<string, string> = {
  LEITUNG: "Leitung",
  MITGLIED: "Mitglied",
}

/**
 * Status eines Zwischenziels für Statusleiste + Zwischenziel-Kachel:
 * ERREICHT (alle zugehörigen Aufgaben erledigt — siehe zwischenzieleAnzeige
 * in der Projekt-Detailseite, wo `erreicht` berechnet wird), UEBERFAELLIG
 * (Frist verstrichen, noch nicht erreicht) oder OFFEN (noch nicht fällig).
 * `heute` muss auf Mitternacht normiert sein, wie `frist` selbst — sonst
 * würde ein Zwischenziel schon am Tag seiner eigenen Frist als überfällig
 * gelten.
 */
export type ZwischenzielStatus = "ERREICHT" | "UEBERFAELLIG" | "OFFEN"

export function zwischenzielStatus(zwischenziel: { frist: Date; erreicht: boolean }, heute: Date): ZwischenzielStatus {
  if (zwischenziel.erreicht) return "ERREICHT"
  if (zwischenziel.frist < heute) return "UEBERFAELLIG"
  return "OFFEN"
}

export const ZWISCHENZIEL_STATUS_KLASSEN: Record<ZwischenzielStatus, string> = {
  ERREICHT: "bg-marke-gruen",
  UEBERFAELLIG: "bg-red-500",
  OFFEN: "bg-marke-orange",
}
