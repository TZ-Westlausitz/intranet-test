"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

type Ziel = {
  name: string
  href: string
  icon: (aktiv: boolean) => React.ReactNode
}

function istAktiv(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(href + "/")
}

/**
 * Feste Fußleiste für die Handy-Ansicht (Rückmeldung 2026-09-15, Vorbild
 * app.ueberblick.io: dort gab es unten eine Menüleiste + ein separat
 * schwebendes "+"). Bewusst nur VIER Ziele statt aller Bausteine — Aufgaben,
 * Chats, Home (Newsfeed/Kalender/Aufgaben-Vorschau sitzen dort schon auf der
 * Startseite, siehe Handy-Startseite-Umbau, deshalb kein eigener
 * Newsfeed-Punkt) und Menü (Profil, Einstellungen, Kontakte, Wissen,
 * Benachrichtigungen — siehe /menu). Alle übrigen Bausteine (Formulare,
 * Kalender, Fahrzeuge, To-Do-Liste, Geplante Aktionen) bleiben weiterhin
 * über das Drei-Striche-Menü in Kopfleiste erreichbar — diese Leiste ersetzt
 * es nicht, sie ergänzt nur die vier meistgebrauchten Ziele um einen
 * Daumen-erreichbaren Weg.
 *
 * Das schwebende "+" (MobileSchnellmenu) ist bewusst KEIN fünfter Punkt
 * hier drin, sondern ein eigenes, separat positioniertes Element — genau
 * wie im Vorbild.
 */
export function MobileTabBar({
  chatUngeleseneAnzahl,
  benachrichtigungenUngeleseneAnzahl,
}: {
  chatUngeleseneAnzahl: number
  benachrichtigungenUngeleseneAnzahl: number
}) {
  const pathname = usePathname()

  const ziele: Ziel[] = [
    {
      name: "Aufgaben",
      href: "/aufgaben",
      icon: (aktiv) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={aktiv ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" className="h-5.5 w-5.5" aria-hidden>
          <path d="M9 11l2.5 2.5L16 8.5" />
          <rect x="4" y="4" width="16" height="16" rx="3" />
        </svg>
      ),
    },
    {
      name: "Chats",
      href: "/chat",
      icon: (aktiv) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={aktiv ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" className="h-5.5 w-5.5" aria-hidden>
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      ),
    },
    {
      name: "Home",
      href: "/",
      icon: (aktiv) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={aktiv ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" className="h-5.5 w-5.5" aria-hidden>
          <path d="M4 11.5 12 4l8 7.5" />
          <path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" />
        </svg>
      ),
    },
    {
      name: "Menü",
      href: "/menu",
      icon: (aktiv) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={aktiv ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" className="h-5.5 w-5.5" aria-hidden>
          <rect x="4" y="4" width="7" height="7" rx="1.5" />
          <rect x="13" y="4" width="7" height="7" rx="1.5" />
          <rect x="4" y="13" width="7" height="7" rx="1.5" />
          <rect x="13" y="13" width="7" height="7" rx="1.5" />
        </svg>
      ),
    },
  ]

  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-rand bg-flaeche/95 backdrop-blur-sm md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-2xl items-stretch justify-around">
        {ziele.map((ziel) => {
          const aktiv = istAktiv(pathname, ziel.href)
          const badge =
            ziel.href === "/chat" ? chatUngeleseneAnzahl : ziel.href === "/menu" ? benachrichtigungenUngeleseneAnzahl : 0
          return (
            <Link
              key={ziel.href}
              href={ziel.href}
              aria-current={aktiv ? "page" : undefined}
              className={
                "relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition " +
                (aktiv ? "text-marke-gruen-dunkel" : "text-tertiaer")
              }
            >
              <span className="relative">
                {ziel.icon(aktiv)}
                {badge > 0 && (
                  <span
                    aria-label={`${badge} ungelesen`}
                    className="absolute -top-1 -right-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-marke-orange px-1 text-[9px] font-bold text-neutral-900"
                  >
                    {badge}
                  </span>
                )}
              </span>
              {ziel.name}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
