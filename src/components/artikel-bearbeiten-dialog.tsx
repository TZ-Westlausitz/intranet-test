"use client"

import { forwardRef, useImperativeHandle, useRef } from "react"

import {
  ArtikelFormFelder,
  type ArtikelAnhangAnzeige,
  type ArtikelStandardwerte,
  type ArtikelFormularOptionen,
} from "@/components/artikel-form-felder"

export type ArtikelBearbeitenDialogHandle = { oeffnen: () => void }

/**
 * Bearbeiten-Pop-Up für einen bestehenden Artikel — Muster
 * InfoBearbeitenDialog: kein eigener Auslöser, wird aus
 * ArtikelAktionenMenu heraus geöffnet (forwardRef/useImperativeHandle
 * statt Render-Prop, siehe dortiger Kommentar).
 */
export const ArtikelBearbeitenDialog = forwardRef<
  ArtikelBearbeitenDialogHandle,
  {
    artikelId: string
    standardwerte: ArtikelStandardwerte
    optionen: ArtikelFormularOptionen
    bestehendeAnhaenge: ArtikelAnhangAnzeige[]
    aktualisierenAktion: (artikelId: string, formData: FormData) => void
    anhangLoeschenAktion: (anhangId: string) => void
  }
>(function ArtikelBearbeitenDialog(
  { artikelId, standardwerte, optionen, bestehendeAnhaenge, aktualisierenAktion, anhangLoeschenAktion },
  ref,
) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useImperativeHandle(ref, () => ({
    oeffnen: () => dialogRef.current?.showModal(),
  }))

  function schliessenNachAbsenden() {
    window.setTimeout(() => dialogRef.current?.close(), 0)
  }

  return (
    <dialog
      ref={dialogRef}
      className="fixed top-1/2 left-1/2 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rand bg-flaeche p-0 shadow-xl backdrop:bg-neutral-900/40"
    >
      <form
        action={aktualisierenAktion.bind(null, artikelId)}
        onSubmit={schliessenNachAbsenden}
        className="flex max-h-[85vh] flex-col"
      >
        <div className="border-b border-rand px-5 py-4">
          <h2 className="text-lg font-semibold text-ueberschrift">Artikel bearbeiten</h2>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
          <ArtikelFormFelder
            standardwerte={standardwerte}
            optionen={optionen}
            bestehendeAnhaenge={bestehendeAnhaenge}
            artikelId={artikelId}
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
          <button
            type="submit"
            className="h-9 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
          >
            Speichern
          </button>
        </div>
      </form>
    </dialog>
  )
})
