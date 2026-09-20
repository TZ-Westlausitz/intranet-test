"use client"

import { useState } from "react"
import Link from "next/link"

type Eintrag = { id: string; text: string; link: string | null; zeitpunktAnzeige: string; gelesen: boolean }

const ANFANGS_SICHTBAR = 3

/**
 * Benachrichtigungen auf der mobilen Menü-Seite (Rückmeldung 2026-09-18):
 * Mit vielen Einträgen schob die volle Liste die Menüpunkte darunter weit
 * nach unten. Deshalb zunächst nur die neuesten drei, der Rest per
 * "Alle anzeigen" ausklappbar. Server-Komponente reicht die Daten durch,
 * "Alle als gelesen markieren" bleibt im Kopf der Seite dort.
 */
export function BenachrichtigungenListe({ eintraege }: { eintraege: Eintrag[] }) {
  const [alleSichtbar, setAlleSichtbar] = useState(false)

  if (eintraege.length === 0) {
    return <p className="mt-3 text-sm text-sekundaer">Noch keine Benachrichtigungen.</p>
  }

  const angezeigt = alleSichtbar ? eintraege : eintraege.slice(0, ANFANGS_SICHTBAR)
  const verborgen = eintraege.length - ANFANGS_SICHTBAR

  return (
    <>
      <ul className="mt-3 flex flex-col divide-y divide-flaeche-100">
        {angezeigt.map((b) => {
          const inhalt = (
            <>
              <p className={"text-sm " + (b.gelesen ? "text-primaer" : "font-medium text-ueberschrift")}>{b.text}</p>
              <p className="mt-0.5 text-xs text-tertiaer">{b.zeitpunktAnzeige}</p>
            </>
          )
          return (
            <li key={b.id} className="py-2.5">
              {b.link ? (
                <Link href={b.link} className="block">
                  {inhalt}
                </Link>
              ) : (
                inhalt
              )}
            </li>
          )
        })}
      </ul>

      {verborgen > 0 && (
        <button
          type="button"
          onClick={() => setAlleSichtbar((v) => !v)}
          aria-expanded={alleSichtbar}
          className="mt-2 w-full border-t border-flaeche-100 pt-2.5 text-center text-xs font-medium text-marke-gruen-dunkel hover:underline"
        >
          {alleSichtbar ? "Weniger anzeigen" : `Alle anzeigen (${eintraege.length})`}
        </button>
      )}
    </>
  )
}
