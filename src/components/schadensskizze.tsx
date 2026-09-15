"use client"

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react"

/**
 * Klick-Skizze für Schadensstellen auf der Fahrzeug-Draufsicht. Ergänzt das
 * freie Vorschäden-Textfeld um eine Position — die Zone (z.B. "Laderaum
 * hinten links") wird aus der Klickposition automatisch benannt, damit die
 * Textzeile später auch ohne das Bild eindeutig bleibt.
 *
 * Die Punkte werden als relative Koordinaten (0–1) in ein verstecktes
 * Formularfeld serialisiert, nicht als Bild — dieselbe Skizze lässt sich so
 * serverseitig mit den echten Werten in die PDF zeichnen (siehe
 * lib/pdf/uebergabeprotokoll.ts).
 */

// Querformat: vorn liegt links, hinten rechts — dieselbe Draufsicht wie
// zuvor, nur um 90° gedreht, damit die Skizze im Formular nicht so hoch
// baut. Die Zeichnung ist deshalb um 90° gedreht gegenüber der Vorlage, mit
// der lib/pdf/uebergabeprotokoll.ts weiterhin im ursprünglichen Hochformat
// zeichnet (siehe Kommentar dort zum x/y-Tausch).
const VB_BREITE = 680
const VB_HOEHE = 300
// Reiner Anzeigerand links/rechts, damit "VORN"/"HECK" nicht an der Kante
// abgeschnitten werden — ändert nur das sichtbare viewBox-Fenster, nicht die
// Koordinaten der Zeichnung oder die Bruchrechnung unten (die bleibt auf
// VB_BREITE/VB_HOEHE bezogen).
const ANZEIGE_RAND = 30

const ZEILEN = [
  { bis: 81, name: "Front" },
  { bis: 127, name: "Motorhaube" },
  { bis: 172, name: "Frontscheibe" },
  { bis: 255, name: "Fahrerhaus" },
  { bis: 420, name: "Laderaum vorn" },
  { bis: 565, name: "Laderaum hinten" },
  { bis: Infinity, name: "Heck" },
] as const

// Deckt sich mit den gezeichneten Rad-Rechtecken weiter unten, nur mit ein
// paar Einheiten Luft ringsum — die Räder sind auf dem Bildschirm sonst ein
// zu kleines Ziel zum Antippen.
const RAD_POLSTER = 8
const RAEDER = [
  { x: 184, y: 43, breite: 46, hoehe: 14, zone: "Reifen/Felge rechts vorn" },
  { x: 184, y: 243, breite: 46, hoehe: 14, zone: "Reifen/Felge links vorn" },
  { x: 480, y: 43, breite: 46, hoehe: 14, zone: "Reifen/Felge rechts hinten" },
  { x: 480, y: 243, breite: 46, hoehe: 14, zone: "Reifen/Felge links hinten" },
] as const

const ARTEN = [
  "Kratzer",
  "Delle",
  "Lackschaden / Steinschlag",
  "Glasbruch / Riss",
  "Verschmutzung",
  "Sonstiges",
] as const

const REIFEN_ARTEN = [
  "Felge zerkratzt",
  "Gummischaden",
  "Luftverlust",
  "Nagel (o.Ä.) eingefahren",
  "Sonstiges",
] as const

const INNENRAUM_ARTEN = [
  "Sitze",
  "Display",
  "Türtafeln",
  "Lenkrad",
  "Kofferraum / Ladefläche",
  "Sonstiges",
] as const

// Reifen/Felge und Innenraum haben eigene Schadensarten — Kratzer/Delle/
// Lackschaden passen dort nicht.
function artenFuerZone(zone: string): readonly string[] {
  if (zone.startsWith("Reifen/Felge")) return REIFEN_ARTEN
  if (zone === "Innenraum") return INNENRAUM_ARTEN
  return ARTEN
}

// Dieselbe Fläche wie das gezeichnete Dachfenster weiter unten — Grundlage
// für den Mittelpunkt, an dem der Innenraum-Punkt automatisch gesetzt wird.
const DACHFENSTER = { x: 185, y: 113, breite: 55, hoehe: 74 }

