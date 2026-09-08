"use client"

import { forwardRef, useImperativeHandle, useRef } from "react"

import { InfoBearbeitenDialog, type InfoBearbeitenDialogHandle } from "@/components/info-bearbeiten-dialog"
import { infoZuStandardwerte, type InfoAnhangAnzeige, type InfoFormularOptionen } from "@/components/info-form-felder"
import { formatiereDatumAusDate, zeitAusDate } from "@/lib/datum"
import type { infosGeplantFuerZeitraum } from "@/lib/infos/abfragen"

export type GeplanteAktionPunktHandle = { oeffnen: () => void }

type GeplanteInfo = Awaited<ReturnType<typeof infosGeplantFuerZeitraum>>[number]

/**
 * Ein Punkt im Kalenderblatt "Geplante Aktionen" — Muster: TerminDot, aber
 * ohne Teilnehmer/Serie/Kommentare (die Info hat das nicht). Öffnet ein
 * kleines Popup mit Titel + Veröffentlichungstermin und, je nach
 * Berechtigung, Bearbeiten/Löschen.
 *
 * Bewusst KEIN eingebettetes InfoAktionenMenu (das wäre ein Menü-Knopf IN
 * einem schon geöffneten Popup, ein überflüssiger Klick mehr) — die paar
 * Zeilen Knopf-Markup hier sind ein eigener visueller Kontext
 * (Kalender-Popup statt Karten-Ecke) und rechtfertigen die kleine Dopplung
 * gegenüber InfoAktionenMenu. Bearbeiten öffnet trotzdem denselben,
 * unveränderten InfoBearbeitenDialog; Löschen ruft dieselbe infoLoeschen-
 * Aktion wie im Newsfeed auf (die danach wie gewohnt auf /newsfeed
 * umleitet).
 */
export const GeplanteAktionPunkt = forwardRef<
  GeplanteAktionPunktHandle,
  {
    info: GeplanteInfo
    optionen: InfoFormularOptionen
    aktualisierenAktion: (infoId: string, formData: FormData) => void
    anhangLoeschenAktion: (anhangId: string) => void
    loeschenAktion: (infoId: string) => void
  }
>(function GeplanteAktionPunkt({ info, optionen, aktualisierenAktion, anhangLoeschenAktion, loeschenAktion }, weitergereichteRef) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const bearbeitenRef = useRef<InfoBearbeitenDialogHandle>(null)

  useImperativeHandle(weitergereichteRef, () => ({
    oeffnen: () => dialogRef.current?.showModal(),
  }))

  const bestehendeAnhaenge: InfoAnhangAnzeige[] = info.anhaenge

  return (
    <>
      <button
        type="button"
        title={`${info.titel}, ${formatiereDatumAusDate(info.veroeffentlichtAm)} · ${zeitAusDate(info.veroeffentlichtAm)}`}
        onClick={() => dialogRef.current?.showModal()}
        className="h-1.5 w-1.5 rounded-full bg-marke-orange"
      />

      <dialog
        ref={dialogRef}
        className="fixed top-1/2 left-1/2 w-full max-w-xs -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-200 p-0 shadow-xl backdrop:bg-neutral-900/40"
      >
        <div className="px-5 py-4">
          <p className="text-sm font-semibold text-marke-grau">{info.titel}</p>
          <p className="mt-1 text-xs text-neutral-500">
            🕒 Geplant für {formatiereDatumAusDate(info.veroeffentlichtAm)}, {zeitAusDate(info.veroeffentlichtAm)} Uhr
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
          {info.darfLoeschen && (
            <form action={loeschenAktion.bind(null, info.id)}>
              <button
                type="submit"
                className="h-9 rounded-lg px-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
              >
                Löschen
              </button>
            </form>
          )}
          {info.darfBearbeiten && (
            <button
              type="button"
              onClick={() => {
                dialogRef.current?.close()
                bearbeitenRef.current?.oeffnen()
              }}
              className="h-9 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
            >
              Bearbeiten
            </button>
          )}
        </div>
      </dialog>

      {info.darfBearbeiten && (
        <InfoBearbeitenDialog
          ref={bearbeitenRef}
          infoId={info.id}
          standardwerte={infoZuStandardwerte(info)}
          optionen={optionen}
          bestehendeAnhaenge={bestehendeAnhaenge}
          aktualisierenAktion={aktualisierenAktion}
          anhangLoeschenAktion={anhangLoeschenAktion}
        />
      )}
    </>
  )
})
