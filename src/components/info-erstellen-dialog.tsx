"use client"

import { useRef } from "react"

import { InfoFormFelder, LEERE_INFO_STANDARDWERTE, type InfoFormularOptionen } from "@/components/info-form-felder"

/**
 * "+ Info"-Knopf + Erstellen-Pop-Up — gleiches Muster wie
 * AufgabeBearbeitenDialog. Die Felder selbst stecken in InfoFormFelder
 * (geteilt mit InfoBearbeitenDialog).
 */
export function InfoErstellenDialog({
  optionen,
  erstellenAktion,
}: {
  optionen: InfoFormularOptionen
  erstellenAktion: (formData: FormData) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  function schliessenNachAbsenden() {
    window.setTimeout(() => dialogRef.current?.close(), 0)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="h-9 shrink-0 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
      >
        + Info
      </button>

      <dialog
        ref={dialogRef}
        className="fixed top-1/2 left-1/2 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-200 p-0 shadow-xl backdrop:bg-neutral-900/40"
      >
        <form action={erstellenAktion} onSubmit={schliessenNachAbsenden} className="flex max-h-[85vh] flex-col">
          <div className="border-b border-neutral-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-marke-grau">Neue Info</h2>
          </div>

          <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
            <InfoFormFelder standardwerte={LEERE_INFO_STANDARDWERTE} optionen={optionen} />
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
              Veröffentlichen
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}
