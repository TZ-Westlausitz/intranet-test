"use client"

import { useState } from "react"

import {
  FormularFeld,
  RICH_TEXT_ANZEIGE_KLASSE,
  formularElementSichtbar,
  formularTriggerIds,
  type FormularFeldElement,
} from "@/components/formular-feld"

/**
 * Rendert eine Vorlage zum echten Ausfüllen — Titel/Beschreibung, dann die
 * Elemente in Reihenfolge, dann "Absenden". Bedingt sichtbare Elemente
 * (siehe FormularElement.bedingungElementId) werden erst gerendert, wenn
 * ihr Trigger-Feld den passenden Wert hat — `triggerWerte` hält dafür den
 * kontrollierten State der (wenigen) Felder, die als Trigger dienen; alle
 * anderen Felder bleiben unkontrolliert wie bisher.
 */
export function FormularAusfuellen({
  vorlage,
  orte,
  einreichenAktion,
}: {
  vorlage: { id: string; titel: string; beschreibung: string | null; elemente: FormularFeldElement[] }
  orte: { id: string; name: string }[]
  einreichenAktion: (vorlageId: string, formData: FormData) => void
}) {
  const [triggerWerte, setTriggerWerte] = useState<Record<string, string>>({})
  const triggerIds = formularTriggerIds(vorlage.elemente)

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ueberschrift">{vorlage.titel}</h1>
      {vorlage.beschreibung && (
        <div
          className={RICH_TEXT_ANZEIGE_KLASSE + " mt-2 text-primaer"}
          dangerouslySetInnerHTML={{ __html: vorlage.beschreibung }}
        />
      )}

      <form action={einreichenAktion.bind(null, vorlage.id)} className="mt-6 flex flex-col gap-5">
        {vorlage.elemente
          .filter((element) => formularElementSichtbar(element, triggerWerte))
          .map((element) => (
            <FormularFeld
              key={element.id}
              element={element}
              orte={orte}
              wert={triggerIds.has(element.id) ? (triggerWerte[element.id] ?? "") : undefined}
              aufWertAendern={
                triggerIds.has(element.id)
                  ? (wert) => setTriggerWerte((bisher) => ({ ...bisher, [element.id]: wert }))
                  : undefined
              }
            />
          ))}

        <button
          type="submit"
          className="mt-2 h-10 self-start rounded-lg bg-marke-gruen px-5 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
        >
          Absenden
        </button>
      </form>
    </div>
  )
}
