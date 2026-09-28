import Link from "next/link"

import { MONATSNAMEN } from "@/lib/kalender"

/**
 * Startseiten-Kachel "Kalender" — aus src/app/page.tsx herausgelöst, damit
 * sie an jeder Rasterposition erscheinen kann (siehe
 * src/lib/startseite/raster.ts). `className` kommt von dort (Grid-Platzierung).
 */
export function KalenderKachel({
  className,
  heute,
  faelligeErinnerungen,
  terminVorschau,
}: {
  className: string
  heute: Date
  faelligeErinnerungen: number
  terminVorschau: string | null
}) {
  return (
    <Link
      href="/kalender"
      className={`${className} flex flex-col rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-orange bg-flaeche p-4 text-center shadow-sm transition hover:border-marke-orange focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen`}
    >
      <div className="flex items-center justify-center gap-1.5">
        <h2 className="text-lg font-semibold text-ueberschrift">Kalender</h2>
        {faelligeErinnerungen > 0 && (
          <span
            aria-label={`${faelligeErinnerungen} fällige Erinnerungen`}
            className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-marke-orange px-1 text-xs font-bold text-neutral-900"
          >
            {faelligeErinnerungen}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col items-center justify-center">
        <span className="text-5xl font-bold leading-none text-ueberschrift">{heute.getDate()}</span>
        <span className="mt-1.5 text-sm font-medium text-sekundaer">{MONATSNAMEN[heute.getMonth()]}</span>
      </div>
      <p className="truncate text-xs font-medium text-sekundaer">{terminVorschau ?? "Keine anstehenden Termine"}</p>
    </Link>
  )
}
