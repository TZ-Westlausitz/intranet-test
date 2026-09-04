"use client"

import { forwardRef, useImperativeHandle, useRef } from "react"

import type { Person } from "@/components/termin-form-felder"
import { TerminInfoDialog, type TerminInfoDialogHandle } from "@/components/termin-info-dialog"
import { TERMIN_FARBE_KLASSEN } from "@/lib/termin-optionen"
import type { TerminAnzeige } from "@/lib/termine/typen"
import { TerminTeilnahmeStatus } from "@/generated/prisma/enums"

export type TerminDotHandle = { oeffnen: () => void }

/**
 * Ein Termin-Punkt im Kalenderblatt: Hover zeigt Titel + Zeit (natives
 * `title`-Attribut), Klick öffnet das Info-Pop-Up (TerminInfoDialog) — das
 * eigentliche Markup dafür steckt dort, nicht hier, weil dieselbe Vorschau
 * auch aus der Listenübersicht heraus geöffnet werden kann.
 *
 * `forwardRef`/`oeffnen`: Die Kalendertag-Zelle (KalenderTagZelle) öffnet
 * damit denselben Dialog auch, wenn die Tageszahl statt des kleinen
 * Punkts angeklickt oder gehovert wird — größere Trefferfläche, ohne den
 * Dialog-Zustand zu duplizieren.
 */
export const TerminDot = forwardRef<TerminDotHandle, {
  termin: TerminAnzeige
  personen: Person[]
  aktualisierenAktion: (terminId: string, formData: FormData) => void
  loeschenAktion: (terminId: string, formData: FormData) => void
  serieLoeschenAktion: (serieId: string, formData: FormData) => void
  serieAbHierLoeschenAktion: (terminId: string, formData: FormData) => void
  teilnahmeAktion: (terminId: string, status: TerminTeilnahmeStatus) => void
  kommentarAktion: (terminId: string, formData: FormData) => void
  rueckkehrJahr: number
  rueckkehrMonat: number
}>(function TerminDot(
  {
    termin,
    personen,
    aktualisierenAktion,
    loeschenAktion,
    serieLoeschenAktion,
    serieAbHierLoeschenAktion,
    teilnahmeAktion,
    kommentarAktion,
    rueckkehrJahr,
    rueckkehrMonat,
  },
  weitergereichteRef,
) {
  const infoRef = useRef<TerminInfoDialogHandle>(null)

  useImperativeHandle(weitergereichteRef, () => ({
    oeffnen: () => infoRef.current?.oeffnen(),
  }))

  return (
    <>
      <button
        type="button"
        title={`${termin.titel}, ${termin.zeitraumAnzeige}`}
        onClick={() => infoRef.current?.oeffnen()}
        className={"h-1.5 w-1.5 rounded-full " + (TERMIN_FARBE_KLASSEN[termin.farbe] ?? "bg-neutral-400")}
      />

      <TerminInfoDialog
        ref={infoRef}
        termin={termin}
        personen={personen}
        aktualisierenAktion={aktualisierenAktion}
        loeschenAktion={loeschenAktion}
        serieLoeschenAktion={serieLoeschenAktion}
        serieAbHierLoeschenAktion={serieAbHierLoeschenAktion}
        teilnahmeAktion={teilnahmeAktion}
        kommentarAktion={kommentarAktion}
        rueckkehrJahr={rueckkehrJahr}
        rueckkehrMonat={rueckkehrMonat}
      />
    </>
  )
})
