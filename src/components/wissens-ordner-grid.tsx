"use client"

import { useState } from "react"

import { WissensOrdnerKachel } from "@/components/wissens-ordner-kachel"

type OrdnerEintrag = { id: string; name: string; aktiv: boolean; artikelAnzahl: number }

/**
 * Ordner-Grid mit Suchfeld — client-seitiger Namensfilter, kein
 * Server-Roundtrip nötig (Übersichtlichkeit bei vielen Ordnern, siehe
 * Kontext im Plan).
 */
export function WissensOrdnerGrid({
  ordner,
  hrefPraefix,
  darfVerwalten,
  umbenennenAktion,
  aktivSetzenAktion,
}: {
  ordner: OrdnerEintrag[]
  hrefPraefix: string
  darfVerwalten: boolean
  umbenennenAktion: (id: string, formData: FormData) => void
  aktivSetzenAktion: (id: string, aktiv: boolean) => void
}) {
  const [suchtext, setSuchtext] = useState("")
  const gefiltert = ordner.filter((o) => o.name.toLowerCase().includes(suchtext.toLowerCase()))

  return (
    <div>
      <input
        type="text"
        value={suchtext}
        onChange={(ereignis) => setSuchtext(ereignis.target.value)}
        placeholder="Ordner suchen …"
        className="h-9 w-full max-w-xs rounded-lg border border-neutral-300 px-2 text-sm"
      />

      {gefiltert.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-500">Keine Ordner gefunden.</p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {gefiltert.map((o) => (
            <WissensOrdnerKachel
              key={o.id}
              id={o.id}
              href={`${hrefPraefix}/${o.id}`}
              name={o.name}
              aktiv={o.aktiv}
              artikelAnzahl={o.artikelAnzahl}
              darfVerwalten={darfVerwalten}
              umbenennenAktion={umbenennenAktion}
              aktivSetzenAktion={aktivSetzenAktion}
            />
          ))}
        </div>
      )}
    </div>
  )
}
