"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { MONATSNAMEN } from "@/lib/kalender"

const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]
const MONATS_KURZ = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"]

const zwei = (n: number) => String(n).padStart(2, "0")

/**
 * Datumsrechnung auf reinen ISO-Texten ("2026-10-17") über UTC — keine
 * Zeitzone kann einen Tag verschieben (siehe src/lib/datum.ts und die
 * Zeitzonen-Regel im Projekt: nie Date-Methoden der Umgebung für Kalendertage).
 */
function isoVon(jahr: number, monat: number, tag: number): string {
  return `${String(jahr).padStart(4, "0")}-${zwei(monat)}-${zwei(tag)}`
}

function teile(iso: string): { jahr: number; monat: number; tag: number } {
  const [jahr, monat, tag] = iso.split("-").map(Number)
  return { jahr, monat, tag }
}

function tagePlus(iso: string, tage: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + tage)
  return d.toISOString().slice(0, 10)
}

/** Monate vor/zurück; der Tag wird auf die Länge des Zielmonats gekürzt (31.01. + 1 Monat = 28.02.). */
function monatePlus(iso: string, monate: number): string {
  const { jahr, monat, tag } = teile(iso)
  const ziel = new Date(Date.UTC(jahr, monat - 1 + monate, 1))
  const tageImZiel = new Date(Date.UTC(ziel.getUTCFullYear(), ziel.getUTCMonth() + 1, 0)).getUTCDate()
  return isoVon(ziel.getUTCFullYear(), ziel.getUTCMonth() + 1, Math.min(tag, tageImZiel))
}

