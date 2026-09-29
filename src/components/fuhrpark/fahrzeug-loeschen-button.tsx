"use client"

import { Trash2 } from "lucide-react"

/** Bestätigungsabfrage vor dem endgültigen Löschen eines ausgemusterten Fahrzeugs — unwiderruflich, siehe fahrzeugLoeschen. */
export function FahrzeugLoeschenButton({ bezeichnung, action }: { bezeichnung: string; action: (formData: FormData) => void }) {
  return (
    <form
      action={action}
      onSubmit={(ev) => {
        if (!confirm(`"${bezeichnung}" wirklich endgültig löschen? Das kann nicht rückgängig gemacht werden.`)) {
          ev.preventDefault()
        }
      }}
    >
      <button
        type="submit"
        aria-label={`${bezeichnung} endgültig löschen`}
        title="Endgültig löschen"
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-tertiaer transition hover:bg-red-50 hover:text-red-700"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
        Löschen
      </button>
    </form>
  )
}
