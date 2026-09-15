"use client"

import { useRef } from "react"

/**
 * Kachel im Dashboard-Design (siehe src/app/page.tsx), die statt zu
 * verlinken ein Pop-Up öffnet — für Bereiche wie Mitglieder/Dokumente, die
 * auf der Projektseite nicht dauerhaft Platz brauchen, sondern nur bei
 * Bedarf verwaltet werden. `vorschau` zeigt auf der Kachel selbst schon
 * das Wichtigste (z. B. die Anzahl), `children` ist der volle Inhalt im
 * Pop-Up.
 */
export function KachelPopup({
  titel,
  akzentKlasse,
  vorschau,
  children,
}: {
  titel: string
  akzentKlasse: string
  vorschau: React.ReactNode
  children: React.ReactNode
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className={
          "flex w-full flex-col items-start justify-between gap-2 rounded-2xl border border-x-rand border-b-rand border-t-4 bg-flaeche p-4 text-left shadow-sm transition hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen focus-visible:outline-offset-2 " +
          akzentKlasse
        }
      >
        <h2 className="text-lg font-semibold text-ueberschrift">{titel}</h2>
        <div className="text-sm text-sekundaer">{vorschau}</div>
      </button>

      <dialog
        ref={dialogRef}
        className="fixed top-1/2 left-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rand bg-flaeche bg-flaeche p-0 shadow-xl backdrop:bg-neutral-900/40"
      >
        <div className="flex items-center justify-between border-b border-rand px-5 py-4">
          <h2 className="text-lg font-semibold text-ueberschrift">{titel}</h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Schließen"
            className="rounded p-1 text-tertiaer transition hover:bg-flaeche-schwach hover:text-primaer"
          >
            ×
          </button>
        </div>
        {/* min-h reserviert Platz für Ausklapplisten (z. B. PersonenAuswahl beim
            Mitglied-Hinzufügen) — ohne das würde eine solche Liste bei wenig
            sonstigem Inhalt vom umgebenden overflow-y-auto abgeschnitten,
            weil sich diese Box sonst eng an den Inhalt anschmiegen würde. */}
        <div className="flex min-h-[22rem] max-h-[75vh] flex-col overflow-y-auto px-5 py-4">{children}</div>
      </dialog>
    </>
  )
}
