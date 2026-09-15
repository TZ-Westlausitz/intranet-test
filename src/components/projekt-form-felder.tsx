"use client"

import { useRef, useState } from "react"

import { RichTextEditor } from "@/components/rich-text-editor"
import { PROJEKT_STATUS } from "@/lib/projekte-optionen"

export type ProjektStandardwerte = {
  titel: string
  ziel: string
  start: string
  ende: string
  status: string
}

export const LEERE_PROJEKT_STANDARDWERTE: ProjektStandardwerte = {
  titel: "",
  ziel: "",
  start: "",
  ende: "",
  status: "PLANUNG",
}

/** Geteilt zwischen Anlegen-Formular und Bearbeiten — nach Vorbild AufgabeFormFelder/TerminFormFelder. */
export function ProjektFormFelder({
  standardwerte,
  zeigeStatus = false,
}: {
  standardwerte: ProjektStandardwerte
  zeigeStatus?: boolean
}) {
  const endeRef = useRef<HTMLInputElement>(null)
  const [minEnde, setMinEnde] = useState(standardwerte.start)

  // Rutscht "Start" über "Enddatum" hinaus, zieht das Enddatum automatisch
  // nach (mindestens derselbe Tag) — bleibt danach aber frei änderbar,
  // z. B. für ein Projekt über mehrere Monate. `min` auf dem Enddatum-Feld
  // sorgt zusätzlich dafür, dass sich auch von Hand kein Enddatum vor dem
  // Start mehr auswählen lässt — derselbe Mechanismus wie beim
  // ganztägigen Termin (siehe beiVonDatumAendern in TerminFormFelder).
  function beiStartAendern(ereignis: React.ChangeEvent<HTMLInputElement>) {
    const neuerStart = ereignis.target.value
    if (endeRef.current && endeRef.current.value < neuerStart) {
      endeRef.current.value = neuerStart
    }
    setMinEnde(neuerStart)
  }

  return (
    <>
      <div>
        <label className="block text-xs font-medium text-primaer">Projektname</label>
        <input
          name="titel"
          type="text"
          required
          defaultValue={standardwerte.titel}
          className="mt-1 h-9 w-full rounded-lg border border-flaeche-300 px-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-primaer">Ziel</label>
        <div className="mt-1">
          <RichTextEditor name="ziel" defaultValue={standardwerte.ziel} />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-primaer">Start</label>
          <input
            name="start"
            type="date"
            required
            defaultValue={standardwerte.start}
            onChange={beiStartAendern}
            className="mt-1 h-9 rounded-lg border border-flaeche-300 px-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-primaer">Enddatum</label>
          <input
            name="ende"
            type="date"
            required
            min={minEnde}
            defaultValue={standardwerte.ende}
            ref={endeRef}
            className="mt-1 h-9 rounded-lg border border-flaeche-300 px-2 text-sm"
          />
        </div>

        {zeigeStatus && (
          <div>
            <label className="block text-xs font-medium text-primaer">Status</label>
            <select
              name="status"
              defaultValue={standardwerte.status}
              className="mt-1 h-9 rounded-lg border border-flaeche-300 px-2 text-sm"
            >
              {/* "Aktiv" fehlt hier absichtlich, solange das Projekt noch in
                  der Planung ist — dieser Übergang läuft ausschließlich über
                  den eigenen "Projekt starten"-Knopf, der dabei die
                  gebündelte Benachrichtigung an alle Mitglieder auslöst
                  (siehe projektStarten). Ist das Projekt schon aktiv, bleibt
                  die Option normal wählbar, damit der aktuelle Wert korrekt
                  angezeigt wird. */}
              {(standardwerte.status === "PLANUNG" ? PROJEKT_STATUS.filter((status) => status.wert !== "AKTIV") : PROJEKT_STATUS).map(
                (status) => (
                  <option key={status.wert} value={status.wert}>
                    {status.name}
                  </option>
                ),
              )}
            </select>
          </div>
        )}
      </div>
    </>
  )
}
