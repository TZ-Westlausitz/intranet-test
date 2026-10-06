"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"

import { FormularAenderungenSchutz } from "@/components/formular-aenderungen-schutz"
import { datumIsoAusDate, relativesDatum } from "@/lib/datum"
import { zwischenzielStatus, ZWISCHENZIEL_STATUS_KLASSEN } from "@/lib/projekte-optionen"
import { DatumFeld } from "@/components/datum-feld"
import { SpeichernKnopf } from "@/components/speichern-knopf"

export type ZwischenzielListenAnzeige = {
  id: string
  titel: string
  frist: Date
  /** Optionale genauere Beschreibung (schlichter Text). */
  notiz: string | null
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
 *
 * Die Frist (und mit ihr auch der Titel, weil zwischenzielAktualisieren
 * ohnehin beides zusammen erwartet) lässt sich seit Rückmeldung
 * 2026-09-30 nachträglich bearbeiten — vorher gab es dafür trotz
 * vorhandener Server Action keine Bedienstelle, ein Zwischenziel ließ
 * sich nur anlegen oder löschen. Inline-Formular pro Zeile statt Dialog,
 * weil nur zwei einfache Felder.
 */
export function ProjektZwischenziele({
  projektId,
  zwischenziele,
  heute,
  istLeitung,
  schreibgeschuetzt,
  erstellenAktion,
  aktualisierenAktion,
  loeschenAktion,
}: {
  projektId: string
  zwischenziele: ZwischenzielListenAnzeige[]
  heute: Date
  istLeitung: boolean
  schreibgeschuetzt: boolean
  erstellenAktion: (projektId: string, formData: FormData) => void
  aktualisierenAktion: (projektId: string, zwischenzielId: string, formData: FormData) => void
  loeschenAktion: (projektId: string, zwischenzielId: string) => void
}) {
  const [bearbeiteId, setBearbeiteId] = useState<string | null>(null)

  if (!istLeitung && zwischenziele.length === 0) return null

  return (
    <div className="flex flex-1 flex-col gap-3">
      {zwischenziele.length > 0 && (
        <ul className="flex flex-col divide-y divide-flaeche-100">
          {zwischenziele.map((zwischenziel, index) => {
            const status = zwischenzielStatus(zwischenziel, heute)

            if (bearbeiteId === zwischenziel.id) {
              return (
                <li key={zwischenziel.id} className="py-2">
                  <form
                    action={(formData) => {
                      aktualisierenAktion(projektId, zwischenziel.id, formData)
                      setBearbeiteId(null)
                    }}
                    className="flex flex-col gap-2"
                  >
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="min-w-0 flex-1">
                        <label className="block text-xs font-medium text-primaer">Titel</label>
                        <input
                          name="titel"
                          type="text"
                          required
                          defaultValue={zwischenziel.titel}
                          className="mt-1 h-9 w-full min-w-40 rounded-lg border border-flaeche-300 px-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-primaer">Frist</label>
                        <DatumFeld
                          name="frist"
                          required
                          defaultValue={datumIsoAusDate(zwischenziel.frist)}
                          ariaLabel="Frist"
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-primaer">Notiz (optional)</label>
                      <textarea
                        name="notiz"
                        rows={3}
                        maxLength={2000}
                        defaultValue={zwischenziel.notiz ?? ""}
                        className="mt-1 w-full rounded-lg border border-flaeche-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setBearbeiteId(null)}
                        className="h-9 shrink-0 rounded-lg px-3 text-sm font-medium text-tertiaer transition hover:bg-flaeche-100"
                      >
                        Abbrechen
                      </button>
                      <SpeichernKnopf
                        type="submit"
                        className="h-9 shrink-0 rounded-lg bg-marke-gruen px-3 text-sm font-medium text-neutral-900 transition hover:bg-marke-gruen-dunkel"
                      >
                        Speichern
                      </SpeichernKnopf>
                    </div>
                  </form>
                </li>
              )
            }

            return (
              <li key={zwischenziel.id} className="flex items-start justify-between gap-2 py-2">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span
                    className={
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white " +
                      ZWISCHENZIEL_STATUS_KLASSEN[status]
                    }
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    {/* break-words statt truncate: lange Namen brechen um (Rückmeldung 2026-10-06). */}
                    <span className={"block text-sm break-words " + (zwischenziel.erreicht ? "text-tertiaer line-through" : "text-primaer")}>
                      {zwischenziel.titel}
                    </span>
                    <span className={"text-xs " + (status === "UEBERFAELLIG" ? "font-medium text-red-600" : "text-tertiaer")}>
                      {relativesDatum(zwischenziel.frist, heute)}
                    </span>
                    {zwischenziel.notiz && (
                      <p className="mt-1 text-xs break-words whitespace-pre-line text-sekundaer">{zwischenziel.notiz}</p>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="mt-0.5 text-xs text-tertiaer">
                    {zwischenziel.aufgabenErledigt}/{zwischenziel.aufgabenGesamt} Aufgaben
                  </span>

                  {istLeitung && !schreibgeschuetzt && (
                    <>
                      <button
                        type="button"
                        onClick={() => setBearbeiteId(zwischenziel.id)}
                        aria-label={`${zwischenziel.titel} bearbeiten`}
                        className="rounded p-1 text-tertiaer transition hover:bg-flaeche-100 hover:text-primaer"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      <form action={loeschenAktion.bind(null, projektId, zwischenziel.id)}>
                        <button
                          type="submit"
                          aria-label={`${zwischenziel.titel} löschen`}
                          className="rounded p-1 text-tertiaer transition hover:bg-red-50 hover:text-red-600"
                        >
                          ×
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {istLeitung && !schreibgeschuetzt && (
        <form action={erstellenAktion.bind(null, projektId)} className="mt-auto flex flex-col gap-2 border-t border-flaeche-100 pt-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1">
              <label className="block text-xs font-medium text-primaer">Neues Zwischenziel</label>
              <input
                name="titel"
                type="text"
                required
                className="mt-1 h-9 w-full min-w-40 rounded-lg border border-flaeche-300 px-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-primaer">Frist</label>
              <DatumFeld name="frist" required ariaLabel="Frist" className="mt-1" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-primaer">Notiz (optional)</label>
            <textarea
              name="notiz"
              rows={2}
              maxLength={2000}
              placeholder="Genauere Beschreibung …"
              className="mt-1 w-full rounded-lg border border-flaeche-300 px-2 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="ml-auto h-9 shrink-0 rounded-lg bg-flaeche-100 px-3 text-sm font-medium text-primaer transition hover:bg-flaeche-200"
          >
            Hinzufügen
          </button>
          <FormularAenderungenSchutz />
        </form>
      )}
    </div>
  )
}
