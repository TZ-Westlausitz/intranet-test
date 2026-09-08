"use client"

import { useState } from "react"

const MAX_OPTIONEN = 10

/**
 * Umfrage-Baustein im Info-Erstellen-Dialog — nur beim Anlegen einbindbar,
 * siehe `{!infoId && <UmfrageFormFelder />}` in InfoFormFelder und den
 * Kommentar am Model InfoUmfrage (verwaiste Stimmen vermeiden). Die
 * Options-Liste ist controlled (State hält den Text jeder Zeile), damit
 * sich eine beliebige Zeile entfernen lässt, ohne den Text der übrigen zu
 * verlieren — die Inputs selbst sind trotzdem ganz normale, benannte
 * Formularfelder (`name="umfrageOptionen"`, mehrfach), die über das
 * umgebende `<form action={...}>` per `formData.getAll(...)` ankommen
 * (Muster wie InfoEmpfaengerAuswahl, dort mit Hidden- statt sichtbaren
 * Feldern).
 */
export function UmfrageFormFelder() {
  const [aktiv, setAktiv] = useState(false)
  const [optionen, setOptionen] = useState(["", ""])

  function optionAendern(index: number, wert: string) {
    setOptionen((bisher) => bisher.map((o, i) => (i === index ? wert : o)))
  }

  function optionEntfernen(index: number) {
    setOptionen((bisher) => bisher.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-3">
      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input
          type="checkbox"
          name="umfrageAktiv"
          checked={aktiv}
          onChange={(ereignis) => setAktiv(ereignis.target.checked)}
          className="h-4 w-4 rounded border-neutral-300"
        />
        Umfrage hinzufügen
      </label>

      {aktiv && (
        <div className="flex flex-col gap-2 pl-6">
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input type="checkbox" name="umfrageMehrfachauswahl" className="h-4 w-4 rounded border-neutral-300" />
            Mehrfachauswahl erlauben
          </label>

          <input
            type="text"
            name="umfrageFrage"
            placeholder="Fragestellung (optional)"
            className="h-9 rounded-lg border border-neutral-300 px-2 text-sm"
          />

          {optionen.map((wert, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <input
                type="text"
                name="umfrageOptionen"
                value={wert}
                onChange={(ereignis) => optionAendern(index, ereignis.target.value)}
                placeholder={`Option ${index + 1}`}
                className="h-9 flex-1 rounded-lg border border-neutral-300 px-2 text-sm"
              />
              {optionen.length > 2 && (
                <button
                  type="button"
                  onClick={() => optionEntfernen(index)}
                  aria-label={`Option ${index + 1} entfernen`}
                  className="shrink-0 rounded p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                >
                  ×
                </button>
              )}
            </div>
          ))}

          {optionen.length < MAX_OPTIONEN && (
            <button
              type="button"
              onClick={() => setOptionen((bisher) => [...bisher, ""])}
              className="self-start text-xs font-medium text-marke-gruen-dunkel hover:underline"
            >
              + Option hinzufügen
            </button>
          )}
        </div>
      )}
    </div>
  )
}
