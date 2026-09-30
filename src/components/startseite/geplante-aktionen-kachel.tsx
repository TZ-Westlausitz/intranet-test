import Link from "next/link"
import { CheckSquare, ClipboardList, Newspaper } from "lucide-react"

import { modulAkzentKlassen } from "@/lib/startseite/raster"

type GeplanterEintrag = { id: string; titel: string; datum: Date; typ: "info" | "aufgabe" | "auftrag" }

/** Startseiten-Kachel "Geplante Aktionen" — aus src/app/page.tsx herausgelöst, siehe KalenderKachel. */
export function GeplanteAktionenKachel({
  className,
  gesamtAnzahl,
  naechsteGeplant,
}: {
  className: string
  gesamtAnzahl: number
  naechsteGeplant: GeplanterEintrag[]
}) {
  return (
    <div
      className={`${className} flex flex-col rounded-2xl border border-x-rand border-b-rand border-t-4 ${modulAkzentKlassen("GEPLANTE_AKTIONEN")} bg-flaeche p-4 shadow-sm transition`}
    >
      <Link
        href="/geplante-aktionen"
        className="flex items-center justify-between gap-1.5 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
      >
        <h2 className="text-lg font-semibold text-ueberschrift hover:underline">Geplante Aktionen</h2>
        {gesamtAnzahl > 0 && (
          <span
            aria-label={`${gesamtAnzahl} geplante Infos, To-Dos und Aufgaben`}
            className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-marke-orange px-1 text-xs font-bold text-neutral-900"
          >
            {gesamtAnzahl}
          </span>
        )}
      </Link>

      {naechsteGeplant.length === 0 ? (
        <p className="mt-2 text-xs text-sekundaer">Keine geplanten Infos, To-Dos oder Aufgaben.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5">
          {naechsteGeplant.map((eintrag) => (
            <li key={eintrag.id} title={eintrag.titel} className="flex items-center gap-1.5 text-xs">
              <span aria-hidden className="shrink-0 text-tertiaer">
                {eintrag.typ === "info" ? (
                  <Newspaper className="h-3.5 w-3.5" />
                ) : eintrag.typ === "aufgabe" ? (
                  <CheckSquare className="h-3.5 w-3.5" />
                ) : (
                  <ClipboardList className="h-3.5 w-3.5" />
                )}
              </span>
              <span className="truncate text-primaer">{eintrag.titel}</span>
              <span className="ml-auto shrink-0 text-tertiaer">
                {eintrag.datum.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit" })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
