import Link from "next/link"

/** Startseiten-Kachel "Aufgaben" (Aufträge + Projekt-Aufgaben) — aus src/app/page.tsx herausgelöst, siehe KalenderKachel. */
export function AufgabenKachel({
  className,
  auftraegeOffen,
  auftraegeAngenommen,
  projektAufgabenAnzahl,
}: {
  className: string
  auftraegeOffen: number
  auftraegeAngenommen: number
  projektAufgabenAnzahl: number
}) {
  const gesamtOffen = auftraegeOffen + auftraegeAngenommen + projektAufgabenAnzahl

  return (
    <Link
      href="/aufgaben"
      className={`${className} flex flex-col rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-gruen-dunkel bg-flaeche p-4 shadow-sm transition hover:border-marke-gruen-dunkel focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen`}
    >
      <div className="flex items-center justify-between gap-1.5">
        <h2 className="text-lg font-semibold text-ueberschrift hover:underline">Aufgaben</h2>
        {gesamtOffen > 0 && (
          <span
            aria-label={`${gesamtOffen} offene Aufgabe${gesamtOffen === 1 ? "" : "n"}`}
            className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-marke-orange px-1 text-xs font-bold text-neutral-900"
          >
            {gesamtOffen}
          </span>
        )}
      </div>

      {gesamtOffen === 0 ? (
        <p className="mt-2 text-xs text-sekundaer">Alles erledigt</p>
      ) : (
        <div className="mt-2 flex flex-1 flex-col gap-1.5">
          {auftraegeOffen > 0 && (
            <div className="flex items-center justify-between text-xs text-primaer">
              <span>Offen</span>
              <span className="font-medium">{auftraegeOffen}</span>
            </div>
          )}
          {auftraegeAngenommen > 0 && (
            <div className="flex items-center justify-between text-xs text-primaer">
              <span>Angenommen</span>
              <span className="font-medium">{auftraegeAngenommen}</span>
            </div>
          )}
          {projektAufgabenAnzahl > 0 && (
            <div className="flex items-center justify-between text-xs text-primaer">
              <span>Projekt-Aufgaben</span>
              <span className="font-medium">{projektAufgabenAnzahl}</span>
            </div>
          )}
        </div>
      )}
    </Link>
  )
}
