"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { BAUSTEINE } from "@/lib/bausteine"
import { BausteinMehrMenu } from "@/components/baustein-mehr-menu"

/** Aktiv = aktuelle Seite oder eine Unterseite davon (nicht bei "/" selbst, sonst wäre Home immer aktiv). */
function istAktiv(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(href + "/")
}

/**
 * Desktop-Bausteine-Leiste — Client Component wegen `usePathname()` (das
 * Root-Layout selbst bleibt eine Server Component). Jeder Punkt bekommt
 * seine "Bubble" (getönter, abgerundeter Hintergrund) nur, solange er dem
 * gerade geöffneten Baustein entspricht — alle anderen zeigen nur farbige
 * Schrift und bekommen die Bubble erst beim Hovern (Rückmeldung
 * 2026-09-11). `adminModusAktiv` färbt Schrift/Bubble orange statt grün,
 * dieselbe Erinnerung wie überall sonst im Admin-Modus.
 */
export function BausteineLeiste({ adminModusAktiv }: { adminModusAktiv: boolean }) {
  const pathname = usePathname()
  const textFarbe = adminModusAktiv ? "text-marke-orange" : "text-marke-gruen-dunkel"
  const bubbleAktiv = adminModusAktiv ? "bg-marke-orange/20" : "bg-marke-gruen/15"
  const bubbleHover = adminModusAktiv ? "hover:bg-marke-orange/10" : "hover:bg-marke-gruen/10"

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {BAUSTEINE.map((baustein) => {
        if (baustein.unterpunkte) {
          return (
            <BausteinMehrMenu
              key={baustein.name}
              name={baustein.name}
              unterpunkte={baustein.unterpunkte}
              aktiv={baustein.unterpunkte.some((punkt) => istAktiv(punkt.href, pathname))}
              adminModusAktiv={adminModusAktiv}
            />
          )
        }

        if (!baustein.href) {
          return (
            <span
              key={baustein.name}
              title="Noch nicht verfügbar"
              className="cursor-default rounded-full px-3 py-1 text-sm font-medium text-tertiaer"
            >
              {baustein.name}
            </span>
          )
        }

        const aktiv = istAktiv(baustein.href, pathname)
        return (
          <Link
            key={baustein.name}
            href={baustein.href}
            className={
              "rounded-full px-3 py-1 text-sm font-semibold transition " +
              textFarbe +
              " " +
              (aktiv ? bubbleAktiv : bubbleHover)
            }
          >
            {baustein.name}
          </Link>
        )
      })}
    </div>
  )
}