export type Schadenspunkt = {
  id: string
  x: number
  y: number
  zone: string
  art: string
  beschreibung: string
  /**
   * Nur bei der Rücknahme relevant: markiert einen Punkt, der schon bei der
   * Ausgabe dokumentiert war ("Vorherige Schäden") — wird grau statt rot
   * dargestellt und nicht mehr bearbeitet, damit alte und neue Schäden auf
   * einen Blick auseinanderzuhalten sind.
   */
  istVorschaden?: boolean
}

function zoneFuer(x: number, y: number): string {
  const rad = RAEDER.find(
    (r) =>
      x >= r.x - RAD_POLSTER &&
      x <= r.x + r.breite + RAD_POLSTER &&
      y >= r.y - RAD_POLSTER &&
      y <= r.y + r.hoehe + RAD_POLSTER,
  )
  if (rad) return rad.zone

  // Im Querformat läuft vorn→hinten über x, links→rechts über y — und zwar
  // andersherum, als man auf den ersten Blick denkt: Die Zeichnung zeigt das
  // Fahrzeug von oben mit der Front nach links. Fährt es in diese Richtung
  // los, zeigt die eigene rechte Hand nach oben im Bild (kleines y) und die
  // linke nach unten (großes y) — nicht umgekehrt.
  const zeile = ZEILEN.find((z) => x < z.bis)?.name ?? "Heck"
  let seite: string
  if (y < 55) seite = "rechte Außenkante"
  else if (y > 245) seite = "linke Außenkante"
  else if (y < 118) seite = "rechts"
  else if (y > 182) seite = "links"
  else seite = "mittig"
  // Mittig im hinteren Laderaum ist von oben gesehen die Dachfläche, kein
  // "Laderaum hinten mittig" — das benennt den tatsächlichen Ort genauer.
  if (zeile === "Laderaum hinten" && seite === "mittig") return "Dach"
  return `${zeile} ${seite}`
}

