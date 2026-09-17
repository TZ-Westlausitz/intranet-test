"use client"

import Link from "next/link"

/**
 * Fängt jeden nicht behandelten Fehler in einer Seite ab — bisher gab es
 * dafür keine Boundary, weder hier noch für einzelne Bereiche. Ohne sie
 * zeigt Next.js in Produktion nur eine leere, generische Fehlerseite ohne
 * Weg zurück. Trifft z. B. zu, wenn `berechtigung()` (siehe
 * src/lib/auth/berechtigung.ts) direkt im Seitenaufbau eine fehlende
 * Berechtigung meldet — kein Sonderfall, sondern regulärer Teil der
 * zentralen Rechteprüfung (Regel 5 in der CLAUDE.md).
 *
 * Die genaue Fehlermeldung landet hier nicht: Next.js reicht in Produktion
 * nur `message` + `digest` durch, nie den ursprünglichen Fehlertyp — daher
 * ein bewusst allgemeiner Text statt einer Unterscheidung nach Fehlerart.
 */
export default function FehlerSeite({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex max-w-2xl flex-col items-start px-5 py-10">
      <h1 className="text-2xl font-semibold text-ueberschrift">Diese Seite konnte nicht geladen werden</h1>
      <p className="mt-3 text-sm text-primaer">
        Entweder fehlt dir die Berechtigung dafür, oder etwas ist schiefgelaufen. Versuch es noch
        einmal oder geh zurück zur Startseite.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-marke-gruen px-4 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
        >
          Erneut versuchen
        </button>
        <Link
          href="/"
          className="rounded-lg border border-flaeche-300 px-4 py-2.5 text-sm font-medium text-primaer transition hover:border-tertiaer"
        >
          Zur Startseite
        </Link>
      </div>
    </main>
  )
}
