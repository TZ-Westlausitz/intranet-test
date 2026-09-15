"use client"

import { useRef, useState } from "react"

import { Hinweis } from "@/components/hinweis"
import { heutigesDatumIso } from "@/lib/datum"

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
  const bisRef = useRef<HTMLInputElement>(null)
  const [minBis, setMinBis] = useState(() => heutigesDatumIso())

  function vonAendern(ereignis: React.ChangeEvent<HTMLInputElement>) {
    const neuesVon = ereignis.target.value
    if (bisRef.current && bisRef.current.value < neuesVon) {
      bisRef.current.value = neuesVon
    }
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
          <input
            type="date"
            name="geplantVon"
            required
            defaultValue={heutigesDatumIso()}
            onChange={vonAendern}
            className="rounded-lg border border-flaeche-300 px-3 py-2.5 text-base focus:border-marke-gruen focus:outline focus:outline-2 focus:outline-marke-gruen"
          />
        </label>

        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium">Bis</span>
          <input
            type="date"
            name="geplantBis"
            required
            min={minBis}
            defaultValue={heutigesDatumIso()}
            ref={bisRef}
            className="rounded-lg border border-flaeche-300 px-3 py-2.5 text-base focus:border-marke-gruen focus:outline focus:outline-2 focus:outline-marke-gruen"
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
    </form>
  )
}
