"use client"

import { useRef } from "react"

/**
 * "+ Ordner"/"+ Unterordner"-Knopf + Anlegen-Pop-Up — ein einziges
 * Namensfeld, dieselbe kleine Komponente für beide Ebenen (für einen
 * Unterordner reicht `erstellenAktion={unterordnerErstellen.bind(null,
 * ordnerId)}` von der aufrufenden Seite).
 */
export function OrdnerErstellenDialog({
  label,
  titel,
  erstellenAktion,
}: {
  label: string
  titel: string
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
        {label}
      </button>

      <dialog
        ref={dialogRef}
        className="fixed top-1/2 left-1/2 w-full max-w-xs -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-200 p-0 shadow-xl backdrop:bg-neutral-900/40"
      >
        <form action={erstellenAktion} onSubmit={schliessenNachAbsenden} className="flex flex-col">
          <div className="px-5 py-4">
            <h2 className="text-lg font-semibold text-marke-grau">{titel}</h2>
            <label htmlFor="ordner-name" className="mt-3 block text-xs font-medium text-neutral-600">
              Name
            </label>
            <input
              id="ordner-name"
              name="name"
              type="text"
              required
              className="mt-1 h-9 w-full rounded-lg border border-neutral-300 px-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-neutral-200 px-5 py-3">
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
              Anlegen
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}
