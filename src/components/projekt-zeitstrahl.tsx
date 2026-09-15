import { formatiereDatumAusDate } from "@/lib/datum"
import { zwischenzielStatus, ZWISCHENZIEL_STATUS_KLASSEN } from "@/lib/projekte-optionen"

export type ZwischenzielAnzeige = {
  id: string
  titel: string
  frist: Date
  erreicht: boolean
  aufgabenErledigt: number
  aufgabenGesamt: number
}

/** (datum - start) / (ende - start), auf 0–100 % geklammert — heute kann vor start oder nach ende liegen. */
function positionProzent(datum: Date, start: Date, ende: Date): number {
  const gesamt = ende.getTime() - start.getTime()
  if (gesamt <= 0) return 0
  const anteil = (datum.getTime() - start.getTime()) / gesamt
  return Math.min(100, Math.max(0, anteil * 100))
}

/**
 * Der Balken darf nie an einem später erreichten Zwischenziel "vorbei-
 * springen", während ein früheres noch offen ist — er wandert deshalb
 * Schritt für Schritt in Reihenfolge der Zwischenziele, nicht einfach bis
 * zur Position des zuletzt erreichten. Innerhalb des aktuellen (ersten noch
 * nicht erreichten) Zwischenziels bewegt er sich zusätzlich anteilig mit
 * dessen eigenem Aufgaben-Fortschritt — bei 3 Aufgaben also in 3 Schritten,
 * nicht erst als Sprung, wenn die letzte davon fertig ist.
 */
function berechneFuellPosition(zwischenziele: ZwischenzielAnzeige[], start: Date, ende: Date): number {
  if (zwischenziele.length === 0) return 0

  const aktuellerIndex = zwischenziele.findIndex((z) => !z.erreicht)

  if (aktuellerIndex === -1) {
    return positionProzent(zwischenziele[zwischenziele.length - 1].frist, start, ende)
  }

  const aktuelles = zwischenziele[aktuellerIndex]
  const segmentStart = aktuellerIndex === 0 ? 0 : positionProzent(zwischenziele[aktuellerIndex - 1].frist, start, ende)
  const segmentEnde = positionProzent(aktuelles.frist, start, ende)
  const anteilAktuelles = aktuelles.aufgabenGesamt > 0 ? aktuelles.aufgabenErledigt / aktuelles.aufgabenGesamt : 0

  return segmentStart + (segmentEnde - segmentStart) * anteilAktuelles
}

// Halbe Breite der größten Markierung (der 24px-Kreis, siehe unten) — der
// `left`-Wert wird per CSS clamp() auf diesen Abstand zu beiden Rändern
// begrenzt, damit eine Markierung nahe 0 % oder 100 % nicht zur Hälfte aus
// der Kachel herausragt (reine Prozent-Positionierung + -translate-x-1/2
// würde das an den Rändern sonst tun, weil der Versatz ein fester
// Pixelwert ist, der mit der Prozentposition nicht mitskaliert).
const MARKIERUNG_RAND_ABSTAND = "12px"

/**
 * Statusleiste: EIN Balken, der sich Zwischenziel für Zwischenziel und
 * Aufgabe für Aufgabe vorarbeitet (siehe berechneFuellPosition) — nicht
 * bis "heute", denn das reine Verstreichen von Zeit sagt nichts über
 * tatsächlichen Fortschritt aus. Jedes Zwischenziel bekommt zusätzlich
 * eine nummerierte, farbige Markierung an seiner Datums-Position: grün =
 * erreicht, rot = überfällig (Frist verstrichen, noch nicht erreicht),
 * orange = offen, noch nicht fällig. Damit erübrigt sich ein separater
 * Heute-Marker — die Farbe sagt bereits, wo das Projekt gegenüber dem
 * Kalender steht. Ein Schimmer läuft über die Füllung (siehe
 * .zwischenziel-balken-fuellung in globals.css), damit der Balken auch bei
 * gleichbleibender Breite lebendig wirkt.
 */
export function ProjektZeitstrahl({
  start,
  ende,
  heute,
  zwischenziele,
}: {
  start: Date
  ende: Date
  heute: Date
  zwischenziele: ZwischenzielAnzeige[]
}) {
  const fuellPosition = berechneFuellPosition(zwischenziele, start, ende)

  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-tertiaer">
        <span>{formatiereDatumAusDate(start)}</span>
        <span>{formatiereDatumAusDate(ende)}</span>
      </div>

      <div className="relative mt-3 mb-12 h-2.5 rounded-full bg-flaeche-200">
        <div
          className="zwischenziel-balken-fuellung h-2.5 rounded-full bg-marke-gruen transition-all"
          style={{ width: `${fuellPosition}%` }}
        />

        {zwischenziele.map((zwischenziel, index) => {
          const position = positionProzent(zwischenziel.frist, start, ende)
          const status = zwischenzielStatus(zwischenziel, heute)
          return (
            <div
              key={zwischenziel.id}
              className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
              style={{ left: `clamp(${MARKIERUNG_RAND_ABSTAND}, ${position}%, calc(100% - ${MARKIERUNG_RAND_ABSTAND}))` }}
              title={`${zwischenziel.titel} — ${formatiereDatumAusDate(zwischenziel.frist)}`}
            >
              <span className={"h-2.5 w-2.5 rounded-sm border-2 border-white shadow " + ZWISCHENZIEL_STATUS_KLASSEN[status]} />
              <span className="h-3 w-px bg-flaeche-300" />
              <span
                className={
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow " +
                  ZWISCHENZIEL_STATUS_KLASSEN[status]
                }
              >
                {index + 1}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
