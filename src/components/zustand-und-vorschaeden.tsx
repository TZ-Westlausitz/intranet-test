"use client"

import { Fragment, useEffect, useRef, useState } from "react"

import { Schadensskizze, type Schadenspunkt } from "@/components/schadensskizze"

// Bordwerkzeug/Fahrzeugpapiere/Ladekabel sind Ausstattung, kein Schaden im
// eigentlichen Sinn — "fehlt" statt "Schaden" trifft es besser, und die
// Skizze (für Schadensorte am Fahrzeug) muss dafür nicht aufgehen. Ein
// fehlendes Stück wird stattdessen im Anmerkungsfeld unten notiert.
const ZUSTAND_PUNKTE = [
  { key: "karosserie", label: "Karosserie / Lack", zweiteOption: "Schaden", loestSkizzeAus: true },
  {
    key: "scheiben",
    label: "Windschutzscheibe / Scheiben",
    zweiteOption: "Schaden",
    loestSkizzeAus: true,
  },
  { key: "reifen", label: "Reifen / Felgen", zweiteOption: "Schaden", loestSkizzeAus: true },
  { key: "innenraum", label: "Innenraum / Polster", zweiteOption: "Schaden", loestSkizzeAus: true },
  {
    key: "bordwerkzeug",
    label: "Bordwerkzeug / Warndreieck / Verbandskasten",
    zweiteOption: "unvollständig",
    loestSkizzeAus: false,
  },
  {
    key: "fahrzeugpapiere",
    label: "Fahrzeugpapiere",
    zweiteOption: "unvollständig",
    loestSkizzeAus: false,
  },
  {
    key: "ladekabel",
    label: "Ladekabel / Zubehör (falls vorhanden)",
    zweiteOption: "unvollständig",
    loestSkizzeAus: false,
  },
] as const

type ZustandWert = "io" | "schaden" | ""

/** Wie lib/pdf/uebergabeprotokoll.ts#schadenspunkteAlsZeilen — dieselbe Kurzform, nur im Browser. */
function alsZeile(punkt: Omit<Schadenspunkt, "id">, i: number): string {
  return `${i + 1}. ${punkt.zone} – ${punkt.art}: ${punkt.beschreibung}`
}

/**
 * Zustandsabfrage + Skizze + Anmerkungsfeld zusammen, weil die Skizze vom
 * Zustand abhängt: Sie bleibt eingeklappt, solange kein einziger Punkt als
 * Schaden markiert wurde — dafür muss diese Komponente den Zustand aller
 * sieben Punkte kennen, nicht nur den eigenen. Das Anmerkungsfeld ganz unten
 * ist dagegen immer sichtbar, unabhängig vom Zustand.
 *
 * Bei der Rücknahme (phase="ruecknahme") kommt eine Zusammenfassung der
 * Vorschäden dazu: Die Kästchen starten dort alle auf i.O. — das heißt
 * "keine Veränderung gegenüber den Vorschäden", nicht "Fahrzeug einwandfrei".
 * Vorherige Schadenspunkte erscheinen grau in der Skizze, neue rot.
 */
