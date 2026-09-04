/** Menschenlesbare Texte für `AusleiheStatus` — an einer Stelle gepflegt,
 * damit Detailseite, Werkstatt-Übersicht und persönliche Übersicht nicht
 * auseinanderlaufen. */
export const STATUS_TEXT: Record<string, string> = {
  ANGEFRAGT: "Angefragt",
  ZUGESAGT: "Zugesagt",
  ABGELEHNT: "Abgelehnt",
  VEREINBART: "Vereinbarung unterschrieben",
  UEBERGEBEN: "Übergeben",
  ZURUECKGEGEBEN: "Zurückgegeben",
  ABGESCHLOSSEN: "Abgeschlossen",
  STORNIERT: "Storniert",
}

export const NAECHSTER_SCHRITT: Record<string, string> = {
  ANGEFRAGT:
    "Die Anfrage wurde an die Werkstattleitung geschickt und wartet auf Bestätigung.",
  ZUGESAGT:
    "Als Nächstes: Nutzungsvereinbarung unterschreiben, bei der Übergabe auf dem Gerät des Werkstattleiters.",
  VEREINBART: "Als Nächstes: Übergabeprotokoll bei der Fahrzeugausgabe.",
  UEBERGEBEN: "Fahrzeug ist unterwegs. Als Nächstes: Rücknahmeprotokoll bei der Rückgabe.",
  ZURUECKGEGEBEN: "Fahrzeug ist zurück. Als Nächstes: Abrechnung des geldwerten Vorteils.",
  ABGELEHNT: "Die Anfrage wurde abgelehnt.",
}
