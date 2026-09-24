"use client"

import { useEffect, useRef, useState } from "react"
import { MoreVertical } from "lucide-react"

import { InfoBearbeitenDialog, type InfoBearbeitenDialogHandle } from "@/components/info-bearbeiten-dialog"
import type { InfoAnhangAnzeige, InfoStandardwerte, InfoFormularOptionen } from "@/components/info-form-felder"

/**
 * Drei-Punkte-Menü oben rechts auf einer Info-Karte/-Detailseite —
 * "Bearbeiten"/"Löschen", je nach Berechtigung (siehe darfInfoBearbeiten/
 * darfInfoLoeschen in src/lib/infos/sichtbarkeit.ts). Rendert NICHTS, wenn
 * weder das eine noch das andere zutrifft — bewusst nicht auf der
 * Startseiten-Kachel eingebunden (nur Vorschau dort).
 *
 * Klick-außen-schließt-Menü analog zu BenutzerMenu
 * (src/components/benutzer-menu.tsx). `stopPropagation`/`preventDefault`
 * überall wichtig: dieses Menü sitzt neben dem Knopf, der die Info als
 * Pop-up öffnet (siehe InfoAnzeigenDialog) — ein Klick auf den Knopf oder
 * einen Menüpunkt hier darf das Pop-up nicht zusätzlich mit öffnen.
 */
export function InfoAktionenMenu({
  infoId,
  darfBearbeiten,
  darfLoeschen,
  standardwerte,
  optionen,
  bestehendeAnhaenge,
  aktualisierenAktion,
  anhangLoeschenAktion,
  loeschenAktion,
}: {
  infoId: string
  darfBearbeiten: boolean
  darfLoeschen: boolean
  standardwerte?: InfoStandardwerte
  optionen?: InfoFormularOptionen
  bestehendeAnhaenge?: InfoAnhangAnzeige[]
  aktualisierenAktion: (infoId: string, formData: FormData) => void
  anhangLoeschenAktion: (anhangId: string) => void
  loeschenAktion: (infoId: string) => void
}) {
  const [offen, setOffen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const bearbeitenDialogRef = useRef<InfoBearbeitenDialogHandle>(null)

  useEffect(() => {
    if (!offen) return

    function beiKlickAussen(ereignis: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(ereignis.target as Node)) {
        setOffen(false)
      }
    }

    document.addEventListener("mousedown", beiKlickAussen)
    return () => document.removeEventListener("mousedown", beiKlickAussen)
  }, [offen])

  if (!darfBearbeiten && !darfLoeschen) return null

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={(ereignis) => {
          ereignis.preventDefault()
          ereignis.stopPropagation()
          setOffen((v) => !v)
        }}
        aria-label="Aktionen"
        aria-expanded={offen}
        aria-haspopup="menu"
        className="flex h-8 w-8 items-center justify-center rounded-full text-tertiaer transition hover:bg-flaeche-100 hover:text-primaer"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {offen && (
        <div
          role="menu"
          onClick={(ereignis) => ereignis.stopPropagation()}
          className="absolute right-0 z-10 mt-1 w-36 overflow-hidden rounded-lg border border-rand bg-flaeche py-1 shadow-lg"
        >
          {darfBearbeiten && standardwerte && optionen && (
            <button
              type="button"
              role="menuitem"
              onClick={(ereignis) => {
                ereignis.preventDefault()
                setOffen(false)
                bearbeitenDialogRef.current?.oeffnen()
              }}
              className="block w-full px-4 py-2.5 text-left text-sm text-primaer transition hover:bg-marke-gruen/10"
            >
              Bearbeiten
            </button>
          )}
          {darfLoeschen && (
            <form action={loeschenAktion.bind(null, infoId)}>
              <button
                type="submit"
                role="menuitem"
                className="block w-full px-4 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50"
              >
                Löschen
              </button>
            </form>
          )}
        </div>
      )}

      {/* Immer gemountet (nicht an `offen` gekoppelt) — würde sonst beim
          Schließen des Menüs (setOffen(false) beim Klick auf "Bearbeiten")
          sofort wieder aus dem DOM entfernt, noch bevor showModal() greift. */}
      {darfBearbeiten && standardwerte && optionen && (
        <InfoBearbeitenDialog
          ref={bearbeitenDialogRef}
          infoId={infoId}
          standardwerte={standardwerte}
          optionen={optionen}
          bestehendeAnhaenge={bestehendeAnhaenge ?? []}
          aktualisierenAktion={aktualisierenAktion}
          anhangLoeschenAktion={anhangLoeschenAktion}
        />
      )}
    </div>
  )
}
