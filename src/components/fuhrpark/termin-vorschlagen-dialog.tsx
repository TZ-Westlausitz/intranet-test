"use client"

import { useRef } from "react"

import { heutigesDatumIso } from "@/lib/datum"

const HEUTE_ISO = heutigesDatumIso

/**
 * "Termin hinzufügen"-Knopf mit Pop-up: Art (TÜV/Service/Reifenwechsel) und
 * Datum, dann "Terminvorschlag senden" — schickt keinen Kalendereintrag
 * direkt, sondern eine Benachrichtigung an den Halter, der annimmt oder um
 * einen neuen Termin bittet (siehe fahrzeugTerminVorschlagen). Nur
 * sichtbar, wenn das Fahrzeug einen Halter hat (siehe Fahrzeugprofil-Seite)
 * — ohne Halter trägt die Werkstatt das Datum direkt im
 * "Fahrzeug bearbeiten"-Formular ein.
 */
export function TerminVorschlagenDialog({ aktion }: { aktion: (formData: FormData) => Promise<void> }) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="h-9 rounded-lg bg-flaeche-100 px-3 text-sm font-medium text-primaer transition hover:bg-flaeche-200"
      >
        + Termin hinzufügen
      </button>

      <dialog
        ref={dialogRef}
        className="fixed top-1/2 left-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rand bg-flaeche p-0 shadow-xl backdrop:bg-neutral-900/40"
      >
        <div className="flex flex-col gap-4 px-5 py-5">
          <h2 className="text-lg font-semibold text-ueberschrift">Termin vorschlagen</h2>
          <form action={aktion} onSubmit={() => dialogRef.current?.close()} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm font-medium text-primaer">
              Art des Termins
              <select name="art" required className="h-10 rounded-lg border border-flaeche-300 bg-flaeche px-3 text-sm">
                <option value="TUEV">TÜV</option>
                <option value="SERVICE">Service</option>
                <option value="REIFENWECHSEL">Reifenwechsel</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-primaer">
              Datum
              <input type="date" name="datum" required defaultValue={HEUTE_ISO()} className="h-10 rounded-lg border border-flaeche-300 bg-flaeche px-3 text-sm" />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="h-10 rounded-lg px-4 text-sm font-medium text-sekundaer transition hover:bg-flaeche-100"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="h-10 rounded-lg bg-marke-gruen px-4 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
              >
                Terminvorschlag senden
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  )
}
