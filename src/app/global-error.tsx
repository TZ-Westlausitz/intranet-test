"use client"

import "./globals.css"

/**
 * Letzte Auffangstelle für Fehler im Root-Layout selbst (Kopfzeile,
 * Navigation, Kontext-Abfrage) — error.tsx fängt nur Fehler UNTERHALB des
 * Layouts ab und greift hier nicht. Ersetzt das Root-Layout komplett:
 * bringt deshalb ein eigenes <html>/<body> und die globalen Styles selbst
 * mit (sonst wäre die Seite ungestylt), ohne Kopfzeile/Navigation, und
 * bleibt immer hell — das Farbschema kommt aus der Datenbank
 * (Person.farbschema), die hier ja gerade nicht verfügbar sein muss.
 * "Zur Startseite" als normaler Link (voller Seitenaufruf) statt
 * Client-Navigation, damit ein kaputter Layout-Zustand sicher verworfen wird.
 */
export default function GlobalFehlerSeite({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="de">
      <body>
        <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 py-10 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- next/image hängt am Root-Layout, das hier ausgefallen sein kann */}
          <img src="/logo.png" alt="Therapie- und Pflegezentrum Westlausitz" width={291} height={56} className="h-14 w-auto" />

          <div className="mt-10 flex h-12 w-12 items-center justify-center rounded-full bg-marke-orange/15 text-marke-orange">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden>
              <path d="M12 3.5 21 19.5H3L12 3.5Z" />
              <path d="M12 9.5v5" />
              <circle cx="12" cy="17.2" r="0.75" fill="currentColor" stroke="none" />
            </svg>
          </div>

          <h1 className="mt-4 text-2xl font-semibold text-ueberschrift">Die Seite konnte nicht geladen werden</h1>
          <p className="mt-2 max-w-sm text-sm text-primaer">Versuch es noch einmal oder geh zurück zur Startseite.</p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={retry}
              className="rounded-lg bg-marke-gruen px-4 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
            >
              Erneut versuchen
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- bewusst voller Seitenaufruf, siehe Kommentar oben */}
            <a
              href="/"
              className="rounded-lg border border-flaeche-300 px-4 py-2.5 text-sm font-medium text-primaer transition hover:border-tertiaer"
            >
              Zur Startseite
            </a>
          </div>
        </main>
      </body>
    </html>
  )
}
