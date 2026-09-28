import Link from "next/link"

/** Startseiten-Kachel "Fahrzeuge" — aus src/app/page.tsx herausgelöst, siehe KalenderKachel. Inhalt je nach Rolle wie bisher: Werkstatt-Vorschau oder einfache "Fahrzeug mieten"-Kachel. */
export function FahrzeugeKachel({
  className,
  istWerkstatt,
  offeneAnfragen,
  naechsteReservierungen,
}: {
  className: string
  istWerkstatt: boolean
  offeneAnfragen: number
  naechsteReservierungen: { id: string; geplantVon: Date; fahrzeug: { bezeichnung: string } }[]
}) {
  return (
    <Link
      href={istWerkstatt ? "/fahrzeug-reservierungen" : "/fahrzeug-mieten"}
      className={`${className} flex flex-col justify-between rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-gruen bg-flaeche p-4 shadow-sm transition hover:border-marke-gruen focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen`}
    >
      {istWerkstatt ? (
        <>
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ueberschrift">Fahrzeuge</h2>
              {offeneAnfragen > 0 && (
                <span
                  aria-label={`${offeneAnfragen} offene Anfragen`}
                  className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-marke-orange px-1 text-xs font-bold text-neutral-900"
                >
                  {offeneAnfragen}
                </span>
              )}
            </div>
            {naechsteReservierungen.length === 0 ? (
              <p className="mt-2 text-xs text-sekundaer">Keine anstehenden Reservierungen.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1 text-xs text-sekundaer">
                {naechsteReservierungen.map((r) => (
                  <li key={r.id}>
                    {r.geplantVon.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })} · {r.fahrzeug.bezeichnung}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <span className="text-sm font-semibold text-marke-gruen-dunkel">Zum Reservierungsmenü →</span>
        </>
      ) : (
        <>
          <div>
            <h2 className="text-lg font-semibold text-ueberschrift">Fahrzeug mieten</h2>
            <p className="mt-2 text-sm text-sekundaer">Privat ein Firmenfahrzeug anfragen.</p>
          </div>
          <span className="text-sm font-semibold text-marke-gruen-dunkel">Jetzt anfragen →</span>
        </>
      )}
    </Link>
  )
}
