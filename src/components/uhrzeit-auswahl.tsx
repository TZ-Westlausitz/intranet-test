"use client"

import { useRef } from "react"

const STUNDEN = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"))

/**
 * Uhrzeit-Auswahl als Gegenstück zu KalenderAuswahl (Rückmeldung 2026-10-22:
 * Uhrzeitfelder im gleichen Stil) — wird von UhrzeitFeld in einem Pop-over
 * geöffnet, nur am Computer; auf Handy und Tablet nutzt das Feld die
 * Zeitauswahl des Geräts.
 *
 * Zwei Raster: erst die Stunde (0–23), dann die Minute in `schritt`-Minuten
 * (Standard 5). Ein Klick auf die Stunde lässt die Auswahl offen und springt
 * zu den Minuten, ein Klick auf die Minute übernimmt und schließt. Minuten
 * außerhalb des Rasters (z. B. 11:44 nach "Jetzt") bleiben im Kopf sichtbar
 * und lassen sich im Feld selbst tippen. Tastatur: Pfeile bewegen im Raster,
 * Enter wählt, Escape schließt (siehe usePopoverAnker).
 */
export function UhrzeitAuswahl({
  wert,
  jetzt,
  schritt = 5,
  onWahl,
  onLoeschen,
  onSchliessen,
}: {
  /** "HH:MM" oder "" (noch keine Uhrzeit). */
  wert: string
  /** Aktuelle Uhrzeit "HH:MM" (Berliner Zeit) für den Knopf "Jetzt" und als Vorgabe. */
  jetzt: string
  schritt?: number
  /** `fertig`: true = Auswahl abgeschlossen (Minute gewählt), false = Stunde gewählt, Auswahl bleibt offen. */
  onWahl: (uhrzeit: string, fertig: boolean) => void
  /** Nur gesetzt, wenn das Feld leerbar ist (kein Pflichtfeld). */
  onLoeschen?: () => void
  onSchliessen: () => void
}) {
  const [stunde, minute] = wert ? wert.split(":") : ["", ""]
  const minuten = Array.from({ length: Math.floor(60 / schritt) }, (_, i) => String(i * schritt).padStart(2, "0"))
  const stundenRef = useRef<HTMLDivElement>(null)
  const minutenRef = useRef<HTMLDivElement>(null)

  function gitterTaste(ereignis: React.KeyboardEvent<HTMLDivElement>, spalten: number) {
    const knoepfe = [...ereignis.currentTarget.querySelectorAll<HTMLButtonElement>("button")]
    const index = knoepfe.indexOf(document.activeElement as HTMLButtonElement)
    if (index < 0) return
    const bewegung: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -spalten, ArrowDown: spalten }
    const schritte = bewegung[ereignis.key]
    if (schritte === undefined) return
    ereignis.preventDefault()
    knoepfe[Math.min(Math.max(index + schritte, 0), knoepfe.length - 1)]?.focus()
  }

  const knopfKlasse = (gewaehlt: boolean) =>
    "flex h-8 items-center justify-center rounded-lg text-sm tabular-nums transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen " +
    (gewaehlt ? "bg-marke-gruen font-semibold text-neutral-900" : "text-primaer hover:bg-flaeche-100")

  // Tab landet im Raster auf dem gewählten Wert (sonst dem ersten) — nicht auf allen 36 Knöpfen.
  const stundeTab = stunde || STUNDEN[0]
  const minuteTab = minuten.includes(minute) ? minute : minuten[0]

  return (
    <div role="dialog" aria-label="Uhrzeit wählen" className="w-64 rounded-xl border border-rand bg-flaeche p-3 shadow-xl">
      <p className="text-center text-lg font-semibold text-ueberschrift tabular-nums" aria-live="polite">
        {wert || "– –:– –"}
      </p>

      <p className="mt-2 text-[11px] font-medium text-tertiaer">Stunde</p>
      <div
        ref={stundenRef}
        role="group"
        aria-label="Stunde"
        onKeyDown={(e) => gitterTaste(e, 6)}
        className="mt-1 grid grid-cols-6 gap-1"
      >
        {STUNDEN.map((h) => (
          <button
            key={h}
            type="button"
            tabIndex={h === stundeTab ? 0 : -1}
            aria-pressed={h === stunde}
            onClick={() => {
              onWahl(`${h}:${minute || "00"}`, false)
              // Weiter zu den Minuten: erst nach dem Rendern, damit der Fokus nicht ins Leere geht.
              window.requestAnimationFrame(() => {
                minutenRef.current?.querySelector<HTMLButtonElement>("button[tabindex='0']")?.focus()
              })
            }}
            className={knopfKlasse(h === stunde)}
          >
            {h}
          </button>
        ))}
      </div>

      <p className="mt-3 text-[11px] font-medium text-tertiaer">Minute</p>
      <div
        ref={minutenRef}
        role="group"
        aria-label="Minute"
        onKeyDown={(e) => gitterTaste(e, 6)}
        className="mt-1 grid grid-cols-6 gap-1"
      >
        {minuten.map((m) => (
          <button
            key={m}
            type="button"
            tabIndex={m === minuteTab ? 0 : -1}
            aria-pressed={m === minute}
            onClick={() => onWahl(`${stunde || jetzt.slice(0, 2)}:${m}`, true)}
            className={knopfKlasse(m === minute)}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-rand pt-2">
        <button
          type="button"
          onClick={() => onWahl(jetzt, true)}
          className="rounded-lg px-2 py-1 text-sm font-medium text-marke-gruen-dunkel transition hover:bg-flaeche-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
        >
          Jetzt
        </button>
        {onLoeschen && wert ? (
          <button
            type="button"
            onClick={onLoeschen}
            className="rounded-lg px-2 py-1 text-sm text-sekundaer transition hover:bg-flaeche-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
          >
            Löschen
          </button>
        ) : (
          <button
            type="button"
            onClick={onSchliessen}
            className="rounded-lg px-2 py-1 text-sm text-sekundaer transition hover:bg-flaeche-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
          >
            Schließen
          </button>
        )}
      </div>
    </div>
  )
}