/** Wochentag mit Montag = 0. */
function wochentag(iso: string): number {
  return (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7
}

/**
 * Kalender-Auswahl als Ersatz für das Datums-Pop-up des Browsers (Rückmeldung
 * 2026-10-22: sieht nicht nach dem Rest der App aus). Wird von DatumFeld in
 * einem Pop-over geöffnet — nur am Computer; auf Handy und Tablet nutzt das
 * Feld die Datumsauswahl des Geräts.
 *
 * Bedienung:
 * - Mit den Pfeilen oben blätterst du monatsweise, ein Klick auf „Oktober 2026"
 *   öffnet die Monats-/Jahresauswahl für weite Sprünge.
 * - Heute ist umrandet, der gewählte Tag grün; Tage vor `min` bzw. nach `max`
 *   sind ausgegraut und nicht wählbar.
 * - „Heute" springt zum heutigen Tag, „Löschen" leert das Feld (nur wenn es
 *   kein Pflichtfeld ist).
 * - Tastatur: Pfeile = Tag/Woche, Bild auf/ab = Monat (mit Umschalt = Jahr),
 *   Pos1/Ende = Wochenanfang/-ende, Enter wählt, Escape schließt (siehe
 *   DatumFeld).
 */
export function KalenderAuswahl({
  wert,
  heute,
  min,
  max,
  onWahl,
  onLoeschen,
  onSchliessen,
}: {
  /** Gewähltes Datum als ISO oder "". */
  wert: string
  /** Heutiges Datum als ISO (Berliner Kalendertag). */
  heute: string
  min?: string
  max?: string
  onWahl: (iso: string) => void
  /** Nur gesetzt, wenn das Feld leerbar ist (kein Pflichtfeld). */
  onLoeschen?: () => void
  onSchliessen: () => void
}) {
  // Startpunkt: gewähltes Datum, sonst heute — bei `min` in der Zukunft ab dort.
  const start = wert || (min && heute < min ? min : heute)
  const [ansicht, setAnsicht] = useState<"tage" | "monate">("tage")
  const [fokus, setFokus] = useState(start)
  const [jahrAuswahl, setJahrAuswahl] = useState(teile(start).jahr)
  const tagRefs = useRef(new Map<string, HTMLButtonElement>())
  const monatsansichtRef = useRef<HTMLDivElement>(null)

  const { jahr: anzeigeJahr, monat: anzeigeMonat } = teile(fokus)

  const gesperrt = (iso: string) => (min !== undefined && iso < min) || (max !== undefined && iso > max)

  // Tastaturfokus auf den aktuellen Tag setzen: beim Öffnen und nach jeder Pfeiltaste.
  useEffect(() => {
    if (ansicht === "tage") {
      tagRefs.current.get(fokus)?.focus({ preventScroll: true })
    } else {
      // Monatsauswahl: Fokus auf den aktuellen Monat (sonst ginge er beim Umschalten verloren).
      const raster = monatsansichtRef.current
      ;(raster?.querySelector<HTMLButtonElement>("button[data-aktuell]:not(:disabled)") ??
        raster?.querySelector<HTMLButtonElement>("button:not(:disabled)"))?.focus({ preventScroll: true })
    }
  }, [fokus, ansicht])

  // 6 Wochen ab dem Montag der Woche, in der der 1. liegt — immer gleich hoch, damit das Pop-up beim Blättern nicht springt.
  const erster = isoVon(anzeigeJahr, anzeigeMonat, 1)
  const gitterStart = tagePlus(erster, -wochentag(erster))
  const tage = Array.from({ length: 42 }, (_, i) => tagePlus(gitterStart, i))

  function bewegen(ziel: string) {
    setFokus(ziel)
  }

  function beiTaste(ereignis: React.KeyboardEvent<HTMLButtonElement>, iso: string) {
    const schritte: Record<string, string | undefined> = {
      ArrowLeft: tagePlus(iso, -1),
      ArrowRight: tagePlus(iso, 1),
      ArrowUp: tagePlus(iso, -7),
      ArrowDown: tagePlus(iso, 7),
      PageUp: ereignis.shiftKey ? monatePlus(iso, -12) : monatePlus(iso, -1),
      PageDown: ereignis.shiftKey ? monatePlus(iso, 12) : monatePlus(iso, 1),
      Home: tagePlus(iso, -wochentag(iso)),
      End: tagePlus(iso, 6 - wochentag(iso)),
    }
    const ziel = schritte[ereignis.key]
    if (ziel) {
      ereignis.preventDefault()
      bewegen(ziel)
    }
  }

  const navKnopf =
    "flex h-8 w-8 items-center justify-center rounded-lg text-sekundaer transition hover:bg-flaeche-100 hover:text-ueberschrift focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen disabled:opacity-30 disabled:hover:bg-transparent"

  const vorherigerMonatGesperrt = min !== undefined && isoVon(anzeigeJahr, anzeigeMonat, 1) <= min
  const naechsterMonatGesperrt = max !== undefined && monatePlus(erster, 1) > max

  return (
    <div
      role="dialog"
      aria-label="Datum wählen"
      className="w-72 rounded-xl border border-rand bg-flaeche p-3 shadow-xl"
    >
      {ansicht === "tage" ? (
        <>
          <div className="flex items-center justify-between gap-1">
            <button
              type="button"
              aria-label="Vorheriger Monat"
              disabled={vorherigerMonatGesperrt}
              onClick={() => bewegen(monatePlus(fokus, -1))}
              className={navKnopf}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => {
                setJahrAuswahl(anzeigeJahr)
                setAnsicht("monate")
              }}
              aria-label={`${MONATSNAMEN[anzeigeMonat - 1]} ${anzeigeJahr}, Monat und Jahr wählen`}
              className="rounded-lg px-2 py-1 text-sm font-semibold text-ueberschrift transition hover:bg-flaeche-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
            >
              {MONATSNAMEN[anzeigeMonat - 1]} {anzeigeJahr}
            </button>
            <button
              type="button"
              aria-label="Nächster Monat"
              disabled={naechsterMonatGesperrt}
              onClick={() => bewegen(monatePlus(fokus, 1))}
              className={navKnopf}
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div role="grid" aria-label={`${MONATSNAMEN[anzeigeMonat - 1]} ${anzeigeJahr}`} className="mt-2">
            <div role="row" className="grid grid-cols-7">
              {WOCHENTAGE.map((name) => (
                <span key={name} role="columnheader" className="py-1 text-center text-[11px] font-medium text-tertiaer">
                  {name}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-0.5">
              {tage.map((iso) => {
                const { monat, tag } = teile(iso)
                const imMonat = monat === anzeigeMonat
                const gewaehlt = iso === wert
                const istHeute = iso === heute
                const nichtWaehlbar = gesperrt(iso)
                return (
                  <button
                    key={iso}
                    ref={(knopf) => {
                      if (knopf) tagRefs.current.set(iso, knopf)
                      else tagRefs.current.delete(iso)
                    }}
                    type="button"
                    role="gridcell"
                    tabIndex={iso === fokus ? 0 : -1}
                    aria-selected={gewaehlt}
                    aria-current={istHeute ? "date" : undefined}
                    aria-disabled={nichtWaehlbar}
                    aria-label={new Date(`${iso}T00:00:00Z`).toLocaleDateString("de-DE", {
                      timeZone: "UTC",
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                    onClick={() => {
                      if (!nichtWaehlbar) onWahl(iso)
                    }}
                    onKeyDown={(ereignis) => beiTaste(ereignis, iso)}
                    className={
                      "mx-auto flex h-9 w-9 items-center justify-center rounded-lg text-sm tabular-nums transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen " +
                      (gewaehlt
                        ? "bg-marke-gruen font-semibold text-neutral-900"
                        : nichtWaehlbar
                          ? "cursor-not-allowed text-tertiaer opacity-40"
                          : imMonat
                            ? "text-primaer hover:bg-flaeche-100"
                            : "text-tertiaer hover:bg-flaeche-100") +
                      (istHeute && !gewaehlt ? " ring-1 ring-marke-gruen-dunkel" : "")
                    }
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-rand pt-2">
            <button
              type="button"
              disabled={gesperrt(heute)}
              onClick={() => onWahl(heute)}
              className="rounded-lg px-2 py-1 text-sm font-medium text-marke-gruen-dunkel transition hover:bg-flaeche-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen disabled:opacity-40 disabled:hover:bg-transparent"
            >
              Heute
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
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-1">
            <button type="button" aria-label="Vorheriges Jahr" onClick={() => setJahrAuswahl(jahrAuswahl - 1)} className={navKnopf}>
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <span className="text-sm font-semibold text-ueberschrift">{jahrAuswahl}</span>
            <button type="button" aria-label="Nächstes Jahr" onClick={() => setJahrAuswahl(jahrAuswahl + 1)} className={navKnopf}>
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div ref={monatsansichtRef} className="mt-2 grid grid-cols-3 gap-1.5">
            {MONATS_KURZ.map((name, index) => {
              const monat = index + 1
              const ersterTag = isoVon(jahrAuswahl, monat, 1)
              const letzterTag = tagePlus(monatePlus(ersterTag, 1), -1)
              const nichtWaehlbar = (min !== undefined && letzterTag < min) || (max !== undefined && ersterTag > max)
              const aktuell = jahrAuswahl === anzeigeJahr && monat === anzeigeMonat
              // Gleicher Tag im gewählten Monat, auf dessen Länge gekürzt (31. → 30./28.).
              const ziel = isoVon(jahrAuswahl, monat, Math.min(teile(fokus).tag, teile(letzterTag).tag))
              return (
                <button
                  key={name}
                  type="button"
                  disabled={nichtWaehlbar}
                  data-aktuell={aktuell ? "" : undefined}
                  onClick={() => {
                    bewegen(ziel)
                    setAnsicht("tage")
                  }}
                  className={
                    "h-10 rounded-lg text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen disabled:cursor-not-allowed disabled:opacity-40 " +
                    (aktuell
                      ? "bg-marke-gruen font-semibold text-neutral-900"
                      : "text-primaer hover:bg-flaeche-100 disabled:hover:bg-transparent")
                  }
                >
                  {name}
                </button>
              )
            })}
          </div>
          <div className="mt-2 flex justify-end border-t border-rand pt-2">
            <button
              type="button"
              onClick={() => setAnsicht("tage")}
              className="rounded-lg px-2 py-1 text-sm text-sekundaer transition hover:bg-flaeche-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
            >
              Zurück
            </button>
          </div>
        </>
      )}
    </div>
  )
}
