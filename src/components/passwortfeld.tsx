"use client"

import { useState } from "react"

const AUGE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)
const AUGE_DURCHGESTRICHEN_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
    <path d="M3 3l18 18" />
    <path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a15.6 15.6 0 0 1-3.1 4.1M6.3 6.3A15.9 15.9 0 0 0 2 12s3.5 7 10 7a10.3 10.3 0 0 0 4.2-.9" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </svg>
)

/**
 * Passwortfeld mit Augen-Icon zum Ein-/Ausblenden der Eingabe (Rückmeldung
 * 2026-09-18: so üblich, bisher zeigte keines der beiden Passwortfelder im
 * Projekt — /anmelden und /passwort-aendern — den eingegebenen Text an).
 * `randKlasse` als Override-Punkt für /passwort-aendern (grüner Rahmen bei
 * übereinstimmenden Passwörtern) statt eines eigenen Props dafür — bleibt
 * so ein normales, wiederverwendbares Eingabefeld statt eines auf einen
 * Anwendungsfall zugeschnittenen.
 */
export function Passwortfeld({
  name,
  label,
  required,
  minLength,
  autoComplete,
  randKlasse,
  value,
  onChange,
}: {
  name: string
  label: string
  required?: boolean
  minLength?: number
  autoComplete?: string
  randKlasse?: string
  value?: string
  onChange?: (wert: string) => void
}) {
  const [sichtbar, setSichtbar] = useState(false)

  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-primaer">{label}</span>
      <div className="relative">
        <input
          name={name}
          type={sichtbar ? "text" : "password"}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange ? (ev) => onChange(ev.target.value) : undefined}
          className={
            "w-full rounded-lg border bg-flaeche px-3 py-2.5 pr-11 text-base text-primaer focus:outline focus:outline-2 focus:outline-marke-gruen " +
            (randKlasse ?? "border-rand focus:border-marke-gruen")
          }
        />
        <button
          type="button"
          onClick={() => setSichtbar((v) => !v)}
          aria-label={sichtbar ? "Passwort verbergen" : "Passwort anzeigen"}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-sekundaer transition hover:text-primaer"
        >
          {sichtbar ? AUGE_DURCHGESTRICHEN_ICON : AUGE_ICON}
        </button>
      </div>
    </label>
  )
}
