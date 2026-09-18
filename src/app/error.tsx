"use client"

import Link from "next/link"

import { Kopfleiste } from "@/components/kopfleiste"

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
 *
 * `<Kopfleiste />` + vertikale Zentrierung + Warnsymbol ergänzt
 * (Rückmeldung 2026-09-18) — dieselbe Behandlung wie not-found.tsx, aus
 * demselben Grund: Logo fehlte auf Mobile, Inhalt klebte oben links.
 */
export default function FehlerSeite({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-2xl px-5 py-6">
      <Kopfleiste />

      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-marke-orange/15 text-marke-orange">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden>
            <path d="M12 3.5 21 19.5H3L12 3.5Z" />
            <path d="M12 9.5v5" />
            <circle cx="12" cy="17.2" r="0.75" fill="currentColor" stroke="none" />
          </svg>
        </div>

        <h1 className="mt-4 text-2xl font-semibold text-ueberschrift">Diese Seite konnte nicht geladen werden</h1>
        <p className="mt-2 max-w-sm text-sm text-primaer">Versuch es noch einmal oder geh zurück zur Startseite.</p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
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
      </div>
    </main>
  )
}
