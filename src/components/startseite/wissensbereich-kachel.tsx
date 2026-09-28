import Link from "next/link"

type OrdnerVorschau = {
  id: string
  name: string
  artikel: { id: string; titel: string }[]
  _count: { artikel: number }
}

/**
 * Startseiten-Kachel "Wissensbereich" — aus src/app/page.tsx herausgelöst,
 * siehe KalenderKachel. Ohne gewählten Ordner (`ordner.length === 0`,
 * Standard-Zustand) der ursprüngliche einfache Link auf /wissen; mit
 * gewählten Ordnern (Schritt 2, Rückmeldung 2026-09-28) je Ordner eine
 * kleine Artikelliste — bei der Form HOCH bis zu drei Ordner
 * nebeneinander in der Reihenfolge der Auswahl in den Einstellungen.
 */
export function WissensbereichKachel({ className, ordner }: { className: string; ordner: OrdnerVorschau[] }) {
  if (ordner.length === 0) {
    return (
      <Link
        href="/wissen"
        className={`${className} flex flex-col justify-between rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-orange bg-flaeche p-4 shadow-sm transition hover:border-marke-orange focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen`}
      >
        <div>
          <h2 className="text-lg font-semibold text-ueberschrift">Wissensbereich</h2>
          <p className="mt-2 text-sm text-sekundaer">Wichtige Dokumente, abgestimmt auf die jeweilige Abteilung.</p>
        </div>
        <span className="text-sm font-semibold text-marke-gruen-dunkel">Zum Wissensbereich →</span>
      </Link>
    )
  }

  return (
    <div
      className={`${className} flex flex-col gap-3 overflow-hidden rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-orange bg-flaeche p-4 shadow-sm transition hover:border-marke-orange`}
    >
      <Link
        href="/wissen"
        className="shrink-0 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
      >
        <h2 className="text-lg font-semibold text-ueberschrift hover:underline">Wissensbereich</h2>
      </Link>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
        {ordner.map((o) => (
          <Link
            key={o.id}
            href={`/wissen/${o.id}`}
            className="flex min-h-0 flex-1 flex-col rounded-xl border border-flaeche-100 p-2 transition hover:border-marke-orange"
          >
            <span className="shrink-0 truncate text-sm font-semibold text-ueberschrift">{o.name}</span>
            {o.artikel.length === 0 ? (
              <p className="mt-1 text-xs text-sekundaer">Keine Artikel für dich sichtbar.</p>
            ) : (
              <ul className="mt-1 flex flex-col gap-0.5">
                {o.artikel.map((a) => (
                  <li key={a.id} className="truncate text-xs text-sekundaer">
                    {a.titel}
                  </li>
                ))}
              </ul>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
