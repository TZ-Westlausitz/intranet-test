"use client"

import { useRef } from "react"

import {
  AufgabeFormFelder,
  type AufgabeAnhangAnzeige,
  type AufgabeStandardwerte,
} from "@/components/aufgabe-form-felder"

/**
 * Stift-Knopf + Bearbeiten-Pop-Up für eine To-do — anders als beim
 * Kalender-Bearbeiten-Dialog braucht es hier KEINEN Portal-Trick: dieser
 * Dialog steckt nie innerhalb eines anderen offenen `<dialog>` (die
 * To-do-Zeilen liegen direkt auf der Seite, nicht in einem übergeordneten
 * Info-Pop-Up wie beim Kalender).
 */
export function AufgabeBearbeitenDialog({
  aufgabeId,
  standardwerte,
  bestehendeAnhaenge,
  aktualisierenAktion,
  anhangLoeschenAktion,
}: {
  aufgabeId: string
  standardwerte: AufgabeStandardwerte
  bestehendeAnhaenge: AufgabeAnhangAnzeige[]
  aktualisierenAktion: (aufgabeId: string, formData: FormData) => void
  anhangLoeschenAktion: (anhangId: string) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  function schliessenNachAbsenden() {
    window.setTimeout(() => dialogRef.current?.close(), 0)
  }

  return (
    <>
      <button
        type="button"
        aria-label="Aufgabe bearbeiten"
        onClick={() => dialogRef.current?.showModal()}
        className="mt-0.5 shrink-0 rounded p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
      >
        ✎
      </button>

      <dialog
        ref={dialogRef}
        className="fixed top-1/2 left-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-200 p-0 shadow-xl backdrop:bg-neutral-900/40"
      >
        <form
          action={aktualisierenAktion.bind(null, aufgabeId)}
          onSubmit={schliessenNachAbsenden}
          className="flex max-h-[85vh] flex-col"
        >
          <div className="border-b border-neutral-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-marke-grau">Aufgabe bearbeiten</h2>
          </div>

          <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
            <AufgabeFormFelder
              standardwerte={standardwerte}
              weitereOptionenOffen
              bestehendeAnhaenge={bestehendeAnhaenge}
              aufgabeId={aufgabeId}
              anhangLoeschenAktion={anhangLoeschenAktion}
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-neutral-200 px-5 py-4">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="h-9 rounded-lg px-3 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="h-9 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
            >
              Speichern
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}