export function ZustandUndVorschaeden({
  phase = "uebergabe",
  anfangsZustand,
  anfangsVorschaeden,
  anfangsSchadenspunkte,
  vorherigeSchadenspunkte,
  onNeuerSchadenChange,
}: {
  phase?: "uebergabe" | "ruecknahme"
  anfangsZustand?: Record<string, ZustandWert>
  anfangsVorschaeden?: string
  anfangsSchadenspunkte?: Omit<Schadenspunkt, "id">[]
  vorherigeSchadenspunkte?: Omit<Schadenspunkt, "id">[]
  onNeuerSchadenChange?: (neu: boolean) => void
} = {}) {
  const [zustand, setZustand] = useState<Record<string, ZustandWert>>(() => {
    if (anfangsZustand) return anfangsZustand
    // Bei der Rücknahme heißt "i.O." hier "keine Veränderung" — ohne
    // bestehenden Entwurf ist das der sinnvolle Ausgangspunkt für alle
    // sieben Punkte, nicht "noch nichts angeklickt".
    const standard = phase === "ruecknahme" ? "io" : ""
    return Object.fromEntries(ZUSTAND_PUNKTE.map((punkt) => [punkt.key, standard]))
  })
  const [skizzenStatus, setSkizzenStatus] = useState({
    anzahl: (anfangsSchadenspunkte ?? vorherigeSchadenspunkte)?.length ?? 0,
    hatNeue: false,
  })
  // Verankert die Anzahl-Prüfung unten im nativen Formular-Validierungslauf
  // (setCustomValidity) — konsistent mit jedem anderen Pflichtfeld hier,
  // statt einer eigenen onSubmit-Logik auf einem Formular, das dieser
  // Komponente gar nicht gehört.
  const anzahlPruefungRef = useRef<HTMLInputElement>(null)

  const mindestensEinSchaden = ZUSTAND_PUNKTE.some(
    (punkt) => punkt.loestSkizzeAus && zustand[punkt.key] === "schaden",
  )
  const mindestensEinUnvollstaendig = ZUSTAND_PUNKTE.some(
    (punkt) => !punkt.loestSkizzeAus && zustand[punkt.key] === "schaden",
  )
  const anzahlSchadenKategorien = ZUSTAND_PUNKTE.filter(
    (punkt) => punkt.loestSkizzeAus && zustand[punkt.key] === "schaden",
  ).length
  const benoetigteSkizzenAnzahl = anzahlSchadenKategorien >= 2 ? anzahlSchadenKategorien : 0
  const skizzeUnzureichend =
    benoetigteSkizzenAnzahl > 0 && skizzenStatus.anzahl < benoetigteSkizzenAnzahl

  useEffect(() => {
    anzahlPruefungRef.current?.setCustomValidity(
      skizzeUnzureichend
        ? `Bitte mindestens ${benoetigteSkizzenAnzahl} Schäden in der Skizze markieren und beschreiben (angekreuzt: ${anzahlSchadenKategorien}, markiert: ${skizzenStatus.anzahl}).`
        : "",
    )
  }, [skizzeUnzureichend, benoetigteSkizzenAnzahl, anzahlSchadenKategorien, skizzenStatus.anzahl])

  const neuerSchaden = mindestensEinSchaden || skizzenStatus.hatNeue
  useEffect(() => {
    onNeuerSchadenChange?.(neuerSchaden)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [neuerSchaden])

  const zeigeSkizze = mindestensEinSchaden || (vorherigeSchadenspunkte?.length ?? 0) > 0

  return (
    <>
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-sekundaer">
          Zustand &amp; Ausstattung bei {phase === "ruecknahme" ? "Rücknahme" : "Übergabe"}
        </h2>

        {phase === "ruecknahme" && vorherigeSchadenspunkte && vorherigeSchadenspunkte.length > 0 && (
          <div className="rounded-lg border border-rand bg-flaeche-schwach p-3 text-sm">
            <p className="font-medium text-primaer">Vorherige Schäden:</p>
            <ul className="mt-1 flex flex-col gap-0.5 text-primaer">
              {vorherigeSchadenspunkte.map((punkt, i) => (
                <li key={i}>{alsZeile(punkt, i)}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 gap-y-2 text-sm">
          {ZUSTAND_PUNKTE.map((punkt) => (
            <Fragment key={punkt.key}>
              <span className="border-b border-flaeche-100 py-1.5">{punkt.label}</span>
              <label className="flex items-center justify-start gap-1 border-b border-flaeche-100 py-1.5">
                <input
                  type="radio"
                  name={`zustand_${punkt.key}`}
                  value="io"
                  required
                  checked={zustand[punkt.key] === "io"}
                  onChange={() => setZustand((z) => ({ ...z, [punkt.key]: "io" }))}
                />
                i.O.
              </label>
              <label className="flex items-center justify-start gap-1 border-b border-flaeche-100 py-1.5">
                <input
                  type="radio"
                  name={`zustand_${punkt.key}`}
                  value="schaden"
                  required
                  checked={zustand[punkt.key] === "schaden"}
                  onChange={() => setZustand((z) => ({ ...z, [punkt.key]: "schaden" }))}
                />
                {punkt.zweiteOption}
              </label>
            </Fragment>
          ))}
        </div>

        {mindestensEinUnvollstaendig && (
          <p className="text-xs text-red-700">
            Unvollständige Gegenstände im Kommentarfeld auflisten
          </p>
        )}

        {skizzeUnzureichend && (
          <p className="text-xs text-red-700">
            Bitte mindestens {benoetigteSkizzenAnzahl} Schäden in der Skizze markieren und
            beschreiben — angekreuzt: {anzahlSchadenKategorien}, markiert: {skizzenStatus.anzahl}.
          </p>
        )}

        <input
          ref={anzahlPruefungRef}
          type="text"
          defaultValue="ok"
          aria-hidden="true"
          tabIndex={-1}
          className="sr-only"
        />
      </div>

      {zeigeSkizze && (
        <Schadensskizze
          name="schadenspunkte"
          autoInnenraum={zustand.innenraum === "schaden"}
          anfangsPunkte={
            anfangsSchadenspunkte ??
            vorherigeSchadenspunkte?.map((p) => ({ ...p, istVorschaden: true }))
          }
          onStatusChange={setSkizzenStatus}
        />
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">
          {phase === "ruecknahme"
            ? "weitere Anmerkungen zur Rücknahme:"
            : "weitere Anmerkungen vor der Fahrzeugübergabe:"}
        </span>
        <textarea
          name="vorschaeden"
          rows={3}
          required={mindestensEinUnvollstaendig}
          defaultValue={anfangsVorschaeden}
          placeholder="Eine Angabe pro Zeile"
          className="rounded-lg border border-flaeche-300 px-3 py-2.5 text-base focus:border-marke-gruen focus:outline focus:outline-2 focus:outline-marke-gruen"
        />
      </label>
    </>
  )
}
