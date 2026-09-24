"use client"

import { useEffect, useRef, useState } from "react"
import { MoreVertical } from "lucide-react"

import { ArtikelBearbeitenDialog, type ArtikelBearbeitenDialogHandle } from "@/components/artikel-bearbeiten-dialog"
import type { ArtikelAnhangAnzeige, ArtikelStandardwerte, ArtikelFormularOptionen } from "@/components/artikel-form-felder"

/**
 * Drei-Punkte-Menü auf einer Artikel-Zeile — "Bearbeiten"/"Löschen", beide
 * nur bei "Wissensmanager" (siehe darfWissenVerwalten). Muster:
 * InfoAktionenMenu, hier ohne getrennte Bearbeiten-/Löschen-Berechtigung —
 * eine einzige Berechtigung gate beides (siehe Kontext im Plan).
 */
export function ArtikelAktionenMenu({
  artikelId,
  darfVerwalten,
  standardwerte,
  optionen,
  bestehendeAnhaenge,
  aktualisierenAktion,
  anhangLoeschenAktion,
  loeschenAktion,
}: {
  artikelId: string
  darfVerwalten: boolean
  standardwerte: ArtikelStandardwerte
  optionen: ArtikelFormularOptionen
  bestehendeAnhaenge: ArtikelAnhangAnzeige[]
  aktualisierenAktion: (artikelId: string, formData: FormData) => void
  anhangLoeschenAktion: (anhangId: string) => void
  loeschenAktion: (artikelId: string) => void
}) {
  const [offen, setOffen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const bearbeitenDialogRef = useRef<ArtikelBearbeitenDialogHandle>(null)

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

  if (!darfVerwalten) return null

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
          <form action={loeschenAktion.bind(null, artikelId)}>
            <button
              type="submit"
              role="menuitem"
              className="block w-full px-4 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50"
            >
              Löschen
            </button>
          </form>
        </div>
      )}

      {/* Immer gemountet (nicht an `offen` gekoppelt), siehe Kommentar in InfoAktionenMenu. */}
      <ArtikelBearbeitenDialog
        ref={bearbeitenDialogRef}
        artikelId={artikelId}
        standardwerte={standardwerte}
        optionen={optionen}
        bestehendeAnhaenge={bestehendeAnhaenge}
        aktualisierenAktion={aktualisierenAktion}
        anhangLoeschenAktion={anhangLoeschenAktion}
      />
    </div>
  )
}
