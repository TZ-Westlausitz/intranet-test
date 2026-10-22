"use client"

import { useState } from "react"

import { FormularAenderungenSchutz } from "@/components/formular-aenderungen-schutz"

import { Hinweis } from "@/components/hinweis"
import { heutigesDatumIso } from "@/lib/datum"
import { DatumFeld } from "@/components/datum-feld"

/**
 * Client-Komponente nur für die Interaktivität der beiden Datumsfelder
 * (automatisches Nachziehen von "Bis", sobald "Von" darüber hinausrutscht,
 * plus `min` gegen ein von Hand gewähltes "Bis" vor "Von") — derselbe
 * Mechanismus wie bei AnfrageFormular (Fahrzeug mieten) und beim
 * ganztägigen Termin (TerminFormFelder).
 */
export function AusleiheAnlegenFormular({
  fahrzeugId,
  aktion,
  entleiherOptionen,
  fehler,
}: {
  fahrzeugId: string
  aktion: (formData: FormData) => void
  entleiherOptionen: { benutzername: string; vorname: string; nachname: string }[]
  fehler?: string
}) {
  const [minBis, setMinBis] = useState(() => heutigesDatumIso())
  const [bis, setBis] = useState(() => heutigesDatumIso())

  function vonAendern(neuesVon: string) {
    if (!neuesVon) return
    if (bis < neuesVon) setBis(neuesVon)
    setMinBis(neuesVon)
  }

  return (
    <form action={aktion} className="mt-8 flex flex-col gap-4">
      <input type="hidden" name="fahrzeugId" value={fahrzeugId} />

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Entleiher/in</span>
        <select
          name="entleiherId"
          required
          defaultValue=""
          className="rounded-lg border border-flaeche-300 px-3 py-2.5 text-base focus:border-marke-gruen focus:outline focus:outline-2 focus:outline-marke-gruen"
        >
          <option value="" disabled>
            Bitte auswählen
          </option>
          {entleiherOptionen.map((p) => (
            <option key={p.benutzername} value={p.benutzername}>
              {p.vorname} {p.nachname} · {p.benutzername}
            </option>
          ))}
        </select>
      </label>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium">Von</span>
          <DatumFeld
            name="geplantVon"
            required
            defaultValue={heutigesDatumIso()}
            onAenderung={vonAendern}
            ariaLabel="Von"
            groesse="gross"
          />
        </label>

        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium">Bis</span>
          <DatumFeld
            name="geplantBis"
            required
            min={minBis}
            wert={bis}
            onAenderung={setBis}
            ariaLabel="Bis"
            groesse="gross"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">
          Zweck
        </span>
        <input
          type="text"
          name="zweck"
          required
          className="rounded-lg border border-flaeche-300 px-3 py-2.5 text-base focus:border-marke-gruen focus:outline focus:outline-2 focus:outline-marke-gruen"
        />
      </label>

      {fehler === "pflichtfeld" && <Hinweis>Bitte alle Felder ausfüllen.</Hinweis>}
      {fehler === "zeitraum" && <Hinweis>&quot;Bis&quot; darf nicht vor &quot;Von&quot; liegen.</Hinweis>}

      <button
        type="submit"
        className="mt-2 rounded-lg bg-marke-gruen px-4 py-2.5 font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen focus-visible:outline-offset-2"
      >
        Ausleihe anlegen
      </button>
      <FormularAenderungenSchutz />
    </form>
  )
}
