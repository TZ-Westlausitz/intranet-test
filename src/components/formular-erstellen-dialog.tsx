"use client"

import { useRef, useState } from "react"

import { FormularBaukasten } from "@/components/formular-baukasten"
import type { Person } from "@/components/termin-form-felder"

/**
 * "+ Formular"-Knopf + Baukasten als Pop-Up (Rückmeldung 2026-09-09: vorher
 * eine eigene Seite `/formulare/erstellen`, die das ganze Fenster einnahm)
 * — Muster InfoErstellenDialog/AuftragErstellenDialog.
 *
 * Der `<dialog>` selbst bleibt IMMER gemountet (nötig, damit `showModal()`/
 * das native "close"-Ereignis zuverlässig greifen), sein Inhalt
 * (`FormularBaukasten`) aber nur, solange `offen` — dadurch startet der
 * Baukasten bei jedem Öffnen mit frischem State statt mit den Resten der
 * vorigen Sitzung (anders als bei Info/Auftrag reicht hier ein einfaches
 * `form.reset()` nicht, weil Titel/Elemente/Bedingungen als React-State
 * statt als unkontrollierte Felder geführt werden).
 *
 * `FormularBaukasten` bekommt diesen `dialogRef` gereicht und kümmert sich
 * darin selbst um Abbrechen/Escape/Entwurf-Nachfrage (siehe dort) — dieser
 * Wrapper selbst weiß nichts von "ungespeicherten Änderungen".
 */
export function FormularErstellenDialog({
  personen,
  gruppen,
  abteilungen,
  orte,
  erstellenAktion,
  entwurfSpeichernAktion,
}: {
  personen: Person[]
  gruppen: Person[]
  abteilungen: { id: string; name: string }[]
  orte: { id: string; name: string }[]
  erstellenAktion: (formData: FormData) => void
  entwurfSpeichernAktion: (formData: FormData) => void
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
        + Formular
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setOffen(false)}
        className="fixed top-1/2 left-1/2 max-h-[90vh] w-[95vw] max-w-6xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-neutral-200 p-6 shadow-xl backdrop:bg-neutral-900/40"
      >
        {offen && (
          <>
            <h2 className="mb-5 text-lg font-semibold text-marke-grau">Neues Formular</h2>
            <FormularBaukasten
              bearbeitbar
              personen={personen}
              gruppen={gruppen}
              abteilungen={abteilungen}
              orte={orte}
              speichernAktion={erstellenAktion}
              entwurfSpeichernAktion={entwurfSpeichernAktion}
              dialogRef={dialogRef}
            />
          </>
        )}
      </dialog>
    </>
  )
}
