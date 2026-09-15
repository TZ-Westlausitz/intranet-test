"use client"

import { forwardRef, useImperativeHandle, useRef } from "react"

import {
  InfoFormFelder,
  type InfoAnhangAnzeige,
  type InfoStandardwerte,
  type InfoFormularOptionen,
} from "@/components/info-form-felder"

export type InfoBearbeitenDialogHandle = { oeffnen: () => void }

/**
 * Bearbeiten-Pop-Up für eine bestehende Info — dieselben Felder wie beim
 * Anlegen (InfoFormFelder), nur vorbefüllt. Anders als InfoErstellenDialog
 * (eigener sichtbarer "+ Info"-Knopf) hat dieser Dialog KEINEN eigenen
 * Auslöser: Er wird aus InfoAktionenMenu heraus geöffnet (Menüpunkt
 * "Bearbeiten" statt eines eigenen Knopfs), deshalb `forwardRef` +
 * `useImperativeHandle` statt eines Render-Prop-Auslösers — ein
 * ref.current-Zugriff in einer während des Renderns aufgerufenen Closure
 * (das wäre die render-prop-Variante) stößt sich an der neueren
 * react-hooks-Regel "Cannot access refs during render".
 */
export const InfoBearbeitenDialog = forwardRef<
  InfoBearbeitenDialogHandle,
  {
    infoId: string
    standardwerte: InfoStandardwerte
    optionen: InfoFormularOptionen
    bestehendeAnhaenge: InfoAnhangAnzeige[]
    aktualisierenAktion: (infoId: string, formData: FormData) => void
    anhangLoeschenAktion: (anhangId: string) => void
  }
>(function InfoBearbeitenDialog(
  { infoId, standardwerte, optionen, bestehendeAnhaenge, aktualisierenAktion, anhangLoeschenAktion },
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
        action={aktualisierenAktion.bind(null, infoId)}
        onSubmit={schliessenNachAbsenden}
        className="flex max-h-[85vh] flex-col"
      >
        <div className="border-b border-rand px-5 py-4">
          <h2 className="text-lg font-semibold text-ueberschrift">Info bearbeiten</h2>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
          <InfoFormFelder
            standardwerte={standardwerte}
            optionen={optionen}
            bestehendeAnhaenge={bestehendeAnhaenge}
            infoId={infoId}
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
