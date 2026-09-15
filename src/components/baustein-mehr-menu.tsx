"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"

import type { BausteinUnterpunkt } from "@/lib/bausteine"

/**
 * Dropdown für einen Sammelpunkt wie "Weiteres" in der Desktop-Kopfzeile
 * (src/components/bausteine-leiste.tsx) — dasselbe
 * Klick-außerhalb-schließt-Muster wie MobilesMenu, hier aber als schmales
 * Dropdown unter einem einzelnen Menüpunkt statt als große Liste.
 *
 * `aktiv`/`adminModusAktiv` steuern dieselbe Bubble-nur-wenn-aktiv-Regel
 * wie die übrigen Bausteine-Punkte (siehe BausteineLeiste) — `aktiv` ist
 * hier true, sobald einer der Unterpunkte der aktuellen Seite entspricht.
 */
export function BausteinMehrMenu({
  name,
  unterpunkte,
  aktiv,
  adminModusAktiv,
}: {
  name: string
  unterpunkte: BausteinUnterpunkt[]
  aktiv: boolean
  adminModusAktiv: boolean
}) {
  const [offen, setOffen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const textFarbe = adminModusAktiv ? "text-marke-orange" : "text-marke-gruen-dunkel"
  const bubbleAktiv = adminModusAktiv ? "bg-marke-orange/20" : "bg-marke-gruen/15"
  const bubbleHover = adminModusAktiv ? "hover:bg-marke-orange/10" : "hover:bg-marke-gruen/10"

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

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOffen((v) => !v)}
        aria-expanded={offen}
        aria-haspopup="menu"
        className={
          "flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold transition " +
          textFarbe +
          " " +
          (aktiv ? bubbleAktiv : bubbleHover)
        }
      >
        {name}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={"h-3 w-3 transition-transform " + (offen ? "rotate-180" : "")}
          aria-hidden
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {offen && (
        <div
          role="menu"
          className="absolute left-0 z-10 mt-1.5 w-48 overflow-hidden rounded-lg border border-rand bg-flaeche py-1 shadow-lg"
        >
          {unterpunkte.map((punkt) => (
            <Link
              key={punkt.name}
              href={punkt.href}
              role="menuitem"
              onClick={() => setOffen(false)}
              className="block px-4 py-2 text-sm font-medium text-primaer transition hover:bg-marke-gruen/10"
            >
              {punkt.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
