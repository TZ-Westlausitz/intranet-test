import Link from "next/link"

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

function ohneUhrzeit(datum: Date): Date {
  return new Date(datum.getFullYear(), datum.getMonth(), datum.getDate())
}

function istBelegt(tag: Date, zeitraeume: Zeitraum[]): boolean {
  return zeitraeume.some((z) => {
    const von = ohneUhrzeit(z.von)
    const bis = ohneUhrzeit(z.bis)
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
  const heute = ohneUhrzeit(new Date())
  const angezeigterMonat = new Date(heute.getFullYear(), heute.getMonth() + monatsversatz, 1)
  const jahr = angezeigterMonat.getFullYear()
  const monat = angezeigterMonat.getMonth()

  const ersterTag = new Date(jahr, monat, 1)
  const letzterTag = new Date(jahr, monat + 1, 0)
  // Kalenderwoche beginnt Montag: Sonntag (0) ans Ende schieben.
  const startOffset = (ersterTag.getDay() + 6) % 7

  const zellen: (Date | null)[] = [
    ...Array<null>(startOffset).fill(null),
    ...Array.from({ length: letzterTag.getDate() }, (_, i) => new Date(jahr, monat, i + 1)),
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
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
            aria-label="Vorheriger Monat"
          >
            ‹
          </Link>
        ) : (
          <span className="p-2 text-neutral-200" aria-hidden>
            ‹
          </span>
        )}

        <p className="text-sm font-medium text-marke-grau">
          {MONATSNAMEN[monat]} {jahr}
        </p>

        {weiterMoeglich ? (
          <Link
            href={`${basePfad}?monat=${monatsversatz + 1}`}
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
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
          <div key={w} className="text-neutral-400">
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
                  ? "bg-neutral-200 text-neutral-400"
                  : vergangen
                    ? "text-neutral-300"
                    : "bg-marke-gruen/15 text-marke-grau")
              }
            >
              {tag.getDate()}
            </div>
          )
        })}
      </div>

      <div className="flex gap-4 text-xs text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-marke-gruen/15" /> frei
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-neutral-200" /> belegt
        </span>
      </div>
    </div>
  )
}
