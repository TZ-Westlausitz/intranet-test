"use client"

import { useEffect, useState } from "react"
import { CalendarPlus } from "lucide-react"

/**
 * "Zum Kalender hinzufügen" über das Teilen-Menü des Geräts — nur auf Handy
 * und Tablet (Touch als Haupteingabe). Dort öffnet der Knopf das Teilen-Menü
 * mit der Kalenderdatei des Termins; man wählt Outlook oder die Kalender-App
 * und der Termin ist eingetragen, ohne Datei erst zu speichern und woanders
 * einzufügen. Am Desktop erscheint der Knopf bewusst nicht (noch keine
 * passende Lösung, Entscheidung 2026-10-05).
 *
 * Die Datei wird schon beim Öffnen des Pop-Ups geladen (`aktiv`), nicht erst
 * beim Klick: Browser erlauben das Teilen-Menü nur direkt aus einem Klick
 * heraus, ein Abruf dazwischen kann das auf iPhone/iPad verhindern. Ist das
 * Teilen von Kalenderdateien auf dem Gerät nicht möglich, bleibt der Knopf
 * ausgeblendet.
 */
export function TerminTeilenKnopf({ terminId, titel, aktiv }: { terminId: string; titel: string; aktiv: boolean }) {
  const [datei, setDatei] = useState<File | null>(null)
  const [fehler, setFehler] = useState(false)

  useEffect(() => {
    if (!aktiv) return
    if (typeof navigator.share !== "function" || !window.matchMedia("(pointer: coarse)").matches) return

    const abbruch = new AbortController()
    ;(async () => {
      try {
        const antwort = await fetch(`/api/termine/${terminId}/ics`, { signal: abbruch.signal })
        if (!antwort.ok) return
        const blob = await antwort.blob()
        const name = `${titel.replace(/[\\/:*?"<>|\r\n]+/g, " ").trim().slice(0, 60) || "Termin"}.ics`
        const neu = new File([blob], name, { type: "text/calendar" })
        if (navigator.canShare?.({ files: [neu] })) setDatei(neu)
      } catch {
        // Abgebrochen oder offline: Knopf bleibt einfach weg.
      }
    })()
    return () => abbruch.abort()
  }, [aktiv, terminId, titel])

  if (!datei) return null

  async function teilen() {
    setFehler(false)
    try {
      await navigator.share({ files: [datei!], title: titel })
    } catch (fehlerObjekt) {
      // Abbrechen im Teilen-Menü ist kein Fehler.
      if (!(fehlerObjekt instanceof DOMException && fehlerObjekt.name === "AbortError")) setFehler(true)
    }
  }

  return (
    <div className="flex flex-col items-start">
      <button
        type="button"
        onClick={teilen}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-primaer transition hover:bg-flaeche-100"
      >
        <CalendarPlus className="h-4 w-4" aria-hidden />
        Zum Kalender hinzufügen
      </button>
      {fehler && <p className="px-3 text-xs text-red-700 dark:text-red-400">Teilen hat nicht geklappt.</p>}
    </div>
  )
}
