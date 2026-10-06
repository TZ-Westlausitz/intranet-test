"use client"

import { useState } from "react"

import { InfoHinweis } from "@/components/info-hinweis"
import { PersonenAuswahl } from "@/components/personen-auswahl"
import type { Person } from "@/components/termin-form-felder"

/**
 * "Zuweisen an": Überschrift, darunter die Suchzeile, darunter die
 * ausgewählten Personen. Ab der zweiten Person erscheint die kleine Checkbox
 * "An jede Person einzeln senden" (Erklärung hinter dem Info-Symbol):
 * angehakt bekommt jede Person ihre eigene Aufgabe, sonst arbeiten alle
 * gemeinsam an EINER Aufgabe (siehe auftragSpeichern). `onAenderung` meldet
 * Auswahl und Haken für die Live-Vorschau.
 */
export function AuftragEmpfaengerFeld({
  personen,
  ausgewaehlteIds,
  idPrefix = "auftrag-",
  onAenderung,
}: {
  personen: Person[]
  ausgewaehlteIds: string[]
  idPrefix?: string
  onAenderung?: (stand: { ids: string[]; einzeln: boolean }) => void
}) {
  const [ids, setIds] = useState(ausgewaehlteIds)
  const [einzeln, setEinzeln] = useState(false)

  return (
    <div>
      <label htmlFor={`${idPrefix}zuweisen-suche`} className="block text-xs font-medium text-primaer">
        Zuweisen an
      </label>
      <div className="mt-1.5">
        <PersonenAuswahl
          personen={personen}
          ausgewaehlteIds={ausgewaehlteIds}
          name="zugewiesenAn"
          id={`${idPrefix}zuweisen`}
          chipsUnten
          onAenderung={(neu) => {
            setIds(neu)
            onAenderung?.({ ids: neu, einzeln })
          }}
        />
      </div>

      {ids.length > 1 && (
        <div className="mt-2 flex items-center gap-1.5">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-primaer">
            <input
              type="checkbox"
              name="einzeln"
              value="1"
              checked={einzeln}
              onChange={(ereignis) => {
                setEinzeln(ereignis.target.checked)
                onAenderung?.({ ids, einzeln: ereignis.target.checked })
              }}
              className="h-3.5 w-3.5 shrink-0"
            />
            An jede Person einzeln senden
          </label>
          <InfoHinweis text="Jede Person bekommt ihre eigene Aufgabe mit eigenem Status, eigener Checkliste und eigenen Kommentaren. Ohne Haken arbeiten alle gemeinsam an einer Aufgabe: Wer sie annimmt, abhakt oder erledigt, tut das für alle." />
        </div>
      )}
    </div>
  )
}
