"use client"

import { useRef } from "react"

/**
 * `<input type="datetime-local">` mit einem "Jetzt"-Button daneben, der das
 * aktuelle Datum/Uhrzeit einsetzt — spart Tippen, wenn der Werkstattleiter
 * das Protokoll direkt bei der Übergabe ausfüllt. Client-Komponente, weil
 * "jetzt" nur im Browser bekannt ist.
 */
export function DatumUhrzeitFeld({
  name,
  required,
  defaultValue,
}: {
  name: string
  required?: boolean
  defaultValue?: string
}) {
  const eingabeRef = useRef<HTMLInputElement>(null)

  function jetztEinsetzen() {
    const jetzt = new Date()
    const pad = (n: number) => String(n).padStart(2, "0")
    const wert =
      `${jetzt.getFullYear()}-${pad(jetzt.getMonth() + 1)}-${pad(jetzt.getDate())}` +
      `T${pad(jetzt.getHours())}:${pad(jetzt.getMinutes())}`

    if (eingabeRef.current) {
      eingabeRef.current.value = wert
    }
  }

  return (
    <div className="flex gap-2">
      <input
        ref={eingabeRef}
        type="datetime-local"
        name={name}
        required={required}
        defaultValue={defaultValue}
        className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2.5 text-base focus:border-marke-gruen focus:outline focus:outline-2 focus:outline-marke-gruen"
      />
      <button
        type="button"
        onClick={jetztEinsetzen}
        className="shrink-0 rounded-lg border border-neutral-300 px-3 py-2.5 text-sm font-medium text-neutral-700 transition hover:border-marke-gruen hover:text-marke-gruen-dunkel"
      >
        Jetzt
      </button>
    </div>
  )
}
