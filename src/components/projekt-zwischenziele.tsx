"use client"

import { relativesDatum } from "@/lib/datum"
import { zwischenzielStatus, ZWISCHENZIEL_STATUS_KLASSEN } from "@/lib/projekte-optionen"

export type ZwischenzielListenAnzeige = {
  id: string
  titel: string
  frist: Date
  /** Abgeleitet, nicht gespeichert: true sobald es mindestens eine Aufgabe hat und alle davon erledigt sind (siehe Kommentar am Model Zwischenziel). */
  erreicht: boolean
  aufgabenErledigt: number
  aufgabenGesamt: number
}

/**
 * Zwischenziel-Verwaltung (Liste + Anlegen) — nur für die Leitung, nur
 * solange das Projekt schreibbar ist. Die nummerierte, farbige Markierung
 * entspricht der in ProjektZeitstrahl (dieselbe Reihenfolge, derselbe
 * Status: grün erreicht, rot überfällig, orange offen) — die
 * Aufgaben-Zahl rechts zeigt bewusst NUR die Aufgaben dieses einen
 * Zwischenziels, nicht das ganze Projekt, siehe Rückmeldung zur früher
 * verwirrenden globalen Fortschrittsanzeige. Kein manueller
 * "Erledigt"-Knopf mehr — erreicht wird ausschließlich aus dem
 * Aufgaben-Fortschritt abgeleitet.
 */
export function ProjektZwischenziele({
  projektId,
  zwischenziele,
  heute,
  istLeitung,
  schreibgeschuetzt,
  erstellenAktion,
  loeschenAktion,
}: {
  projektId: string
  zwischenziele: ZwischenzielListenAnzeige[]
  heute: Date
  istLeitung: boolean
  schreibgeschuetzt: boolean
  erstellenAktion: (projektId: string, formData: FormData) => void
  loeschenAktion: (projektId: string, zwischenzielId: string) => void
}) {
  if (!istLeitung && zwischenziele.length === 0) return null

  return (
    <div className="flex flex-1 flex-col gap-3">
      {zwischenziele.length > 0 && (
        <ul className="flex flex-col divide-y divide-flaeche-100">
          {zwischenziele.map((zwischenziel, index) => {
            const status = zwischenzielStatus(zwischenziel, heute)
            return (
              <li key={zwischenziel.id} className="flex items-center justify-between gap-2 py-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white " +
                      ZWISCHENZIEL_STATUS_KLASSEN[status]
                    }
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <span className={"block truncate text-sm " + (zwischenziel.erreicht ? "text-tertiaer line-through" : "text-primaer")}>
                      {zwischenziel.titel}
                    </span>
                    <span className={"text-xs " + (status === "UEBERFAELLIG" ? "font-medium text-red-600" : "text-tertiaer")}>
                      {relativesDatum(zwischenziel.frist, heute)}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-tertiaer">
                    {zwischenziel.aufgabenErledigt}/{zwischenziel.aufgabenGesamt} Aufgaben
                  </span>

                  {istLeitung && !schreibgeschuetzt && (
                    <form action={loeschenAktion.bind(null, projektId, zwischenziel.id)}>
                      <button
                        type="submit"
                        aria-label={`${zwischenziel.titel} löschen`}
                        className="rounded p-1 text-tertiaer transition hover:bg-red-50 hover:text-red-600"
                      >
                        ×
                      </button>
                    </form>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {istLeitung && !schreibgeschuetzt && (
        <form action={erstellenAktion.bind(null, projektId)} className="mt-auto flex items-end gap-2 border-t border-flaeche-100 pt-3">
          <div>
            <label className="block text-xs font-medium text-primaer">Neues Zwischenziel</label>
            <input
              name="titel"
              type="text"
              required
              className="mt-1 h-9 rounded-lg border border-flaeche-300 px-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-primaer">Frist</label>
            <input name="frist" type="date" required className="mt-1 h-9 rounded-lg border border-flaeche-300 px-2 text-sm" />
          </div>
          <button
            type="submit"
            className="h-9 shrink-0 rounded-lg bg-flaeche-100 px-3 text-sm font-medium text-primaer transition hover:bg-flaeche-200"
          >
            Hinzufügen
          </button>
        </form>
      )}
    </div>
  )
}
