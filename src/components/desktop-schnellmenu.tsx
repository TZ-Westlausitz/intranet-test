"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

type Schnellaktion = { name: string; href: string; icon: React.ReactNode }

// Dieselbe Seitenliste und -begründung wie im mobilen Schnellmenü (siehe
// MobileSchnellmenu, Rückmeldung 2026-09-16, "/formulare" ergänzt
// 2026-09-22): Auf Profil/Abrechnung/Kontakte/Fahrzeuge passt keine der
// Optionen, ein schwebendes Element verdeckt dort nur echten Inhalt statt
// zu helfen — auf dem Desktop gilt dieselbe Abwägung, deshalb dieselbe
// Liste statt einer eigenen.
const RELEVANTE_PFADE = ["/newsfeed", "/aufgaben", "/kalender", "/chat", "/formulare"]

function schnellmenuRelevant(pathname: string): boolean {
  if (pathname === "/") return true
  return RELEVANTE_PFADE.some((praefix) => pathname === praefix || pathname.startsWith(praefix + "/"))
}

const ICON_KLASSE = "h-4.5 w-4.5"

const AUFGABE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={ICON_KLASSE} aria-hidden>
    <path d="M9 11l2.5 2.5L16 8.5" />
    <rect x="4" y="4" width="16" height="16" rx="3" />
  </svg>
)
const INFO_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={ICON_KLASSE} aria-hidden>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5.5" />
    <circle cx="12" cy="8" r="0.75" fill="currentColor" stroke="none" />
  </svg>
)
const FORMULAR_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={ICON_KLASSE} aria-hidden>
    <path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7 3.5Z" />
    <path d="M9.5 12h5M9.5 15.5h5" />
  </svg>
)
const TERMIN_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={ICON_KLASSE} aria-hidden>
    <rect x="4" y="5" width="16" height="15" rx="2" />
    <path d="M4 9.5h16M8 3.5v3M16 3.5v3" />
  </svg>
)

/**
 * Schwebendes "+" für den Desktop (Rückmeldung 2026-09-18) — dieselben
 * Ziele wie im mobilen Schnellmenü (MobileSchnellmenu), global im
 * Root-Layout gerendert (wie ChatWidget/MobileSchnellmenu), aber per
 * `schnellmenuRelevant()` auf dieselben Seiten begrenzt wie mobil.
 * Erster Anlauf saß unten links: zu unauffällig UND dort von
 * Browser-Erweiterungen teils verdeckt (Rückmeldung), deshalb jetzt
 * rechts UNTEN, direkt über ChatWidget gestapelt (bottom-24 statt dessen
 * bottom-4 — ChatWidget bleibt dabei unverändert an seinem Platz), mit
 * derselben Größe/Sichtbarkeit wie die Chat-Sprechblase (voll
 * eingefärbter Kreis statt nur Rahmen), nur in Orange statt Grün, damit
 * beide auf einen Blick unterscheidbar bleiben.
 *
 * "+ Chat" fehlt hier deshalb bewusst (anders als mobil): Ein Chat direkt
 * daneben zu starten wäre auf dem Desktop redundant zur ohnehin
 * sichtbaren Chat-Sprechblase.
 *
 * "+ Aufgabe" seit 2026-09-23 an die Berechtigung "Aufgaben" geknüpft
 * (dasselbe Muster wie "+ Info"/"Infos") — Auftrag an eine andere Person
 * zuweisen ist jetzt kein offener Vorgang mehr, siehe auftragErstellen.
 */
export function DesktopSchnellmenu({
  darfInfo,
  darfAufgabeZuweisen,
}: {
  darfInfo: boolean
  darfAufgabeZuweisen: boolean
}) {
  const pathname = usePathname()
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

  const aktionen: Schnellaktion[] = [
    ...(darfInfo ? [{ name: "Info", href: "/newsfeed?neu=1", icon: INFO_ICON }] : []),
    { name: "Formular", href: "/formulare", icon: FORMULAR_ICON },
    ...(darfAufgabeZuweisen ? [{ name: "Aufgabe", href: "/aufgaben?neu=1", icon: AUFGABE_ICON }] : []),
    { name: "Termin", href: "/kalender?neu=1", icon: TERMIN_ICON },
  ]

  if (!schnellmenuRelevant(pathname)) return null

  return (
    <div ref={containerRef} className="fixed right-4 bottom-24 z-30 hidden flex-col items-end gap-2 md:flex">
      {offen && (
        <div className="flex flex-col items-end gap-2">
          {aktionen.map((aktion) => (
            <Link
              key={aktion.name}
              href={aktion.href}
              onClick={() => setOffen(false)}
              className="flex items-center gap-2 rounded-full border border-rand bg-flaeche py-2 pr-4 pl-3 text-sm font-medium text-primaer shadow-md transition hover:border-marke-orange hover:text-ueberschrift"
            >
              {aktion.icon}
              {aktion.name}
            </Link>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOffen((v) => !v)}
        aria-expanded={offen}
        aria-label={offen ? "Schnellmenü schließen" : "Schnellmenü öffnen"}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-marke-orange text-neutral-900 shadow-lg transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marke-orange"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          className={"h-6 w-6 transition-transform " + (offen ? "rotate-45" : "")}
          aria-hidden
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  )
}
