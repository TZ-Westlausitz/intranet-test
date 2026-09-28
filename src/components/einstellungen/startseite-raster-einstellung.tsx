"use client"

import { useRef, useState } from "react"
import { X } from "lucide-react"

import { modulEntfernen, modulPlatzieren } from "@/lib/startseite/aktionen"
import {
  STARTSEITE_MODUL_KATALOG,
  belegteZellen,
  modulForm,
  modulName,
  platzierungPasst,
  type StartseiteModulId,
  type StartseitePlatzierung,
} from "@/lib/startseite/raster"

/** Randfarbe je Modul — identisch zur jeweiligen echten Kachel auf der Startseite (Muster: die einzelnen Kachel-Komponenten in src/components/startseite/). */
const RAHMENFARBE: Record<StartseiteModulId, string> = {
  NEWSFEED: "border-t-marke-gruen",
  KALENDER: "border-t-marke-orange",
  AUFGABEN: "border-t-marke-gruen-dunkel",
  WISSENSBEREICH: "border-t-marke-orange",
  FAHRZEUGE: "border-t-marke-gruen",
  TODO_LISTE: "border-t-marke-gruen",
  GEPLANTE_AKTIONEN: "border-t-marke-gruen",
}

/**
 * Die 8 Rasterfelder als kleine, klickbare Skizze — Vorschau der echten
 * Startseiten-Anordnung (Tablet/Desktop, siehe src/app/page.tsx und
 * src/lib/startseite/raster.ts). Belegte Felder zeigen einen farbigen
 * Rand + Modulnamen und ein Kreuz zum Entfernen, leere Felder öffnen per
 * Klick ein Pop-up mit den Modulen, die dort passen. Jede Aktion (Platzieren,
 * Entfernen) speichert sofort — kein separater "Speichern"-Knopf, wie schon
 * bei den übrigen Ein-Klick-Umschaltern im Adminbereich (Muster:
 * WissensOrdnerKachel), deshalb auch ohne FormularAenderungenSchutz.
 */
export function StartseiteRasterEinstellung({ raster }: { raster: StartseitePlatzierung[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [offenePosition, setOffenePosition] = useState<number | null>(null)

  const belegteZellenNachPosition = new Map<number, StartseiteModulId>()
  for (const platzierung of raster) {
    for (const zelle of belegteZellen(platzierung)) belegteZellenNachPosition.set(zelle, platzierung.modul)
  }

  function zelleOeffnen(position: number) {
    setOffenePosition(position)
    dialogRef.current?.showModal()
  }

  const passendeModule =
    offenePosition === null
      ? []
      : STARTSEITE_MODUL_KATALOG.filter(
          (m) => !raster.some((p) => p.modul === m.id) && platzierungPasst(raster, offenePosition, m.id)
        )

  return (
    <>
      <div className="grid grid-cols-4 grid-rows-2 gap-3">
        {Array.from({ length: 8 }, (_, position) => {
          const anchor = raster.find((p) => p.position === position)

          if (anchor) {
            const gross = modulForm(anchor.modul) === "GROSS"
            return (
              <div
                key={position}
                style={gross ? { gridColumn: "span 2", gridRow: "span 2" } : undefined}
                className={`relative flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border border-x-rand border-b-rand border-t-4 ${RAHMENFARBE[anchor.modul]} bg-flaeche p-2 text-center shadow-sm`}
              >
                <form action={modulEntfernen.bind(null, anchor.modul)} className="absolute top-2 right-2">
                  <button
                    type="submit"
                    aria-label={`${modulName(anchor.modul)} entfernen`}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-tertiaer transition hover:bg-red-50 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </form>
                <span className="px-1 text-sm font-semibold text-ueberschrift sm:text-base">{modulName(anchor.modul)}</span>
              </div>
            )
          }

          // Von einem GROSS-Modul (z. B. Newsfeed) mitbelegte Nachbarzelle — eigenes Feld bleibt unsichtbar, die Anker-Zelle deckt sie optisch ab.
          if (belegteZellenNachPosition.has(position)) return null

          return (
            <button
              key={position}
              type="button"
              onClick={() => zelleOeffnen(position)}
              aria-label="Modul für dieses Feld auswählen"
              className="flex aspect-square items-center justify-center rounded-2xl border border-dashed border-flaeche-300 text-3xl text-tertiaer transition hover:border-marke-gruen hover:text-marke-gruen-dunkel"
            >
              +
            </button>
          )
        })}
      </div>

      <dialog
        ref={dialogRef}
        onClose={() => setOffenePosition(null)}
        className="fixed top-1/2 left-1/2 w-full max-w-xs -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rand bg-flaeche p-0 shadow-xl backdrop:bg-neutral-900/40"
      >
        <div className="border-b border-rand px-5 py-4">
          <h2 className="text-lg font-semibold text-ueberschrift">Modul auswählen</h2>
        </div>

        <div className="flex flex-col gap-1 px-3 py-3">
          {passendeModule.length === 0 ? (
            <p className="px-2 py-2 text-sm text-sekundaer">Kein passendes Modul mehr übrig für dieses Feld.</p>
          ) : (
            passendeModule.map((m) => (
              <form
                key={m.id}
                action={modulPlatzieren.bind(null, offenePosition ?? -1, m.id)}
                onSubmit={() => window.setTimeout(() => dialogRef.current?.close(), 0)}
              >
                <button
                  type="submit"
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm text-primaer transition hover:bg-marke-gruen/10"
                >
                  <span>{m.name}</span>
                  {m.form === "GROSS" && <span className="text-xs text-tertiaer">groß (2×2)</span>}
                </button>
              </form>
            ))
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-rand px-5 py-3">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="h-9 rounded-lg px-3 text-sm font-medium text-primaer transition hover:bg-flaeche-100"
          >
            Abbrechen
          </button>
        </div>
      </dialog>
    </>
  )
}
