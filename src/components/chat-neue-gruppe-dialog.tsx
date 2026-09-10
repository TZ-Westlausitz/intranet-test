"use client"

import { useRef, useState } from "react"

import { InfoEmpfaengerAuswahl } from "@/components/info-empfaenger-auswahl"
import type { Person } from "@/components/termin-form-felder"

const MITGLIEDER_FELDNAMEN = { abteilung: "mitgliederAbteilungen", gruppe: "mitgliederGruppen", person: "mitgliederPersonen" } as const

/**
 * "+ Neue Gruppe"-Knopf + Pop-Up (Rückmeldung 2026-09-10, daneben "+ Neuer
 * Chat" für genau zwei Personen, siehe ChatNeueNachrichtDialog). Wählt
 * Mitglieder über `InfoEmpfaengerAuswahl` — dieselbe Mehrfachauswahl-
 * Komponente wie bei Info/Formular-Empfänger, hier ohne Abteilungen
 * (leeres Array, die Kategorie blendet sich dann selbst aus). Eine
 * ausgewählte Gruppe ist nur eine Sammel-Abkürzung für ihre AKTUELLEN
 * Mitglieder (siehe gruppenchatErstellen) — anders als der automatische
 * Gruppenchat pro Gruppe bekommt diese Gruppe eine FESTE Mitgliederliste
 * und einen frei gewählten Namen, deshalb das Titel-Feld hier.
 */
export function ChatNeueGruppeDialog({
  personen,
  gruppen,
  erstellenAktion,
}: {
  personen: Person[]
  gruppen: Person[]
  erstellenAktion: (formData: FormData) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [offen, setOffen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOffen(true)
          dialogRef.current?.showModal()
        }}
        className="flex h-9 items-center justify-center rounded-lg border border-marke-gruen px-3 text-sm font-semibold text-marke-gruen-dunkel transition hover:bg-marke-gruen/10"
      >
        + Neue Gruppe
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setOffen(false)}
        className="fixed top-1/2 left-1/2 w-[95vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-200 p-6 shadow-xl backdrop:bg-neutral-900/40"
      >
        {offen && (
          <form action={erstellenAktion}>
            <h2 className="mb-4 text-lg font-semibold text-marke-grau">Neue Gruppe</h2>

            <label htmlFor="chat-neue-gruppe-titel" className="block text-xs font-medium text-neutral-600">
              Name der Gruppe
            </label>
            <input
              id="chat-neue-gruppe-titel"
              name="titel"
              type="text"
              required
              className="mt-1.5 h-9 w-full rounded-lg border border-neutral-300 px-2 text-sm"
            />

            <label className="mt-4 block text-xs font-medium text-neutral-600">Mitglieder</label>
            <div className="mt-1.5">
              <InfoEmpfaengerAuswahl
                abteilungen={[]}
                gruppen={gruppen}
                personen={personen}
                ausgewaehlt={{ abteilungen: [], gruppen: [], personen: [] }}
                feldnamen={MITGLIEDER_FELDNAMEN}
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="h-9 rounded-lg px-3 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="h-9 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
              >
                Erstellen
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  )
}
