/**
 * Geteilt zwischen Anlege-Formular und Listen-Anzeige — eine Quelle für
 * Label/Farbe der Priorität. Ampel-Farben (Rot/Orange/Grün) statt der
 * Firmenfarben, weil die Bedeutung ("dringend" vs. "kann warten") so auf
 * den ersten Blick klar ist, ohne die Legende nachschlagen zu müssen.
 * Reihenfolge = Reihenfolge der enum AufgabePrioritaet.
 */
export const AUFGABE_PRIORITAETEN: { wert: string; name: string; klasse: string }[] = [
  { wert: "HOCH", name: "Hoch", klasse: "bg-red-500" },
  { wert: "MITTEL", name: "Mittel", klasse: "bg-amber-500" },
  { wert: "NIEDRIG", name: "Niedrig", klasse: "bg-green-500" },
]

export const AUFGABE_PRIORITAET_KLASSEN: Record<string, string> = Object.fromEntries(
  AUFGABE_PRIORITAETEN.map((p) => [p.wert, p.klasse]),
)

export const AUFGABE_PRIORITAET_NAMEN: Record<string, string> = Object.fromEntries(
  AUFGABE_PRIORITAETEN.map((p) => [p.wert, p.name]),
)
