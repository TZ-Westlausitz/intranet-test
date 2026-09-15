"use client"

import { useRef, useState } from "react"

/**
 * "Profilbild bearbeiten"-Knopf — öffnet direkt die Dateiauswahl und lädt
 * die Auswahl sofort hoch (kein zusätzlicher "Speichern"-Schritt), analog
 * zum Bild-Knopf in RichTextEditor. `aktion` ist ein direkter Aufruf der
 * Server Action (kein `<form action=...>`), weil hier kein umgebendes
 * Formular gebraucht wird — nur dieser eine Knopf.
 */
export function ProfilbildBearbeiten({ aktion }: { aktion: (formData: FormData) => Promise<void> }) {
  const eingabeRef = useRef<HTMLInputElement>(null)
  const [wirdHochgeladen, setWirdHochgeladen] = useState(false)

  async function ausgewaehlt(ereignis: React.ChangeEvent<HTMLInputElement>) {
    const datei = ereignis.target.files?.[0]
    ereignis.target.value = ""
    if (!datei) return

    const formData = new FormData()
    formData.append("profilbild", datei)
    setWirdHochgeladen(true)
    await aktion(formData)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => eingabeRef.current?.click()}
        disabled={wirdHochgeladen}
        className="h-9 rounded-lg bg-flaeche-100 px-3 text-sm font-medium text-primaer transition hover:bg-flaeche-200 disabled:opacity-50"
      >
        {wirdHochgeladen ? "Wird hochgeladen …" : "Profilbild bearbeiten"}
      </button>
      <input
        ref={eingabeRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        onChange={ausgewaehlt}
        className="hidden"
      />
    </>
  )
}
