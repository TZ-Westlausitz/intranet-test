"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

type Schnellaktion = { name: string; href: string; icon: React.ReactNode }

// Nur auf den Seiten zeigen, zu denen mindestens eine der fünf
// Schnellerstellen-Optionen wirklich passt (Rückmeldung 2026-09-16: auf
// Seiten wie Profil/Abrechnung/Kontakte/Fahrzeuge ergab keine der Optionen
// Sinn, und das schwebende "+" verdeckte dort teils echten Inhalt, z. B.
// das "Gemeldet am"-Datum auf /abrechnung oder Kalendertage). Dasselbe
// Präfix-Muster wie MobileTabBar/istAktiv, deshalb gilt "/aufgaben" auch
// für /aufgaben/projekte. "/formulare" ergänzt
// (Rückmeldung 2026-09-22) — auf der Formularübersicht selbst macht das
// Schnellmenü genauso Sinn wie auf den anderen Baustein-Seiten.
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
const CHAT_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={ICON_KLASSE} aria-hidden>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
)
const TERMIN_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={ICON_KLASSE} aria-hidden>
    <rect x="4" y="5" width="16" height="15" rx="2" />
    <path d="M4 9.5h16M8 3.5v3M16 3.5v3" />
  </svg>
)

/**
 * Schwebendes "+" unten rechts auf dem Handy (Rückmeldung 2026-09-15,
 * Vorbild app.ueberblick.io) — klappt zu den Schnellerstellen-Zielen auf,
 * "sofern man Berechtigungen dafür hat" (Zitat der Rückmeldung): "+ Info"
 * ist an die Berechtigung "Infos" geknüpft (dieselbe wie der "+ Info"-Knopf
 * im Newsfeed selbst), "+ Aufgabe" seit 2026-09-23 an "Aufgaben" (Auftrag an
 * eine andere Person zuweisen, siehe auftragErstellen) — die übrigen drei
 * sind für jede angemeldete Person offen, genau wie ihre jeweiligen Knöpfe
 * auf /kalender und /chat es schon sind.
 *
 * Jeder Punkt navigiert zur jeweiligen Baustein-Seite mit `?neu=1` in der
 * URL, statt das Formular hier einzubetten — die Seite selbst reicht das
 * als `autoOeffnen`-Prop an ihren vorhandenen "+"-Dialog durch (siehe
 * InfoErstellenDialog/AuftragErstellenDialog/TerminDialog/
 * ChatNeueNachrichtDialog), damit es nicht zwei Kopien desselben Formulars
 * gibt. "+ Formular" führt ohne Parameter direkt zur Formularübersicht, weil
 * Formulare vorlagenbasiert sind — es gibt dort kein "leeres" Anlegen.
 */
export function MobileSchnellmenu({ darfInfo, darfAufgabeZuweisen }: { darfInfo: boolean; darfAufgabeZuweisen: boolean }) {
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

  // Reihenfolge = Reihenfolge im aufgeklappten Stapel, von oben nach unten
  // (Rückmeldung 2026-09-15) — der Stapel wächst optisch nach oben über dem
  // "+"-Knopf, das erste Array-Element landet dadurch ganz oben.
  const aktionen: Schnellaktion[] = [
    ...(darfInfo ? [{ name: "Info", href: "/newsfeed?neu=1", icon: INFO_ICON }] : []),
    { name: "Formular", href: "/formulare", icon: FORMULAR_ICON },
    ...(darfAufgabeZuweisen ? [{ name: "Aufgabe", href: "/aufgaben?neu=1", icon: AUFGABE_ICON }] : []),
    { name: "Termin", href: "/kalender?neu=1", icon: TERMIN_ICON },
    { name: "Chat", href: "/chat?neu=1", icon: CHAT_ICON },
  ]

  if (!schnellmenuRelevant(pathname)) return null

  return (
    <div
      ref={containerRef}
      className="fixed right-4 z-30 flex flex-col items-end gap-2 md:hidden"
      style={{ bottom: "calc(5rem + env(safe-area-inset-bottom))" }}
    >
      {offen && (
        <div className="flex flex-col items-end gap-2">
          {aktionen.map((aktion) => (
            <Link
              key={aktion.name}
              href={aktion.href}
              onClick={() => setOffen(false)}
              className="flex items-center gap-2 rounded-full border border-rand bg-flaeche py-2 pr-4 pl-3 text-sm font-medium text-primaer shadow-md transition hover:border-marke-gruen hover:text-marke-gruen-dunkel"
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
        className="flex h-14 w-14 items-center justify-center rounded-full bg-marke-gruen text-neutral-900 shadow-lg transition hover:bg-marke-gruen-dunkel focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marke-gruen-dunkel"
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
