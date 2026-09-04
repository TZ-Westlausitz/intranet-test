"use client"

import { useEffect, useRef, useState } from "react"

import { Unterschriftfeld } from "@/components/unterschriftfeld"

/**
 * Zwei Unterschriften, nacheinander auf demselben Gerät: erst Mieter/in,
 * dann Vermieter/in (Werkstattleiter/in). Verwendet sowohl bei der
 * Nutzungsvereinbarung als auch beim Übergabeprotokoll — beide brauchen
 * genau dasselbe Feldpaar mit denselben Namen.
 *
 * Blockt den Formular-Submit, solange eine der beiden fehlt — über den
 * bewährten Muster hier: verstecktes Ankerfeld + setCustomValidity, damit
 * die native Formularvalidierung greift (siehe zustand-und-vorschaeden.tsx).
 */
export function ZweiUnterschriften() {
  const [mieterLeer, setMieterLeer] = useState(true)
  const [firmaLeer, setFirmaLeer] = useState(true)
  const pruefungRef = useRef<HTMLInputElement>(null)

  const unvollstaendig = mieterLeer || firmaLeer

  useEffect(() => {
    pruefungRef.current?.setCustomValidity(
      unvollstaendig ? "Bitte beide Unterschriften erfassen." : "",
    )
  }, [unvollstaendig])

  return (
    <div className="flex flex-col gap-6">
      <Unterschriftfeld
        name="unterschriftMieter"
        label="1. Unterschrift Mieter/in"
        onGeaendert={setMieterLeer}
      />
      <Unterschriftfeld
        name="unterschriftFirma"
        label="2. Unterschrift Vermieter (Werkstattleiter/in)"
        onGeaendert={setFirmaLeer}
      />
      <input
        ref={pruefungRef}
        type="text"
        defaultValue="ok"
        aria-hidden="true"
        tabIndex={-1}
        className="sr-only"
      />
    </div>
  )
}
