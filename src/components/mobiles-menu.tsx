"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"

import { BAUSTEINE } from "@/lib/bausteine"

/**
 * Drei-Striche-Menü neben dem Logo auf dem Handy — klappt dieselben
 * Bausteine auf, die auf dem Desktop als Kopfzeilenmenü nebeneinander
 * stehen (src/app/layout.tsx), hier aber Punkt für Punkt untereinander.
 * Eigenständig von BenutzerMenu (Profil/Kontaktstelle/Ausloggen), das
 * weiterhin rechts oben bleibt.
 */
export function MobilesMenu() {
  const [offen, setOffen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

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
        aria-label="Menü öffnen"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 transition hover:bg-marke-gruen/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="h-5 w-5" aria-hidden>
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {offen && (
        <div
          role="menu"
          className="absolute left-0 z-10 mt-2 w-56 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
        >
          {BAUSTEINE.map((baustein) =>
            baustein.unterpunkte ? (
              // Kein zweites, ineinander geschachteltes Ausklappen auf dem
              // Handy — das Menü selbst ist ja schon offen, die Unterpunkte
              // stehen deshalb direkt eingerückt darunter.
              <div key={baustein.name} className="border-t border-neutral-100 py-1">
                <span className="block px-4 pt-1 pb-1.5 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                  {baustein.name}
                </span>
                {baustein.unterpunkte.map((punkt) => (
                  <Link
                    key={punkt.name}
                    href={punkt.href}
                    role="menuitem"
                    onClick={() => setOffen(false)}
                    className="block px-4 py-2.5 text-sm font-semibold text-marke-gruen-dunkel transition hover:bg-marke-gruen/10"
                  >
                    {punkt.name}
                  </Link>
                ))}
              </div>
            ) : baustein.href ? (
              <Link
                key={baustein.name}
                href={baustein.href}
                role="menuitem"
                onClick={() => setOffen(false)}
                className="block px-4 py-2.5 text-sm font-semibold text-marke-gruen-dunkel transition hover:bg-marke-gruen/10"
              >
                {baustein.name}
              </Link>
            ) : (
              <span
                key={baustein.name}
                role="menuitem"
                aria-disabled="true"
                title="Noch nicht verfügbar"
                className="block cursor-default px-4 py-2.5 text-sm text-neutral-400"
              >
                {baustein.name}
              </span>
            ),
          )}
        </div>
      )}
    </div>
  )
}
