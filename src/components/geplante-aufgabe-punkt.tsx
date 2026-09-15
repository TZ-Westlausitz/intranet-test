"use client"

import { forwardRef, useImperativeHandle, useRef } from "react"

import { AufgabeBearbeitenDialog } from "@/components/aufgabe-bearbeiten-dialog"
import { aufgabeZuStandardwerte, type AufgabeAnhangAnzeige } from "@/components/aufgabe-form-felder"
import type { GeplanteAktionPunktHandle } from "@/components/geplante-aktion-punkt"
import { formatiereDatumAusDate } from "@/lib/datum"
import type { aufgabenGeplantFuerZeitraum } from "@/lib/aufgaben/abfragen"

type GeplanteAufgabe = Awaited<ReturnType<typeof aufgabenGeplantFuerZeitraum>>[number]

/**
 * Ein Punkt im Kalenderblatt "Geplante Aktionen" für eine Aufgabe — Muster:
 * GeplanteAktionPunkt (für Infos), aber schlanker: AufgabeBearbeitenDialog
 * hat schon einen EIGENEN sichtbaren Auslöser (Stift-Knopf) und braucht
 * kein `forwardRef`, kann also direkt im Popup eingebettet werden statt
 * separat angesteuert zu werden. Blauer Punkt statt orange — unterscheidet
 * Aufgaben optisch von Infos im selben Tageskästchen.
 *
 * Anders als beim Info-Pendant leitet `loeschenAktion` (aufgabeLoeschen)
 * nach dem Löschen NICHT um — die Seite bleibt einfach hier stehen.
 */
export const GeplanteAufgabePunkt = forwardRef<
  GeplanteAktionPunktHandle,
  {
    aufgabe: GeplanteAufgabe
    aktualisierenAktion: (aufgabeId: string, formData: FormData) => void
    anhangLoeschenAktion: (anhangId: string) => void
    loeschenAktion: (aufgabeId: string) => void
  }
>(function GeplanteAufgabePunkt({ aufgabe, aktualisierenAktion, anhangLoeschenAktion, loeschenAktion }, weitergereichteRef) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useImperativeHandle(weitergereichteRef, () => ({
    oeffnen: () => dialogRef.current?.showModal(),
  }))

  const bestehendeAnhaenge: AufgabeAnhangAnzeige[] = aufgabe.anhaenge

  return (
    <>
      <button
        type="button"
        title={`${aufgabe.titel}, geplant für ${aufgabe.geplantAm ? formatiereDatumAusDate(aufgabe.geplantAm) : ""}`}
        onClick={() => dialogRef.current?.showModal()}
        className="h-1.5 w-1.5 rounded-full bg-blue-500"
      />

      <dialog
        ref={dialogRef}
        className="fixed top-1/2 left-1/2 w-full max-w-xs -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rand bg-flaeche p-0 shadow-xl backdrop:bg-neutral-900/40"
      >
        <div className="px-5 py-4">
          <p className="text-sm font-semibold text-ueberschrift">{aufgabe.titel}</p>
          <p className="mt-1 text-xs text-sekundaer">
            🕒 Geplant für {aufgabe.geplantAm && formatiereDatumAusDate(aufgabe.geplantAm)}
          </p>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-rand px-5 py-3">
          <div className="flex items-center gap-1">
            <AufgabeBearbeitenDialog
              aufgabeId={aufgabe.id}
              standardwerte={aufgabeZuStandardwerte(aufgabe)}
              bestehendeAnhaenge={bestehendeAnhaenge}
              aktualisierenAktion={aktualisierenAktion}
              anhangLoeschenAktion={anhangLoeschenAktion}
            />
            <form action={loeschenAktion.bind(null, aufgabe.id)}>
              <button
                type="submit"
                className="rounded p-1 text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                Löschen
              </button>
            </form>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="h-9 rounded-lg px-3 text-sm font-medium text-primaer transition hover:bg-flaeche-100"
          >
            Schließen
          </button>
        </div>
      </dialog>
    </>
  )
})
