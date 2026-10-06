"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { AlertTriangle } from "lucide-react"

import { AUFGABE_PRIORITAET_KLASSEN, AUFGABE_PRIORITAET_NAMEN } from "@/lib/aufgaben-optionen"

export type AufgabeZeile = {
  id: string
  titel: string
  prioritaet: string
  /** Schon fertig formatiert, z. B. "Fr., 02.10." */
  faelligText: string | null
  ueberfaellig: boolean
}

/**
 * Titel der eigenen offenen Aufgaben als Links (jede Zeile öffnet das
 * Aufgaben-Pop-Up), so viele, wie in die Kachel passen — die letzte Zeile
 * sagt dann "+ X weitere" (Rückmeldung 2026-10-05). Wie viele passen,
 * messen wir im Browser: Der Container füllt den freien Platz der Kachel
 * (`flex-1`), die Zeilenhöhe ist durch `truncate` immer gleich. Die erste
 * Zeile bleibt immer sichtbar, auch bei winzigem Platz. Ohne `messen` zählt
 * nur `maxZeilen` (Handy-Startseite, wo die Kachel nicht in einer festen
 * Höhe steckt).
 */
export function AufgabenKachelListe({
  aufgaben,
  maxZeilen,
  messen = true,
}: {
  aufgaben: AufgabeZeile[]
  maxZeilen?: number
  /** Aus: kein Platz-Messen, nur `maxZeilen` (Container ohne feste Höhe, z. B. Handy-Startseite). */
  messen?: boolean
}) {
  const behaelterRef = useRef<HTMLDivElement>(null)
  const listeRef = useRef<HTMLUListElement>(null)
  const [passenZeilen, setPassenZeilen] = useState<number | null>(null)

  useEffect(() => {
    const behaelter = behaelterRef.current
    const liste = listeRef.current
    if (!messen || !behaelter || !liste) return

    function messen() {
      const erste = liste?.querySelector("li")
      if (!erste || !behaelter) return
      const zeilenHoehe = erste.getBoundingClientRect().height
      const abstand = parseFloat(getComputedStyle(liste!).rowGap) || 0
      const platz = behaelter.clientHeight
      if (zeilenHoehe <= 0) return
      setPassenZeilen(Math.max(1, Math.floor((platz + abstand) / (zeilenHoehe + abstand))))
    }

    // Der erste Aufruf kommt direkt nach dem Beobachten, spätere bei jeder Größenänderung.
    const beobachter = new ResizeObserver(messen)
    beobachter.observe(behaelter)
    return () => beobachter.disconnect()
  }, [aufgaben.length, messen])

  const grenze = Math.min(passenZeilen ?? aufgaben.length, maxZeilen ?? aufgaben.length)
  // Passt nicht alles: eine Zeile gehört dem "+ X weitere".
  const zeigeAlle = aufgaben.length <= grenze
  const sichtbar = zeigeAlle ? aufgaben : aufgaben.slice(0, Math.max(1, grenze - 1))
  const weitere = aufgaben.length - sichtbar.length

  return (
    <div ref={behaelterRef} className={messen ? "min-h-0 flex-1 overflow-hidden" : ""}>
      <ul ref={listeRef} className="flex flex-col gap-1">
        {sichtbar.map((aufgabe) => (
          <li key={aufgabe.id} className="h-5 shrink-0">
            <Link
              href={`/aufgaben?auftrag=${aufgabe.id}`}
              className="flex h-5 items-center gap-1.5 rounded text-xs text-primaer hover:text-marke-gruen-dunkel hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
            >
              <span
                aria-label={`Priorität: ${AUFGABE_PRIORITAET_NAMEN[aufgabe.prioritaet]}`}
                className={"h-1.5 w-1.5 shrink-0 rounded-full " + AUFGABE_PRIORITAET_KLASSEN[aufgabe.prioritaet]}
              />
              <span className="min-w-0 flex-1 truncate">{aufgabe.titel}</span>
              {aufgabe.faelligText && (
                <span
                  className={
                    "flex shrink-0 items-center gap-0.5 text-[11px] " +
                    (aufgabe.ueberfaellig ? "font-medium text-red-600" : "text-tertiaer")
                  }
                >
                  {aufgabe.ueberfaellig && <AlertTriangle className="h-3 w-3" aria-hidden />}
                  {aufgabe.faelligText}
                  {aufgabe.ueberfaellig && <span className="sr-only"> (überfällig)</span>}
                </span>
              )}
            </Link>
          </li>
        ))}
        {weitere > 0 && (
          <li className="h-5 shrink-0">
            <Link
              href="/aufgaben"
              className="flex h-5 items-center rounded text-xs font-medium text-marke-gruen-dunkel hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
            >
              + {weitere} weitere
            </Link>
          </li>
        )}
      </ul>
    </div>
  )
}
