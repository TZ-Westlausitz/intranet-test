import Image from "next/image"
import Link from "next/link"

import { BenutzerMenu } from "@/components/benutzer-menu"
import { MobilesMenu } from "@/components/mobiles-menu"

/**
 * Header-Leiste für Handy-Ansichten: Drei-Striche-Menü (Bausteine, klappt
 * untereinander auf) und Logo links, ausklappbares Menü (Profil,
 * Kontaktstelle, Ausloggen) rechts — Letzteres steckt in `BenutzerMenu`,
 * geteilt mit der festen Desktop-Kopfzeile im Root-Layout
 * (src/app/layout.tsx). Ab `md:` blendet sich diese Leiste selbst aus,
 * damit nicht zwei Kopfzeilen übereinanderstehen — dort übernimmt das
 * Root-Layout die Rolle dauerhaft für jede Seite. Der grüne Akzentbalken
 * ganz oben steht ebenfalls im Root-Layout, nicht hier.
 *
 * Die eigentliche Anmeldeseite (`/anmelden`) nutzt weiterhin die einfache
 * `Logoleiste` ohne Menü — dort gibt es noch keine angemeldete Person.
 */
export function Kopfleiste({ name }: { name: string }) {
  return (
    <header className="mb-8 flex items-center justify-between border-b border-rand pb-4 md:hidden">
      <div className="flex items-center gap-2">
        <MobilesMenu />

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
      </div>

      <BenutzerMenu name={name} />
    </header>
  )
}
