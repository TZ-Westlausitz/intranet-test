"use client"

import { useState } from "react"

import { DatumFeld } from "@/components/datum-feld"
import { heutigesDatumIso, teileInBerlinerZeit } from "@/lib/datum"

/**
 * Datum + Uhrzeit in einem Feld mit einem "Jetzt"-Button daneben, der Datum
 * und Uhrzeit einsetzt — spart Tippen, wenn der Werkstattleiter das Protokoll
 * direkt bei der Übergabe ausfüllt. Datum über DatumFeld (am Computer Tippen
 * oder unser Kalender, am Handy die Datumsauswahl des Geräts), Uhrzeit über
 * das Zeitfeld des Browsers/Geräts.
 *
 * Nach außen bleibt es EIN Formularfeld im Format "2026-10-17T09:30" (wie
 * vorher `datetime-local`): Datum und Uhrzeit gehören zusammen — ist nur eines
 * ausgefüllt, verlangt das andere die Eingabe (Browser-Meldung), statt dass die
 * halbe Eingabe stumm verloren geht.
 */
export function DatumUhrzeitFeld({
  name,
  required,
  defaultValue,
  groesse = "gross",
}: {
  name: string
  required?: boolean
  /** "2026-10-17T09:30" oder leer. */
  defaultValue?: string
  groesse?: "klein" | "gross"
}) {
  const [startDatum, startZeit] = (defaultValue ?? "").split("T")
  const [datum, setDatum] = useState(startDatum ?? "")
  const [zeit, setZeit] = useState((startZeit ?? "").slice(0, 5))

  function jetztEinsetzen() {
    const jetzt = teileInBerlinerZeit(new Date())
    setDatum(heutigesDatumIso())
    setZeit(`${jetzt.stunde}:${jetzt.minute}`)
  }

  const gross = groesse === "gross"

  return (
    <div className="flex flex-wrap items-start gap-2">
      <DatumFeld
        wert={datum}
        onAenderung={setDatum}
        required={required || zeit !== ""}
        ariaLabel="Datum"
        groesse={groesse}
        className="min-w-0 flex-1 basis-44"
      />
      <input
        type="time"
        aria-label="Uhrzeit"
        value={zeit}
        required={required || datum !== ""}
        onChange={(ereignis) => setZeit(ereignis.target.value)}
        className={
          "shrink-0 rounded-lg border border-flaeche-300 bg-flaeche text-primaer focus:border-marke-gruen focus:outline focus:outline-2 focus:outline-marke-gruen " +
          (gross ? "h-11 w-32 px-3 text-base" : "h-9 w-28 px-2 text-sm pointer-coarse:h-11")
        }
      />
      <button
        type="button"
        onClick={jetztEinsetzen}
        className={
          "shrink-0 rounded-lg border border-flaeche-300 px-3 text-sm font-medium text-primaer transition hover:border-marke-gruen hover:text-marke-gruen-dunkel " +
          (gross ? "h-11" : "h-9 pointer-coarse:h-11")
        }
      >
        Jetzt
      </button>
      <input type="hidden" name={name} value={datum && zeit ? `${datum}T${zeit}` : ""} />
    </div>
  )
}
