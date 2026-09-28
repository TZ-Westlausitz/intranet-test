import Link from "next/link"

import { aufgabeErledigtSetzen } from "@/lib/aufgaben/aktionen"

/** Startseiten-Kachel "To-Do-Liste" — aus src/app/page.tsx herausgelöst, siehe KalenderKachel. */
export function TodoListeKachel({
  className,
  offeneAnzahl,
  naechsteTodos,
}: {
  className: string
  offeneAnzahl: number
  naechsteTodos: { id: string; titel: string }[]
}) {
  return (
    <div
      className={`${className} flex flex-col rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-gruen bg-flaeche p-4 shadow-sm transition hover:border-marke-gruen`}
    >
      <Link
        href="/aufgaben"
        className="flex items-center justify-between gap-1.5 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
      >
        <h2 className="text-lg font-semibold text-ueberschrift hover:underline">To-Do-Liste</h2>
        {offeneAnzahl > 0 && (
          <span
            aria-label={`${offeneAnzahl} offene Einträge in der To-Do-Liste`}
            className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-marke-orange px-1 text-xs font-bold text-neutral-900"
          >
            {offeneAnzahl}
          </span>
        )}
      </Link>

      {naechsteTodos.length === 0 ? (
        <p className="mt-2 text-xs text-sekundaer">Alles erledigt</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5">
          {naechsteTodos.map((aufgabe) => (
            <li key={aufgabe.id} title={aufgabe.titel} className="flex items-center gap-1.5">
              <form action={aufgabeErledigtSetzen.bind(null, aufgabe.id, true)}>
                <button
                  type="submit"
                  aria-label={`"${aufgabe.titel}" als erledigt markieren`}
                  className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-flaeche-300 transition hover:border-marke-gruen-dunkel"
                />
              </form>
              <span className="truncate text-xs text-primaer">{aufgabe.titel}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
