/** Reine Boolean-Prüfung — wer die Berechtigung "Meldestelle" hat, darf alle Meldungen sehen/bearbeiten. Muster darfFormulareVerwalten. */
export function istKontaktstelle(kontext: { berechtigungen: string[] }): boolean {
  return kontext.berechtigungen.includes("Meldestelle")
}
