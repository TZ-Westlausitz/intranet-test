"use client"

import { useRef, type ReactNode } from "react"
import { Pencil } from "lucide-react"

import { FormularAenderungenSchutz } from "@/components/formular-aenderungen-schutz"

import {
  AufgabeFormFelder,
  type AufgabeAnhangAnzeige,
  type AufgabeStandardwerte,
} from "@/components/aufgabe-form-felder"
import { SpeichernKnopf } from "@/components/speichern-knopf"

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
  children,
}: {
  aufgabeId: string
  standardwerte: AufgabeStandardwerte
  bestehendeAnhaenge: AufgabeAnhangAnzeige[]
  aktualisierenAktion: (aufgabeId: string, formData: FormData) => void
  anhangLoeschenAktion: (anhangId: string) => void
  /** Optional: die klickbare Zeile (Titel, Fälligkeit …) — Klick darauf öffnet dasselbe Pop-Up wie der Stift. */
  children?: ReactNode
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  function schliessenNachAbsenden() {
    window.setTimeout(() => dialogRef.current?.close(), 0)
  }

  function oeffnen() {
    dialogRef.current?.showModal()
  }

  return (
    <>
      {children && (
        <div
          role="button"
          tabIndex={0}
          onClick={oeffnen}
          onKeyDown={(ereignis) => {
            if (ereignis.key === "Enter" || ereignis.key === " ") {
              ereignis.preventDefault()
              oeffnen()
            }
          }}
          className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-lg text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
        >
          {children}
        </div>
      )}
      <button
        type="button"
        aria-label="Aufgabe bearbeiten"
        onClick={oeffnen}
        className="mt-0.5 shrink-0 rounded p-1 text-tertiaer transition hover:bg-flaeche-100 hover:text-primaer"
      >
        <Pencil className="h-4 w-4" />
      </button>

      <dialog
        ref={dialogRef}
        className="fixed top-1/2 left-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rand bg-flaeche p-0 shadow-xl backdrop:bg-neutral-900/40"
      >
        <form
          action={aktualisierenAktion.bind(null, aufgabeId)}
          onSubmit={schliessenNachAbsenden}
          className="flex max-h-[85vh] flex-col"
        >
          <div className="border-b border-rand px-5 py-4">
            <h2 className="text-lg font-semibold text-ueberschrift">Aufgabe bearbeiten</h2>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
            <AufgabeFormFelder
              standardwerte={standardwerte}
              weitereOptionenOffen
              bestehendeAnhaenge={bestehendeAnhaenge}
              aufgabeId={aufgabeId}
              anhangLoeschenAktion={anhangLoeschenAktion}
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-rand px-5 py-4">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="h-9 rounded-lg px-3 text-sm font-medium text-primaer transition hover:bg-flaeche-100"
            >
              Abbrechen
            </button>
            <SpeichernKnopf
              type="submit"
              className="h-9 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
            >
              Speichern
            </SpeichernKnopf>
          </div>
          <FormularAenderungenSchutz />
        </form>
      </dialog>
    </>
  )
}
