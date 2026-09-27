"use client"

import { useEffect, useRef } from "react"

import { formatiereDatumAusDate } from "@/lib/datum"

export type OffenerTerminvorschlag = {
  id: string
  art: string
  artText: string
  datum: Date
  fahrzeugText: string
  vorgeschlagenVonName: string
  /** Nur der Empfänger (Halter) darf annehmen/ablehnen — die Werkstatt sieht die Karte nur informativ. */
  darfEntscheiden: boolean
}

/**
 * Ein offener Terminvorschlag (TÜV/Service/Reifenwechsel) als Karte —
 * einmal inline in der Liste "Offene Terminvorschläge" (immer sichtbar, für
 * den Fall, dass die Benachrichtigung übersehen oder das Pop-up
 * weggeklickt wurde), und per `autoOeffnen` zusätzlich als Pop-up, das sich
 * öffnet, sobald man über den Link aus der Benachrichtigung
 * (`?vorschlag=...`) auf der Seite landet — dasselbe Muster wie
 * NewsfeedListe/`initialInfoId` für Info-Pop-ups.
 */
export function TerminvorschlagKarte({
  vorschlag,
  annehmenAktion,
  neuenTerminAktion,
  autoOeffnen = false,
}: {
  vorschlag: OffenerTerminvorschlag
  annehmenAktion: (vorschlagId: string) => Promise<void>
  neuenTerminAktion: (vorschlagId: string) => Promise<void>
  autoOeffnen?: boolean
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (autoOeffnen) dialogRef.current?.showModal()
    // Nur beim ersten Laden der Seite automatisch öffnen, nicht bei jedem Re-Render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const inhalt = (
    <>
      <p className="font-medium text-ueberschrift">
        {vorschlag.artText} <span className="font-normal text-tertiaer">· {vorschlag.fahrzeugText}</span>
      </p>
      <p className="text-sm text-primaer">
        Vorschlag von {vorschlag.vorgeschlagenVonName}: {formatiereDatumAusDate(vorschlag.datum)}
      </p>
      {vorschlag.darfEntscheiden && (
        <div className="mt-2 flex gap-2">
          <form action={annehmenAktion.bind(null, vorschlag.id)}>
            <button
              type="submit"
              className="h-8 rounded-lg bg-marke-gruen px-3 text-xs font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
            >
              Termin annehmen
            </button>
          </form>
          <form action={neuenTerminAktion.bind(null, vorschlag.id)}>
            <button
              type="submit"
              className="h-8 rounded-lg bg-flaeche-100 px-3 text-xs font-medium text-primaer transition hover:bg-flaeche-200"
            >
              Neuen Termin suchen
            </button>
          </form>
        </div>
      )}
    </>
  )

  return (
    <>
      <li className="rounded-lg border border-marke-orange px-3 py-2 text-sm">{inhalt}</li>

      {autoOeffnen && vorschlag.darfEntscheiden && (
        <dialog
          ref={dialogRef}
          className="fixed top-1/2 left-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rand bg-flaeche p-0 shadow-xl backdrop:bg-neutral-900/40"
        >
          <div className="flex flex-col gap-3 px-5 py-5">
            <h2 className="text-lg font-semibold text-ueberschrift">Terminvorschlag</h2>
            {inhalt}
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="mt-1 h-9 w-fit rounded-lg px-3 text-sm font-medium text-sekundaer transition hover:bg-flaeche-100"
            >
              Später entscheiden
            </button>
          </div>
        </dialog>
      )}
    </>
  )
}
