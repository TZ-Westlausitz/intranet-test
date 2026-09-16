import Image from "next/image"
import Link from "next/link"

/**
 * Header-Leiste für Handy-Ansichten: nur noch das Logo. Ab `md:` blendet
 * sich diese Leiste selbst aus, damit nicht zwei Kopfzeilen
 * übereinanderstehen — dort übernimmt das Root-Layout die Rolle dauerhaft
 * für jede Seite. Der grüne Akzentbalken ganz oben steht ebenfalls im
 * Root-Layout, nicht hier.
 *
 * (Rückmeldung 2026-09-15: rechts stand hier zuerst BenutzerMenu, dann
 * kurzzeitig ein "Hallo Vorname"-Gruß, links das Drei-Striche-Menü
 * (MobilesMenu, komplette Baustein-Liste zum Aufklappen) — alles auf dem
 * Handy jetzt komplett entfernt. Grund: die neue mobile Startseite zeigt
 * bereits jeden einzelnen Baustein als Kachel, die MobileTabBar deckt
 * Aufgaben/Chats/Home/Menü ab, und "Menü" bündelt zusätzlich Profil/Admin/
 * Einstellungen/Kontaktstelle/Ausloggen/Kontakte/Wissen (siehe
 * src/app/(mitarbeiter)/menu/page.tsx) — ein zusätzliches Ausklapp-Menü
 * dafür wäre nur eine dritte, überflüssige Fundstelle für dieselben Ziele.
 * Auf dem Desktop bleiben BenutzerMenu und die Bausteine-Leiste
 * unverändert im Root-Layout, davon ist diese Leiste nicht betroffen.)
 *
 * Die eigentliche Anmeldeseite (`/anmelden`) nutzt weiterhin die einfache
 * `Logoleiste` ohne Menü — dort gibt es noch keine angemeldete Person.
 */
export function Kopfleiste() {
  return (
    // sticky (Rückmeldung vom 2026-09-15, "Kopfzeile verschönern"): bleibt
    // beim Scrollen der jetzt längeren Handy-Startseite oben sichtbar.
    // Leicht transparent + backdrop-blur statt voll deckend, damit beim
    // Scrollen kein harter Schnitt entsteht.
    <header className="sticky top-0 z-10 -mx-5 mb-6 flex items-center justify-center border-b border-rand bg-flaeche/90 px-5 py-3 backdrop-blur-sm md:hidden">
      <Link
        href="/"
        aria-label="Zur Startseite"
        className="rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen focus-visible:outline-offset-2"
      >
        {/* Zwei Bilder statt eines umgefärbten, dieselbe an data-theme
            gekoppelte dark:-Variante wie im Desktop-Header (siehe
            src/app/layout.tsx) — das weiße Logo ist eine eigene Datei.
            Dieselben width/height wie beim normalen Logo (siehe Kommentar
            in layout.tsx), weil logo-weiss.png in denselben Abmessungen
            angelegt ist. */}
        <Image
          src="/logo.png"
          alt="Therapie- und Pflegezentrum Westlausitz"
          width={166}
          height={32}
          priority
          className="h-8 w-auto dark:hidden"
        />
        <Image
          src="/logo-weiss.png"
          alt="Therapie- und Pflegezentrum Westlausitz"
          width={166}
          height={32}
          priority
          className="hidden h-8 w-auto dark:block"
        />
      </Link>
    </header>
  )
}