export function Schadensskizze({
  name,
  autoInnenraum,
  anfangsPunkte,
  onStatusChange,
}: {
  name: string
  autoInnenraum?: boolean
  anfangsPunkte?: Omit<Schadenspunkt, "id">[]
  onStatusChange?: (status: { anzahl: number; hatNeue: boolean }) => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const naechsteId = useRef(anfangsPunkte?.length ?? 0)
  // Nach dem Loslassen eines gezogenen Markers folgt ein click-Event auf
  // demselben Punkt — ohne diese Sperre würde das einen zweiten Punkt setzen.
  const ziehenAktivRef = useRef(false)
  // Strict Mode führt den ersten Effect-Durchlauf einer neu gemounteten
  // Komponente zweimal aus (Entwicklungsmodus) — ohne diese Sperre legt der
  // Innenraum-Auto-Punkt unten sonst zwei Stellen statt einer an.
  const autoInnenraumGesetztRef = useRef(false)

  const [punkte, setPunkte] = useState<Schadenspunkt[]>(() =>
    (anfangsPunkte ?? []).map((p, i) => ({ ...p, id: `anfangs-${i}` })),
  )
  const [ausgewaehlt, setAusgewaehlt] = useState<string | null>(null)

  // Verstecktes Feld direkt aus dem State berechnet (kontrolliert), nicht
  // per ref imperativ gesetzt: Ein per ref gesetzter `.value` auf einem
  // unkontrollierten Feld wird von React beim nächsten Re-Render eines
  // Nachbarn (z.B. Klick auf ein Zustand-Radiobutton daneben) wieder auf
  // `defaultValue` zurückgesetzt — das kostete uns schon einmal Marker beim
  // Absenden.
  const schadenspunkteJson = JSON.stringify(
    punkte.map(({ x, y, zone, art, beschreibung, istVorschaden }) => ({
      x,
      y,
      zone,
      art,
      beschreibung,
      istVorschaden,
    })),
  )

  // Innenraum/Polster oben als Schaden markiert → gleich einen Punkt am
  // Dachfenster vorlegen, unten muss nur noch die Beschreibung ausgefüllt
  // werden. Nur einmalig, kein erneutes Anlegen beim Hin- und Herschalten
  // und keine Dopplung, falls die Stelle schon manuell gesetzt wurde.
  useEffect(() => {
    if (!autoInnenraum || autoInnenraumGesetztRef.current) return
    if (punkte.some((p) => p.zone === "Innenraum")) return
    autoInnenraumGesetztRef.current = true
    naechsteId.current += 1
    const neu: Schadenspunkt = {
      id: `s${naechsteId.current}`,
      x: (DACHFENSTER.x + DACHFENSTER.breite / 2) / VB_BREITE,
      y: (DACHFENSTER.y + DACHFENSTER.hoehe / 2) / VB_HOEHE,
      zone: "Innenraum",
      art: "",
      beschreibung: "",
    }
    setPunkte((vorherige) => [...vorherige, neu])
    setAusgewaehlt(neu.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoInnenraum])

  // Meldet Anzahl und "gibt es etwas Neues" nach oben — die Zustandsabfrage
  // prüft damit, ob mindestens so viele Stellen markiert wurden wie
  // Kategorien als Schaden angekreuzt sind, und ob bei der Rücknahme
  // überhaupt ein neuer Schaden hinzugekommen ist.
  const anzahlNeue = punkte.filter((p) => !p.istVorschaden).length
  useEffect(() => {
    // "anzahl" zählt nur neue Punkte — nur die belegen frischen Schaden.
    // Bei der Ausgabe ist ohnehin jeder Punkt neu, dort ändert sich nichts.
    onStatusChange?.({ anzahl: anzahlNeue, hatNeue: anzahlNeue > 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anzahlNeue])

  function svgPunktAus(ev: { clientX: number; clientY: number }) {
    const svg = svgRef.current
    if (!svg) return null
    const punkt = svg.createSVGPoint()
    punkt.x = ev.clientX
    punkt.y = ev.clientY
    const matrix = svg.getScreenCTM()
    if (!matrix) return null
    return punkt.matrixTransform(matrix.inverse())
  }

  function aufSkizzeKlicken(ev: ReactPointerEvent<SVGSVGElement>) {
    if (ziehenAktivRef.current) return
    const p = svgPunktAus(ev)
    if (!p) return
    naechsteId.current += 1
    const zone = zoneFuer(p.x, p.y)
    const neu: Schadenspunkt = {
      id: `s${naechsteId.current}`,
      x: Math.max(0, Math.min(1, +(p.x / VB_BREITE).toFixed(4))),
      y: Math.max(0, Math.min(1, +(p.y / VB_HOEHE).toFixed(4))),
      zone,
      art: "",
      beschreibung: "",
    }
    setAusgewaehlt(neu.id)
    setPunkte((vorherige) => [...vorherige, neu])
  }

  // Für Sonderzonen wie das Dachfenster: der Ort ist fest vorgegeben (z.B.
  // "Innenraum"), unabhängig davon, wo genau innerhalb der Zone geklickt wurde.
  function sonderzoneKlicken(ev: ReactMouseEvent<SVGElement>, zone: string) {
    ev.stopPropagation()
    const p = svgPunktAus(ev)
    if (!p) return
    naechsteId.current += 1
    const neu: Schadenspunkt = {
      id: `s${naechsteId.current}`,
      x: +(p.x / VB_BREITE).toFixed(4),
      y: +(p.y / VB_HOEHE).toFixed(4),
      zone,
      art: "",
      beschreibung: "",
    }
    setAusgewaehlt(neu.id)
    setPunkte((vorherige) => [...vorherige, neu])
  }

  function markerZiehenStart(ev: ReactPointerEvent<SVGGElement>, id: string) {
    ev.stopPropagation()
    ev.currentTarget.setPointerCapture(ev.pointerId)
    setAusgewaehlt(id)
  }

  function markerZiehenBewegen(ev: ReactPointerEvent<SVGGElement>, id: string) {
    if (!ev.currentTarget.hasPointerCapture(ev.pointerId)) return
    const p = svgPunktAus(ev)
    if (!p) return
    ziehenAktivRef.current = true
    const x = Math.max(0, Math.min(1, p.x / VB_BREITE))
    const y = Math.max(0, Math.min(1, p.y / VB_HOEHE))
    const zone = zoneFuer(x * VB_BREITE, y * VB_HOEHE)
    setPunkte((vorherige) =>
      vorherige.map((punkt) => {
        if (punkt.id !== id) return punkt
        const arten = artenFuerZone(zone)
        return {
          ...punkt,
          x: +x.toFixed(4),
          y: +y.toFixed(4),
          zone,
          art: arten.includes(punkt.art) ? punkt.art : "",
        }
      }),
    )
  }

  function markerZiehenEnde() {
    if (ziehenAktivRef.current) {
      setTimeout(() => {
        ziehenAktivRef.current = false
      }, 0)
    }
  }

  function feldAendern(id: string, feld: "art" | "beschreibung", wert: string) {
    setPunkte((vorherige) => vorherige.map((p) => (p.id === id ? { ...p, [feld]: wert } : p)))
  }

  function entfernen(id: string) {
    if (ausgewaehlt === id) setAusgewaehlt(null)
    setPunkte((vorherige) => vorherige.filter((p) => p.id !== id))
  }

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name={name} value={schadenspunkteJson} readOnly />

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Schadensskizze</span>
        <span className="text-xs text-sekundaer">
          {punkte.length} {punkte.length === 1 ? "Stelle" : "Stellen"}
        </span>
      </div>

      {/* bg-neutral-50/border-neutral-200 bewusst literal, nicht die
          Farbschema-Tokens: die Skizze landet 1:1 im gedruckten Protokoll
          (weißes Papier) und die Fahrzeug-Umrisslinien im SVG unten haben
          selbst feste, helle Füllfarben — auf dunklem Grund kaum noch zu
          erkennen. */}
      <div className="mx-auto w-full max-w-[480px] rounded-lg border border-neutral-200 bg-neutral-50 p-2">
        <svg
          ref={svgRef}
          viewBox={`${-ANZEIGE_RAND} 0 ${VB_BREITE + 2 * ANZEIGE_RAND} ${VB_HOEHE}`}
          className="block w-full cursor-crosshair touch-manipulation"
          onClick={aufSkizzeKlicken}
        >
          <text x="20" y="154" textAnchor="middle" fontSize="13" fontWeight="600" letterSpacing="3" fill="#868B7B">
            VORN
          </text>
          <text x="668" y="154" textAnchor="middle" fontSize="13" fontWeight="600" letterSpacing="3" fill="#868B7B">
            HECK
          </text>

          <g fill="#6F7466">
            <rect x="184" y="43" width="46" height="14" rx="4" />
            <rect x="184" y="243" width="46" height="14" rx="4" />
            <rect x="480" y="43" width="46" height="14" rx="4" />
            <rect x="480" y="243" width="46" height="14" rx="4" />
          </g>

          <path
            d="M 55,83 L 55,217 Q 55,245 92,245 L 600,245 Q 615,245 615,230 L 615,70 Q 615,55 600,55 L 92,55 Q 55,55 55,83 Z"
            fill="#E4E5DA"
            stroke="#9AA08D"
            strokeWidth="2.5"
          />
          <path
            d="M 86,60 Q 62,60 62,86 L 62,214 Q 62,240 86,240"
            fill="none"
            stroke="#9AA08D"
            strokeWidth="2"
          />
          <rect x="90" y="74" width="36" height="152" rx="8" fill="#EFEFE7" stroke="#9AA08D" strokeWidth="1.6" />
          <polygon points="128,68 128,232 170,226 170,74" fill="#CFD8D3" stroke="#9AA08D" strokeWidth="1.6" />
          <rect x="178" y="68" width="428" height="164" rx="8" fill="#EFEFE7" stroke="#9AA08D" strokeWidth="1.6" />

          <rect
            x={DACHFENSTER.x}
            y={DACHFENSTER.y}
            width={DACHFENSTER.breite}
            height={DACHFENSTER.hoehe}
            rx="10"
            fill="#CFD8D3"
            stroke="#8FA79E"
            strokeWidth="1.6"
            strokeDasharray="4 3"
            className="cursor-pointer"
            onClick={(ev) => sonderzoneKlicken(ev, "Innenraum")}
          >
            <title>Dachfenster — Ort: Innenraum</title>
          </rect>

          {punkte.map((punkt, i) =>
            punkt.istVorschaden ? (
              // Vorherige Schäden: nur zur Einordnung, grau, nicht mehr
              // verschiebbar oder löschbar — Details stehen in der
              // Zusammenfassung "Vorherige Schäden" oben im Formular.
              <g key={punkt.id} transform={`translate(${punkt.x * VB_BREITE},${punkt.y * VB_HOEHE})`}>
                <circle r="13" fill="#9CA3AF" stroke="#EFEFE7" strokeWidth="2.5" />
                <text textAnchor="middle" dy="4.5" fontSize="13" fontWeight="600" fill="#fff" pointerEvents="none">
                  {i + 1}
                </text>
              </g>
            ) : (
              <g
                key={punkt.id}
                transform={`translate(${punkt.x * VB_BREITE},${punkt.y * VB_HOEHE})`}
                className="cursor-grab active:cursor-grabbing"
                onPointerDown={(ev) => markerZiehenStart(ev, punkt.id)}
                onPointerMove={(ev) => markerZiehenBewegen(ev, punkt.id)}
                onPointerUp={markerZiehenEnde}
              >
                <circle
                  r="13"
                  fill="#BC3A24"
                  stroke={ausgewaehlt === punkt.id ? "#1A1D16" : "#EFEFE7"}
                  strokeWidth={ausgewaehlt === punkt.id ? 3 : 2.5}
                />
                <text textAnchor="middle" dy="4.5" fontSize="13" fontWeight="600" fill="#fff" pointerEvents="none">
                  {i + 1}
                </text>
              </g>
            ),
          )}
        </svg>
      </div>

      <p className="text-center text-xs text-tertiaer">
        Auf die Skizze tippen setzt eine Schadensstelle. Marker antippen und ziehen, um ihn zu verschieben.
      </p>

      {anzahlNeue > 0 && (
        <div className="flex flex-col gap-2">
          {punkte.map((punkt, i) =>
            punkt.istVorschaden ? null : (
            <div
              key={punkt.id}
              className="flex flex-col gap-2 rounded-lg border border-rand p-3 text-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-medium">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#BC3A24] text-xs font-semibold text-white">
                    {i + 1}
                  </span>
                  {punkt.zone}
                </span>
                <button
                  type="button"
                  onClick={() => entfernen(punkt.id)}
                  aria-label={`Schadensstelle ${i + 1} löschen`}
                  className="rounded-md px-1.5 py-0.5 text-tertiaer hover:bg-red-50 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
              <select
                value={punkt.art}
                onChange={(ev) => feldAendern(punkt.id, "art", ev.target.value)}
                required
                className="rounded-lg border border-flaeche-300 px-2.5 py-2 text-sm focus:border-marke-gruen focus:outline focus:outline-2 focus:outline-marke-gruen"
              >
                <option value="" disabled>
                  - bitte auswählen -
                </option>
                {artenFuerZone(punkt.zone).map((art) => (
                  <option key={art} value={art}>
                    {art}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={punkt.beschreibung}
                onChange={(ev) => feldAendern(punkt.id, "beschreibung", ev.target.value)}
                required
                placeholder="z.B. Lage und Größe angeben"
                className="rounded-lg border border-flaeche-300 px-2.5 py-2 text-sm focus:border-marke-gruen focus:outline focus:outline-2 focus:outline-marke-gruen"
              />
            </div>
            ),
          )}
        </div>
      )}
    </div>
  )
}
