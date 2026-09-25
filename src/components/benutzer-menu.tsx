"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"

import { AdminModusSchalter } from "@/components/admin-modus-schalter"
import { abmelden } from "@/lib/auth/aktionen"

/**
 * Ausklappbares Menü (Profil, Admin, Einstellungen, Kontaktstelle,
 * Ausloggen) hinter dem Namen — aus der Kopfleiste herausgelöst, damit
 * dieselbe Funktion auch im festen Desktop-Header (src/app/layout.tsx)
 * verfügbar ist, statt sie dort zu duplizieren.
 *
 * `istAdmin` blendet den Admin-Link aus, wenn die Person die Berechtigung
 * "Adminbereich" nicht hat — reine Anzeige-Entscheidung wie bei jedem
 * anderen ausgeblendeten Menüpunkt, kein Ersatz für die echte Rechteprüfung
 * (Regel 5): jede Admin-Seite und jede ihrer Server Actions ruft
 * `berechtigung({ benoetigteBerechtigung: "Adminbereich" })` selbst noch
 * einmal auf. Optional
 * mit Default `false`, damit bestehende Aufrufe (z. B. die mobile
 * Kopfleiste) unverändert weiterlaufen.
 *
 * `adminModusAktiv` färbt die Hover-Akzente orange statt grün, solange der
 * Admin-Modus an ist (siehe AdminModusSchalter) — dieselbe Erinnerung wie
 * die orange Baustein-Leiste im Root-Layout. Ebenfalls optional mit
 * Default `false`, nur die Desktop-Kopfzeile setzt ihn.
 *
 * `adminModusSchalterImMenu`: nur für Personen mit der Berechtigung "Admin".
 * Zeigt den Admin-Modus-Schalter im Menü — aber nur im Hochformat (Tablet
 * aufrecht), wo die Bausteine-Leiste keinen Platz mehr dafür hat und der
 * Schalter dort ausgeblendet wird (siehe layout.tsx). Im Querformat bleibt
 * er in der Leiste, dieser Eintrag ist dann per CSS unsichtbar.
 */
export function BenutzerMenu({
  name,
  istAdmin = false,
  adminModusAktiv = false,
  adminModusSchalterImMenu = false,
}: {
  name: string
  istAdmin?: boolean
  adminModusAktiv?: boolean
  adminModusSchalterImMenu?: boolean
}) {
  const [offen, setOffen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const hoverAkzent = adminModusAktiv ? "hover:bg-marke-orange/10" : "hover:bg-marke-gruen/10"

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
          "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-primaer transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen " +
          hoverAkzent
        }
      >
        {name}
        <span
          aria-hidden
          className={"transition-transform " + (offen ? "rotate-180" : "")}
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </span>
      </button>

      {offen && (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-2 w-44 overflow-hidden rounded-lg border border-rand bg-flaeche py-1 shadow-lg"
        >
          <Link
            href="/profil"
            role="menuitem"
            onClick={() => setOffen(false)}
            className={"block px-4 py-2.5 text-sm text-primaer transition " + hoverAkzent}
          >
            Profil
          </Link>

          {istAdmin && (
            <Link
              href="/admin"
              role="menuitem"
              onClick={() => setOffen(false)}
              className={"block px-4 py-2.5 text-sm text-primaer transition " + hoverAkzent}
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
            className={"block px-4 py-2.5 text-sm text-primaer transition " + hoverAkzent}
          >
            Einstellungen
          </Link>

          <Link
            href="/kontaktstelle"
            role="menuitem"
            onClick={() => setOffen(false)}
            className={"block px-4 py-2.5 text-sm text-primaer transition " + hoverAkzent}
          >
            Kontaktstelle
          </Link>

          {adminModusSchalterImMenu && (
            <div className="hidden border-t border-rand px-2 py-2.5 portrait:block">
              <AdminModusSchalter aktiv={adminModusAktiv} />
            </div>
          )}

          <form action={abmelden}>
            <button
              type="submit"
              role="menuitem"
              className={"block w-full px-4 py-2.5 text-left text-sm text-primaer transition " + hoverAkzent}
            >
              Ausloggen
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
