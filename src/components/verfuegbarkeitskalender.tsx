import Link from "next/link"

import { berlinerTagesbeginn } from "@/lib/datum"

/**
 * Zeigt die Verfügbarkeit eines Fahrzeugs als Kalender: belegte Tage grau,
 * freie Tage grün (Firmenfarbe) hinterlegt. Ersetzt eine reine Auflistung
 * der geplanten Ausleihen, die bei vielen Terminen schnell unübersichtlich
 * würde.
 *
 * Ein Monat auf einmal, mit "Zurück"/"Weiter" über die URL (`?monat=<n>`,
 * Anzahl Monate ab dem aktuellen) — bewusst kein Client-Zustand, damit die
 * Seite eine reine Server-Komponente bleiben kann. Nur Anzeige, kein
 * Datepicker: die Eingabe bleibt bei den nativen "Von"/"Bis"-Feldern.
 */

type Zeitraum = { von: Date; bis: Date }

const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]
const MONATSNAMEN = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
]

const MAX_MONATSVERSATZ = 24

/** Für die Seiten, die den Kalender einbinden: liest `?monat=<n>` und
 * begrenzt auf einen sinnvollen Bereich (0 = aktueller Monat, keine
 * Vergangenheit, nicht beliebig weit in die Zukunft). */
export function monatsversatzAusSuchparameter(wert: string | undefined): number {
  const zahl = Number(wert)
  if (!Number.isInteger(zahl)) return 0
  return Math.min(Math.max(zahl, 0), MAX_MONATSVERSATZ)
}

function istBelegt(tag: Date, zeitraeume: Zeitraum[]): boolean {
  return zeitraeume.some((z) => {
    const von = berlinerTagesbeginn(z.von)
    const bis = berlinerTagesbeginn(z.bis)
    return tag >= von && tag <= bis
  })
}

export function Verfuegbarkeitskalender({
  belegteZeitraeume,
  monatsversatz,
  basePfad,
}: {
  belegteZeitraeume: Zeitraum[]
  monatsversatz: number
  basePfad: string
}) {
  const heute = berlinerTagesbeginn()
  const angezeigterMonat = new Date(Date.UTC(heute.getUTCFullYear(), heute.getUTCMonth() + monatsversatz, 1))
  const jahr = angezeigterMonat.getUTCFullYear()
  const monat = angezeigterMonat.getUTCMonth()

  const ersterTag = new Date(Date.UTC(jahr, monat, 1))
  const letzterTag = new Date(Date.UTC(jahr, monat + 1, 0))
  // Kalenderwoche beginnt Montag: Sonntag (0) ans Ende schieben.
  const startOffset = (ersterTag.getUTCDay() + 6) % 7

  const zellen: (Date | null)[] = [
    ...Array<null>(startOffset).fill(null),
    ...Array.from({ length: letzterTag.getUTCDate() }, (_, i) => new Date(Date.UTC(jahr, monat, i + 1))),
  ]
  while (zellen.length % 7 !== 0) zellen.push(null)

  const zurueckMoeglich = monatsversatz > 0
  const weiterMoeglich = monatsversatz < MAX_MONATSVERSATZ

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        {zurueckMoeglich ? (
          <Link
            href={`${basePfad}?monat=${monatsversatz - 1}`}
            className="rounded-lg p-2 text-sekundaer hover:bg-flaeche-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
            aria-label="Vorheriger Monat"
          >
            ‹
          </Link>
        ) : (
          <span className="p-2 text-neutral-200" aria-hidden>
            ‹
          </span>
        )}

        <p className="text-sm font-medium text-ueberschrift">
          {MONATSNAMEN[monat]} {jahr}
        </p>

        {weiterMoeglich ? (
          <Link
            href={`${basePfad}?monat=${monatsversatz + 1}`}
            className="rounded-lg p-2 text-sekundaer hover:bg-flaeche-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
            aria-label="Nächster Monat"
          >
            ›
          </Link>
        ) : (
          <span className="p-2 text-neutral-200" aria-hidden>
            ›
          </span>
        )}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {WOCHENTAGE.map((w) => (
          <div key={w} className="text-tertiaer">
            {w}
          </div>
        ))}
        {zellen.map((tag, i) => {
          if (!tag) return <div key={i} />

          const vergangen = tag < heute
          const belegt = istBelegt(tag, belegteZeitraeume)

          return (
            <div
              key={i}
              className={
                "rounded py-1.5 " +
                (belegt
                  ? "bg-flaeche-200 text-tertiaer"
                  : vergangen
                    ? "text-neutral-300"
                    : "bg-marke-gruen/15 text-ueberschrift")
              }
            >
              {tag.getUTCDate()}
            </div>
          )
        })}
      </div>

      <div className="flex gap-4 text-xs text-sekundaer">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-marke-gruen/15" /> frei
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-flaeche-200" /> belegt
        </span>
      </div>
    </div>
  )
}
