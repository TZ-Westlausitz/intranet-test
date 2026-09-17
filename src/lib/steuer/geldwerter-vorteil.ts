import { berlinerTagesbeginn } from "@/lib/datum"

/**
 * Geldwerter Vorteil bei privater Fahrzeugüberlassung "von Fall zu Fall"
 * (BMF-Schreiben vom 3.3.2022, Rz. 16): 0,001 % des inländischen
 * Bruttolistenpreises je gefahrenem Kilometer — statt der 1-%-Regelung, die
 * sonst für den GANZEN Kalendermonat gelten würde. Gilt nur, solange eine
 * Person im Kalendermonat nicht mehr als fünf Kalendertage kommt (dazu die
 * Warnung in der Verwaltungssicht, nicht hier — die App entscheidet nicht,
 * sie warnt, siehe CLAUDE.md Regel 9 sinngemäß für die Steuer-Regel).
 *
 * Reine Berechnung, keine Datenbankzugriffe — bewusst isoliert, damit der
 * Steuerberater die Formel an einer einzigen, leicht lesbaren Stelle prüfen
 * kann. Vor Inbetriebnahme von ihm bestätigen lassen; gibt er eine andere
 * Methode vor, ist seine Vorgabe maßgeblich (CLAUDE.md).
 */
export function geldwerterVorteilCentBerechnen(
  bruttolistenpreisCent: number,
  gefahreneKilometer: number,
): number {
  const kilometer = Math.max(0, gefahreneKilometer)
  return Math.round(bruttolistenpreisCent * 0.00001 * kilometer)
}

/**
 * Kalendertage einer Ausleihe, beide Tage eingeschlossen (Ausgabe- und
 * Rücknahmetag zählen jeweils voll) — Grundlage für die Fünf-Tage-Grenze.
 * Rechnet mit reinen Kalendertagen (Mitternacht IN EUROPE/BERLIN, nicht der
 * Zeitzone der ausführenden Umgebung — sonst zählt eine auf Vercel (UTC)
 * ausgeführte Berechnung nahe Mitternacht im Zweifel den falschen Tag,
 * siehe berlinerTagesbeginn in src/lib/datum.ts), nicht mit vollen 24h,
 * damit eine Ausgabe um 23:50 Uhr und eine Rücknahme am Folgetag um
 * 00:10 Uhr trotzdem als zwei Kalendertage zählt, wie es im Alltag gemeint
 * ist.
 */
export function kalendertageBerechnen(ausgabeZeitpunkt: Date, ruecknahmeZeitpunkt: Date): number {
  const tageMs = berlinerTagesbeginn(ruecknahmeZeitpunkt).getTime() - berlinerTagesbeginn(ausgabeZeitpunkt).getTime()
  return Math.round(tageMs / 86_400_000) + 1
}
