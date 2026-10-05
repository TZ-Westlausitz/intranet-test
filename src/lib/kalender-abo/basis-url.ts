/**
 * Öffentliche Adresse des Intranets für Links, die AUSSERHALB des Browsers
 * gebraucht werden (Kalender-Abo, Verweise in Kalenderdateien). Vorrang hat
 * die Umgebungsvariable `APP_URL` (z. B. "https://intranet.tpz-westlausitz.de",
 * ohne Schrägstrich am Ende): Auf dem Testserver ist das Intranet über
 * mehrere Adressen erreichbar, von denen manche hinter der Vercel-Anmeldung
 * liegen — ein Abo-Link auf so eine Adresse liefert der Kalender-App nur die
 * Anmeldeseite. Ohne `APP_URL` wird die Adresse aus der Anfrage abgeleitet
 * (Vercel setzt x-forwarded-*), damit es lokal ohne Einstellung funktioniert.
 */
export function basisUrlAusAnfrage(kopf: { get(name: string): string | null }, rueckfall?: string): string {
  const fest = process.env.APP_URL?.trim().replace(/\/+$/, "")
  if (fest) return fest

  const host = kopf.get("x-forwarded-host") ?? kopf.get("host")
  if (host) {
    const protokoll = kopf.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")
    return `${protokoll}://${host}`
  }
  return rueckfall ?? "http://localhost:3000"
}
