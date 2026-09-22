"use client"

import { useRef } from "react"

import { MELDUNG_STATUS_REIHENFOLGE, MELDUNG_STATUS_LABEL } from "@/lib/kontaktstelle/status"

// Volle, literale Klassennamen pro Index (Tailwind braucht komplette
// Strings im Quelltext, siehe Erfahrung mit dem Desktop-Schnellmenü) —
// keine berechnete "translate-x-" + index-Verkettung.
const POSITION_KLASSE = ["translate-x-0", "translate-x-full", "translate-x-[200%]"]

/**
 * Statuszeile als dreistufiger Schieberegler (Rückmeldung 2026-09-22) —
 * nur für die Kontaktstelle gerendert (siehe [meldungId]/page.tsx), die
 * meldende Person sieht stattdessen nur MeldungStatusChip. Schickt bei
 * jeder Wahl sofort ab (Muster AdminModusSchalter/FarbschemaSchalter),
 * kein separater Speichern-Klick nötig.
 */
export function MeldungStatusSchieberegler({
  meldungId,
  status,
  aktion,
}: {
  meldungId: string
  status: string
  aktion: (meldungId: string, formData: FormData) => void
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const feldRef = useRef<HTMLInputElement>(null)
  const aktiverIndex = Math.max(0, MELDUNG_STATUS_REIHENFOLGE.indexOf(status as (typeof MELDUNG_STATUS_REIHENFOLGE)[number]))

  function waehlen(neu: string) {
    if (neu === status) return
    if (feldRef.current) feldRef.current.value = neu
    formRef.current?.requestSubmit()
  }

  return (
    <form ref={formRef} action={aktion.bind(null, meldungId)}>
      <input ref={feldRef} type="hidden" name="status" defaultValue={status} />
      <div className="relative grid grid-cols-3 rounded-full border border-rand bg-flaeche-schwach p-1 text-xs font-semibold">
        <span
          aria-hidden
          className={
            "absolute inset-y-1 left-1 w-[calc(33.333%-0.1667rem)] rounded-full bg-marke-orange shadow transition-transform " +
            POSITION_KLASSE[aktiverIndex]
          }
        />
        {MELDUNG_STATUS_REIHENFOLGE.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => waehlen(s)}
            aria-pressed={s === status}
            className={
              "relative z-10 rounded-full px-2 py-1.5 text-center transition " +
              (s === status ? "text-neutral-900" : "text-sekundaer hover:text-primaer")
            }
          >
            {MELDUNG_STATUS_LABEL[s]}
          </button>
        ))}
      </div>
    </form>
  )
}
