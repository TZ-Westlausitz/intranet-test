"use client"

import { useRef, useState } from "react"

import { PersonenAuswahl } from "@/components/personen-auswahl"
import type { Person } from "@/components/termin-form-felder"

/**
 * "+ Neuer Chat"-Knopf + Pop-Up mit Personensuche (Rückmeldung
 * 2026-09-10: hieß vorher "+ Neue Nachricht" — bewusst NUR zwischen zwei
 * Mitarbeitenden, für mehrere Personen gibt es daneben "+ Neue Gruppe",
 * siehe ChatNeueGruppeDialog). Muster FormularErstellenDialog: `<dialog>`
 * bleibt immer gemountet, Inhalt nur solange `offen`. Die gewählte Person
 * landet als verstecktes `<input name="andereId">` im Formular (siehe
 * PersonenAuswahl, `mehrfach={false}`) — `oeffnenAktion`
 * (direktkonversationOeffnen) legt die Konversation bei Bedarf an und
 * leitet dorthin weiter.
 */
export function ChatNeueNachrichtDialog({
  personen,
  oeffnenAktion,
}: {
  personen: Person[]
  oeffnenAktion: (formData: FormData) => void
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
        className="flex h-9 items-center justify-center rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
      >
        + Neuer Chat
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setOffen(false)}
        className="fixed top-1/2 left-1/2 w-[95vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-200 p-6 shadow-xl backdrop:bg-neutral-900/40"
      >
        {offen && (
          <form action={oeffnenAktion}>
            <h2 className="mb-4 text-lg font-semibold text-marke-grau">Neuer Chat</h2>
            <label htmlFor="chat-neue-nachricht-suche" className="block text-xs font-medium text-neutral-600">
              An
            </label>
            <div className="mt-1.5">
              <PersonenAuswahl personen={personen} ausgewaehlteIds={[]} name="andereId" mehrfach={false} id="chat-neue-nachricht" />
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
                Öffnen
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  )
}
