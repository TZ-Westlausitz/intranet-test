"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"

import { benachrichtigungenAlsGelesenMarkieren } from "@/lib/benachrichtigungen/aktionen"

export type BenachrichtigungAnzeige = {
  id: string
  text: string
  link: string | null
  zeitpunktAnzeige: string
  gelesen: boolean
}

/**
 * Glocke oben rechts neben dem Namen — Badge zeigt die Anzahl ungelesener
 * Benachrichtigungen (derselbe Kreis-mit-Zahl-Stil wie bei offenen
 * Fahrzeug-Anfragen und fälligen Terminerinnerungen, siehe Memory
 * einheitliches-hinweiszeichen). "Einmalige Erinnerung" heißt hier: der
 * Zähler bleibt stehen, bis die Glocke einmal geöffnet wird — kein
 * wiederkehrender Alarm, keine separate Push-Benachrichtigung.
 *
 * Aufklappen markiert alle als gelesen (Server Action) — die Liste selbst
 * bleibt trotzdem sichtbar, nur der Zähler verschwindet.
 */
export function BenachrichtigungsGlocke({
  benachrichtigungen,
  ungeleseneAnzahl,
}: {
  benachrichtigungen: BenachrichtigungAnzeige[]
  ungeleseneAnzahl: number
}) {
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

  function umschalten() {
    const wirdGeoeffnet = !offen
    setOffen(wirdGeoeffnet)
    if (wirdGeoeffnet && ungeleseneAnzahl > 0) {
      benachrichtigungenAlsGelesenMarkieren()
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={umschalten}
        aria-expanded={offen}
        aria-haspopup="menu"
        aria-label="Benachrichtigungen"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-primaer transition hover:bg-marke-gruen/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>

        {ungeleseneAnzahl > 0 && (
          <span
            aria-label={`${ungeleseneAnzahl} neue Benachrichtigungen`}
            className="absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-marke-orange px-1 text-[10px] font-bold text-neutral-900"
          >
            {ungeleseneAnzahl}
          </span>
        )}
      </button>

      {offen && (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-2 max-h-96 w-80 overflow-y-auto rounded-lg border border-rand bg-flaeche py-1 shadow-lg"
        >
          <div className="border-b border-rand px-4 py-2 text-xs font-semibold text-sekundaer">
            Benachrichtigungen
          </div>

          {benachrichtigungen.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-tertiaer">Noch keine Benachrichtigungen.</p>
          ) : (
            benachrichtigungen.map((b) => {
              const inhalt = (
                <>
                  <p className={"text-sm " + (b.gelesen ? "text-primaer" : "font-medium text-ueberschrift")}>
                    {b.text}
                  </p>
                  <p className="mt-0.5 text-xs text-tertiaer">{b.zeitpunktAnzeige}</p>
                </>
              )

              return b.link ? (
                <Link
                  key={b.id}
                  href={b.link}
                  onClick={() => setOffen(false)}
                  className="block border-b border-rand px-4 py-2.5 transition hover:bg-marke-gruen/5"
                >
                  {inhalt}
                </Link>
              ) : (
                <div key={b.id} className="border-b border-rand px-4 py-2.5">
                  {inhalt}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
