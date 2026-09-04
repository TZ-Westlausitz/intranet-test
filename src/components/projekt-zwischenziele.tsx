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
        <ul className="flex flex-col divide-y divide-neutral-100">
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
                    <span className={"block truncate text-sm " + (zwischenziel.erreicht ? "text-neutral-400 line-through" : "text-neutral-800")}>
                      {zwischenziel.titel}
                    </span>
                    <span className={"text-xs " + (status === "UEBERFAELLIG" ? "font-medium text-red-600" : "text-neutral-400")}>
                      {relativesDatum(zwischenziel.frist, heute)}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-neutral-400">
                    {zwischenziel.aufgabenErledigt}/{zwischenziel.aufgabenGesamt} Aufgaben
                  </span>

                  {istLeitung && !schreibgeschuetzt && (
                    <form action={loeschenAktion.bind(null, projektId, zwischenziel.id)}>
                      <button
                        type="submit"
                        aria-label={`${zwischenziel.titel} löschen`}
                        className="rounded p-1 text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
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
        <form action={erstellenAktion.bind(null, projektId)} className="mt-auto flex items-end gap-2 border-t border-neutral-100 pt-3">
          <div>
            <label className="block text-xs font-medium text-neutral-600">Neues Zwischenziel</label>
            <input
              name="titel"
              type="text"
              required
              className="mt-1 h-9 rounded-lg border border-neutral-300 px-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600">Frist</label>
            <input name="frist" type="date" required className="mt-1 h-9 rounded-lg border border-neutral-300 px-2 text-sm" />
          </div>
          <button
            type="submit"
            className="h-9 shrink-0 rounded-lg bg-neutral-100 px-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-200"
          >
            Hinzufügen
          </button>
        </form>
      )}
    </div>
  )
}
