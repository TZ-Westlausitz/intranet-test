/**
 * Regeln für das eigene Passwort (Rückmeldung 2026-10-06): mindestens 10
 * Zeichen, mindestens ein Groß- und ein Kleinbuchstabe, mindestens eine Zahl
 * und nicht das gemeinsame Startpasswort (STANDARD_STARTPASSWORT — das
 * prüft nur der Server, der Wert darf nie in den Browser).
 *
 * Reine Funktion ohne Server-Abhängigkeiten: dieselbe Prüfung läuft in der
 * Server Action (eigenesPasswortFestlegen, die verbindliche) und live im
 * Formular (PasswortAendernFormular, nur zur Anzeige). `\p{Lu}`/`\p{Ll}`
 * statt A-Z, damit auch Umlaute (Ä, ö) als Groß-/Kleinbuchstaben zählen.
 */
export const PASSWORT_MIN_LAENGE = 10

export type PasswortRegeln = { laenge: boolean; gross: boolean; klein: boolean; zahl: boolean }

export function passwortRegelnPruefen(passwort: string): PasswortRegeln {
  return {
    laenge: passwort.length >= PASSWORT_MIN_LAENGE,
    gross: /\p{Lu}/u.test(passwort),
    klein: /\p{Ll}/u.test(passwort),
    zahl: /\d/.test(passwort),
  }
}
