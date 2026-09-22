"use client"

import { FORMULAR_STATUS_REIHENFOLGE, FORMULAR_STATUS_LABEL } from "@/lib/formulare/status"
import type { FormularEinreichungStatus } from "@/generated/prisma/enums"

// Volle, literale Klassennamen pro Index (Tailwind braucht komplette
// Strings im Quelltext) — exakt dasselbe Muster wie MeldungStatusSchieberegler.
const POSITION_KLASSE = ["translate-x-0", "translate-x-full", "translate-x-[200%]"]

/**
 * Statuszeile als dreistufiger Schieberegler — optisch identisch zum
 * Pendant bei der Kontaktstelle (Rückmeldung 2026-09-22:
 * "Optik genau wie gerade schon bei der Meldestelle umgesetzt"), nur für
 * `einreichungStatusSetzen(einreichungId, status)` angepasst: die Aktion
 * nimmt den neuen Status direkt entgegen, deshalb reicht ein einfacher
 * Aufruf beim Klick statt eines `<form>` mit verstecktem Feld.
 */
export function FormularStatusSchieberegler({
  einreichungId,
  status,
  aktion,
}: {
  einreichungId: string
  status: string
  aktion: (einreichungId: string, status: FormularEinreichungStatus) => void
}) {
  const aktiverIndex = Math.max(0, FORMULAR_STATUS_REIHENFOLGE.indexOf(status as (typeof FORMULAR_STATUS_REIHENFOLGE)[number]))

  function waehlen(neu: FormularEinreichungStatus) {
    if (neu === status) return
    aktion(einreichungId, neu)
  }

  return (
    <div className="relative grid grid-cols-3 rounded-full border border-rand bg-flaeche-schwach p-1 text-xs font-semibold">
      <span
        aria-hidden
        className={
          "absolute inset-y-1 left-1 w-[calc(33.333%-0.1667rem)] rounded-full bg-marke-orange shadow transition-transform " +
          POSITION_KLASSE[aktiverIndex]
        }
      />
      {FORMULAR_STATUS_REIHENFOLGE.map((s) => (
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
          {FORMULAR_STATUS_LABEL[s]}
        </button>
      ))}
    </div>
  )
}
