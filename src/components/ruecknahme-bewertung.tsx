"use client"

import { useEffect, useRef, useState } from "react"

import { ZustandUndVorschaeden } from "@/components/zustand-und-vorschaeden"
import type { Schadenspunkt } from "@/components/schadensskizze"

const TANKFUELLUNG_OPTIONEN = [
  { wert: "VOLL", label: "voll" },
  { wert: "DREI_VIERTEL", label: "¾" },
  { wert: "HALB", label: "½" },
  { wert: "VIERTEL", label: "¼" },
  { wert: "LEER", label: "leer" },
] as const

// Reihenfolge von leer nach voll — Index-Vergleich sagt, ob bei der
// Rücknahme weniger Sprit im Tank ist als bei der Ausgabe.
const TANK_REIHENFOLGE = ["LEER", "VIERTEL", "HALB", "DREI_VIERTEL", "VOLL"]

type Abrechnung = { keineKosten: boolean; kraftstoffkosten: boolean; schaden: boolean }

/**
 * Tankfüllung, Zustand/Skizze und Abrechnung zusammen, weil sie sich
 * gegenseitig beeinflussen: sinkt der Tankstand gegenüber der Ausgabe,
 * hakt sich "Kraftstoffkosten" von selbst an; meldet die Zustandsabfrage
 * neuen Schaden, hakt sich "Schaden vorhanden" von selbst an. Beides bleibt
 * danach normal von Hand änderbar — dieselbe Idee wie beim "Von"/"Bis" im
 * Anfrageformular.
 */
export function RuecknahmeBewertung({
  ausgabeTankfuellung,
  anfangsTankfuellung,
  vorherigeSchadenspunkte,
  anfangsZustand,
  anfangsVorschaeden,
  anfangsSchadenspunkte,
  anfangsAbrechnung,
}: {
  ausgabeTankfuellung: string
  anfangsTankfuellung?: string
  vorherigeSchadenspunkte: Omit<Schadenspunkt, "id">[]
  anfangsZustand?: Record<string, "io" | "schaden" | "">
  anfangsVorschaeden?: string
  anfangsSchadenspunkte?: Omit<Schadenspunkt, "id">[]
  anfangsAbrechnung?: Abrechnung
}) {
  const [tankfuellung, setTankfuellung] = useState(anfangsTankfuellung ?? "")
  const [abrechnung, setAbrechnung] = useState<Abrechnung>(
    anfangsAbrechnung ?? { keineKosten: false, kraftstoffkosten: false, schaden: false },
  )
  const neuerSchadenVorherRef = useRef(false)
  const abrechnungPruefungRef = useRef<HTMLInputElement>(null)

  function tankfuellungAendern(neu: string) {
    setTankfuellung(neu)
    const alterIndex = TANK_REIHENFOLGE.indexOf(ausgabeTankfuellung)
    const neuerIndex = TANK_REIHENFOLGE.indexOf(neu)
    if (alterIndex !== -1 && neuerIndex !== -1 && neuerIndex < alterIndex) {
      setAbrechnung((a) => ({ ...a, kraftstoffkosten: true, keineKosten: false }))
    }
  }

  function neuerSchadenGemeldet(neu: boolean) {
    if (neu && !neuerSchadenVorherRef.current) {
      setAbrechnung((a) => ({ ...a, schaden: true, keineKosten: false }))
    }
    neuerSchadenVorherRef.current = neu
  }

  function keineKostenAendern(checked: boolean) {
    setAbrechnung({ keineKosten: checked, kraftstoffkosten: false, schaden: false })
  }
  function kraftstoffkostenAendern(checked: boolean) {
    setAbrechnung((a) => ({ ...a, kraftstoffkosten: checked, keineKosten: checked ? false : a.keineKosten }))
  }
  function schadenAendern(checked: boolean) {
    setAbrechnung((a) => ({ ...a, schaden: checked, keineKosten: checked ? false : a.keineKosten }))
  }

  const abrechnungLeer = !abrechnung.keineKosten && !abrechnung.kraftstoffkosten && !abrechnung.schaden
  useEffect(() => {
    abrechnungPruefungRef.current?.setCustomValidity(
      abrechnungLeer ? "Bitte mindestens eine Abrechnungsoption auswählen." : "",
    )
  }, [abrechnungLeer])

  return (
    <>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium">Tankfüllung</legend>
        <div className="flex flex-wrap gap-3">
          {TANKFUELLUNG_OPTIONEN.map((option) => (
            <label key={option.wert} className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                name="tankfuellung"
                value={option.wert}
                required
                checked={tankfuellung === option.wert}
                onChange={() => tankfuellungAendern(option.wert)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <ZustandUndVorschaeden
        phase="ruecknahme"
        anfangsZustand={anfangsZustand}
        anfangsVorschaeden={anfangsVorschaeden}
        anfangsSchadenspunkte={anfangsSchadenspunkte}
        vorherigeSchadenspunkte={vorherigeSchadenspunkte}
        onNeuerSchadenChange={neuerSchadenGemeldet}
      />

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium text-neutral-500">Abrechnung</legend>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="abrechnung_keine_kosten"
            checked={abrechnung.keineKosten}
            onChange={(ev) => keineKostenAendern(ev.target.checked)}
            className="mt-1"
          />
          <span>Keine Kosten (kein Schaden festgestellt, vollgetankt zurückgegeben)</span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="abrechnung_kraftstoffkosten"
            checked={abrechnung.kraftstoffkosten}
            onChange={(ev) => kraftstoffkostenAendern(ev.target.checked)}
            className="mt-1"
          />
          <span>Kraftstoffkosten werden in Rechnung gestellt (siehe Tankfüllung oben)</span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="abrechnung_schaden"
            checked={abrechnung.schaden}
            onChange={(ev) => schadenAendern(ev.target.checked)}
            className="mt-1"
          />
          <span>
            Schaden vorhanden – Kosten werden gemäß Selbstbehaltsregelung der
            Nutzungsvereinbarung gesondert ermittelt und abgerechnet.
          </span>
        </label>

        <input
          ref={abrechnungPruefungRef}
          type="text"
          defaultValue="ok"
          aria-hidden="true"
          tabIndex={-1}
          className="sr-only"
        />
      </fieldset>
    </>
  )
}
