/**
 * Geteilt zwischen Anlegen-Formular, Bearbeiten-Formular, Info-Pop-Up und
 * der Punkt-Anzeige im Kalenderblatt — eine Quelle für Farben und
 * Erinnerungs-Optionen, damit sie nie auseinanderlaufen.
 *
 * Farben bewusst NICHT die Firmenfarben (Hellgrün/Orange) — die stehen
 * schon für Buttons/Akzente überall in der App und wären als Termin-
 * Markierung verwechselbar. Reihenfolge = Reihenfolge der enum TerminFarbe.
 */
export const TERMIN_FARBEN: { wert: string; name: string; klasse: string }[] = [
  { wert: "DUNKELGRUEN", name: "Dunkelgrün", klasse: "bg-green-800" },
  { wert: "GELB", name: "Gelb", klasse: "bg-yellow-400" },
  { wert: "BLAU", name: "Blau", klasse: "bg-blue-500" },
  { wert: "ROT", name: "Rot", klasse: "bg-red-500" },
  { wert: "VIOLETT", name: "Violett", klasse: "bg-violet-500" },
]

export const TERMIN_FARBE_KLASSEN: Record<string, string> = Object.fromEntries(
  TERMIN_FARBEN.map((f) => [f.wert, f.klasse]),
)

export const TERMIN_ERINNERUNGEN: { minuten: number; label: string }[] = [
  { minuten: 15, label: "15 Minuten vorher" },
  { minuten: 30, label: "30 Minuten vorher" },
  { minuten: 60, label: "1 Stunde vorher" },
  { minuten: 1440, label: "1 Tag vorher" },
]

export function erinnerungLabel(minuten: number): string {
  return TERMIN_ERINNERUNGEN.find((e) => e.minuten === minuten)?.label ?? `${minuten} Minuten vorher`
}
