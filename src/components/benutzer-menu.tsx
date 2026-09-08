"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"

import { abmelden } from "@/lib/auth/aktionen"

/**
 * Ausklappbares Menü (Profil, Admin, Einstellungen, Kontaktstelle,
 * Ausloggen) hinter dem Namen — aus der Kopfleiste herausgelöst, damit
 * dieselbe Funktion auch im festen Desktop-Header (src/app/layout.tsx)
 * verfügbar ist, statt sie dort zu duplizieren.
 *
 * `istAdmin` blendet den Admin-Link aus, wenn die Person keine
 * ADMINISTRATION-Rolle hat — reine Anzeige-Entscheidung wie bei jedem
 * anderen ausgeblendeten Menüpunkt, kein Ersatz für die echte Rechteprüfung
 * (Regel 5): jede Admin-Seite und jede ihrer Server Actions ruft
 * `berechtigung([Rolle.ADMINISTRATION])` selbst noch einmal auf. Optional
 * mit Default `false`, damit bestehende Aufrufe (z. B. die mobile
 * Kopfleiste) unverändert weiterlaufen.
 */
export function BenutzerMenu({ name, istAdmin = false }: { name: string; istAdmin?: boolean }) {
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
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-marke-gruen/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
      >
        {name}
        <span
          aria-hidden
          className={"text-xs transition-transform " + (offen ? "rotate-180" : "")}
        >
          ▾
        </span>
      </button>

      {offen && (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-2 w-44 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
        >
          <Link
            href="/profil"
            role="menuitem"
            onClick={() => setOffen(false)}
            className="block px-4 py-2.5 text-sm text-neutral-600 transition hover:bg-marke-gruen/10"
          >
            Profil
          </Link>

          {istAdmin && (
            <Link
              href="/admin"
              role="menuitem"
              onClick={() => setOffen(false)}
              className="block px-4 py-2.5 text-sm text-neutral-600 transition hover:bg-marke-gruen/10"
            >
              Admin
            </Link>
          )}

          {/* Führt auf eine eigene Übersichtsseite (/einstellungen), nicht
              direkt auf einen Unterpunkt — dort sollen mit der Zeit weitere
              Einstellungsbereiche neben "Nutzeroberfläche" dazukommen. */}
          <Link
            href="/einstellungen"
            role="menuitem"
            onClick={() => setOffen(false)}
            className="block px-4 py-2.5 text-sm text-neutral-600 transition hover:bg-marke-gruen/10"
          >
            Einstellungen
          </Link>

          <span
            role="menuitem"
            aria-disabled="true"
            title="Noch nicht verfügbar"
            className="block cursor-default px-4 py-2.5 text-sm text-neutral-400"
          >
            Kontaktstelle
          </span>

          <form action={abmelden}>
            <button
              type="submit"
              role="menuitem"
              className="block w-full px-4 py-2.5 text-left text-sm text-neutral-600 transition hover:bg-marke-gruen/10"
            >
              Ausloggen
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
