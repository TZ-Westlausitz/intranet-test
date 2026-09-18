import Link from "next/link"

import { Kopfleiste } from "@/components/kopfleiste"

/**
 * Eigene 404-Seite statt Next.js' eingebauter Standardseite (Rückmeldung
 * 2026-09-18: Screenshot zeigte die nackte "This page could not be
 * found." ohne unser Layout-Styling — Next rendert die zwar innerhalb
 * des Root-Layouts, also mit Kopfzeile/Fußleiste, aber der Seiteninhalt
 * selbst bleibt bis hierhin ungestylt und englisch). Server-Komponente,
 * kein "Erneut versuchen" wie bei error.tsx: Ein erneuter Versuch ändert
 * an einer nicht existierenden Route nichts.
 *
 * `<Kopfleiste />` + vertikale Zentrierung ergänzt (Rückmeldung
 * 2026-09-18): Ohne sie fehlte auf Mobile das Logo, das jede andere
 * Seite hat, und der Inhalt klebte oben links über viel Leerraum statt
 * wie ein bewusster Leer-Zustand zu wirken.
 */
export default function NichtGefundenSeite() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-6">
      <Kopfleiste />

      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-flaeche-200 text-sekundaer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden>
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="M15.5 15.5 20 20" />
          </svg>
        </div>

        <h1 className="mt-4 text-2xl font-semibold text-ueberschrift">Diese Seite gibt es nicht</h1>
        <p className="mt-2 max-w-sm text-sm text-primaer">
          Der Link ist falsch oder die Seite wurde entfernt. Geh zurück zur Startseite.
        </p>

        <Link
          href="/"
          className="mt-6 rounded-lg bg-marke-gruen px-4 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
        >
          Zur Startseite
        </Link>
      </div>
    </main>
  )
}
