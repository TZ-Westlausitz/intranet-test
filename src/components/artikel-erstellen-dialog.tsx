"use client"

import { useRef } from "react"

import { ArtikelFormFelder, LEERE_ARTIKEL_STANDARDWERTE, type ArtikelFormularOptionen } from "@/components/artikel-form-felder"

/**
 * "+ Artikel"-Knopf + Erstellen-Pop-Up — Muster InfoErstellenDialog.
 * `ordnerId`/`unterordnerId` sind die feste Position dieser Seite (Ordner-
 * oder Unterordner-Detailseite) — werden an die Server Action gebunden,
 * nicht als Formularfeld mitgeschickt (Regel 5: nie dem Formularwert
 * vertrauen, wo es nicht nötig ist).
 */
export function ArtikelErstellenDialog({
  ordnerId,
  unterordnerId,
  optionen,
  erstellenAktion,
}: {
  ordnerId: string
  unterordnerId: string | null
  optionen: ArtikelFormularOptionen
  erstellenAktion: (ordnerId: string, unterordnerId: string | null, formData: FormData) => void
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
        + Artikel
      </button>

      <dialog
        ref={dialogRef}
        className="fixed top-1/2 left-1/2 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rand bg-flaeche p-0 shadow-xl backdrop:bg-neutral-900/40"
      >
        <form
          action={erstellenAktion.bind(null, ordnerId, unterordnerId)}
          onSubmit={schliessenNachAbsenden}
          className="flex max-h-[85vh] flex-col"
        >
          <div className="border-b border-rand px-5 py-4">
            <h2 className="text-lg font-semibold text-ueberschrift">Neuer Artikel</h2>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
            <ArtikelFormFelder standardwerte={LEERE_ARTIKEL_STANDARDWERTE} optionen={optionen} />
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
              Veröffentlichen
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}
