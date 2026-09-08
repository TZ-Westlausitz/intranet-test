"use client"

import { forwardRef, useImperativeHandle, useRef } from "react"

import type { GeplanteAktionPunktHandle } from "@/components/geplante-aktion-punkt"
import { formatiereDatumAusDate } from "@/lib/datum"
import type { auftraegeGeplantFuerZeitraum } from "@/lib/auftraege/abfragen"

type GeplanterAuftrag = Awaited<ReturnType<typeof auftraegeGeplantFuerZeitraum>>[number]

/**
 * Ein Punkt im Kalenderblatt "Geplante Aktionen" für einen Auftrag —
 * Muster: GeplanteAufgabePunkt, aber noch schlanker: `Auftrag` hat KEINE
 * Bearbeiten-Aktion (bewusst so gebaut, siehe Kommentar am Model), das
 * Popup zeigt deshalb nur Titel/Termin/Empfänger + Löschen. Violetter
 * Punkt — dritte Farbe neben orange (Info) und blau (Aufgabe).
 */
export const GeplanteAuftragPunkt = forwardRef<
  GeplanteAktionPunktHandle,
  {
    auftrag: GeplanterAuftrag
    loeschenAktion: (auftragId: string) => void
  }
>(function GeplanteAuftragPunkt({ auftrag, loeschenAktion }, weitergereichteRef) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useImperativeHandle(weitergereichteRef, () => ({
    oeffnen: () => dialogRef.current?.showModal(),
  }))

  return (
    <>
      <button
        type="button"
        title={`${auftrag.titel}, geplant für ${auftrag.geplantAm ? formatiereDatumAusDate(auftrag.geplantAm) : ""}`}
        onClick={() => dialogRef.current?.showModal()}
        className="h-1.5 w-1.5 rounded-full bg-violet-500"
      />

      <dialog
        ref={dialogRef}
        className="fixed top-1/2 left-1/2 w-full max-w-xs -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-200 p-0 shadow-xl backdrop:bg-neutral-900/40"
      >
        <div className="px-5 py-4">
          <p className="text-sm font-semibold text-marke-grau">{auftrag.titel}</p>
          <p className="mt-1 text-xs text-neutral-500">
            🕒 Geplant für {auftrag.geplantAm && formatiereDatumAusDate(auftrag.geplantAm)}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Zugewiesen an {auftrag.zugewiesenAn.vorname} {auftrag.zugewiesenAn.nachname}
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-neutral-200 px-5 py-3">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="h-9 rounded-lg px-3 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100"
          >
            Schließen
          </button>
          <form action={loeschenAktion.bind(null, auftrag.id)}>
            <button
              type="submit"
              className="h-9 rounded-lg px-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              Löschen
            </button>
          </form>
        </div>
      </dialog>
    </>
  )
})
