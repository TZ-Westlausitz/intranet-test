import Link from "next/link"

export type AufgabenKachelProjekt = { id: string; titel: string; anzahl: number }

/**
 * Startseiten-Kachel "Aufgaben" — aus src/app/page.tsx herausgelöst, siehe
 * KalenderKachel. Zweigeteilt (Rückmeldung 2026-09-28): obere Hälfte zählt
 * Aufträge (Offen/Angenommen), untere Hälfte listet die eigenen Projekte
 * mit der Anzahl noch offener eigener Aufgaben darin — nur Projekte mit
 * mindestens einer offenen eigenen Aufgabe, "falls verfügbar" heißt hier
 * also: Abschnitt bleibt weg, wenn es keine gibt.
 */
export function AufgabenKachel({
  className,
  auftraegeOffen,
  auftraegeAngenommen,
  projekte,
}: {
  className: string
  auftraegeOffen: number
  auftraegeAngenommen: number
  projekte: AufgabenKachelProjekt[]
}) {
  const projektAufgabenGesamt = projekte.reduce((summe, p) => summe + p.anzahl, 0)
  const gesamtOffen = auftraegeOffen + auftraegeAngenommen + projektAufgabenGesamt

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
        <div className="mt-2 flex min-h-0 flex-1 flex-col gap-2">
          {/* Obere Hälfte: Aufträge. */}
          {(auftraegeOffen > 0 || auftraegeAngenommen > 0) && (
            <div className="flex flex-col gap-1.5">
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
            </div>
          )}

          {/* Untere Hälfte: eigene Projekte mit offenen Aufgaben. */}
          {projekte.length > 0 && (
            <div className="min-h-0 flex-1 border-t border-flaeche-100 pt-2">
              <h3 className="text-[11px] font-semibold tracking-wide text-sekundaer uppercase">Projekte</h3>
              <ul className="mt-1 flex flex-col gap-1 overflow-y-auto">
                {projekte.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 text-xs text-primaer">
                    <span className="truncate">{p.titel}</span>
                    <span className="font-medium">{p.anzahl}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Link>
  )
}
