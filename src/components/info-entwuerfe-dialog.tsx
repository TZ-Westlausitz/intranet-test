"use client"

import { useRef } from "react"

import {
  InfoBearbeitenDialog,
  type InfoBearbeitenDialogHandle,
} from "@/components/info-bearbeiten-dialog"
import { infoZuStandardwerte, type InfoAnhangAnzeige, type InfoFormularOptionen } from "@/components/info-form-felder"
import { formatiereDatumAusDate } from "@/lib/datum"

type Entwurf = {
  id: string
  titel: string
  inhalt: string | null
  kategorieId: string | null
  mitBestaetigung: boolean
  kommentareErlaubt: boolean
  alsUnternehmen: boolean
  erstelltAm: Date
  empfaengerPersonen: { personId: string }[]
  empfaengerGruppen: { gruppeId: string }[]
  empfaengerAbteilungen: { abteilungId: string }[]
  anhaenge: InfoAnhangAnzeige[]
}

/** Eine Zeile in der Entwürfe-Liste — eigener Bearbeiten-Dialog-Ref, analog zu InfoAktionenMenu. */
function EntwurfZeile({
  entwurf,
  optionen,
  aktualisierenAktion,
  entwurfLoeschenAktion,
  anhangLoeschenAktion,
}: {
  entwurf: Entwurf
  optionen: InfoFormularOptionen
  aktualisierenAktion: (infoId: string, formData: FormData) => void
  entwurfLoeschenAktion: (infoId: string) => void
  anhangLoeschenAktion: (anhangId: string) => void
}) {
  const bearbeitenRef = useRef<InfoBearbeitenDialogHandle>(null)

  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-primaer">{entwurf.titel || "Entwurf ohne Titel"}</p>
        <p className="text-xs text-tertiaer">{formatiereDatumAusDate(entwurf.erstelltAm)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={() => bearbeitenRef.current?.oeffnen()}
          className="text-xs font-medium text-marke-gruen-dunkel hover:underline"
        >
          Bearbeiten
        </button>
        <form action={entwurfLoeschenAktion.bind(null, entwurf.id)}>
          <button type="submit" className="text-xs text-tertiaer hover:text-red-600">
            Löschen
          </button>
        </form>
      </div>

      <InfoBearbeitenDialog
        ref={bearbeitenRef}
        infoId={entwurf.id}
        standardwerte={infoZuStandardwerte({ ...entwurf, geplantAm: null, nochNichtVeroeffentlicht: true })}
        optionen={optionen}
        bestehendeAnhaenge={entwurf.anhaenge}
        aktualisierenAktion={aktualisierenAktion}
        anhangLoeschenAktion={anhangLoeschenAktion}
      />
    </li>
  )
}

/**
 * "Entwürfe anzeigen (N)"-Knopf neben "+ Info" (Rückmeldung 2026-09-09) —
 * nur gerendert, wenn `entwuerfe` nicht leer ist (siehe Newsfeed-Seite).
 * "Bearbeiten" pro Zeile öffnet denselben InfoBearbeitenDialog, der auch
 * für echte Infos genutzt wird — beim normalen Speichern dort graduiert
 * infoAktualisieren den Entwurf endgültig zu einer echten Info.
 */
export function InfoEntwuerfeDialog({
  entwuerfe,
  optionen,
  aktualisierenAktion,
  entwurfLoeschenAktion,
  anhangLoeschenAktion,
}: {
  entwuerfe: Entwurf[]
  optionen: InfoFormularOptionen
  aktualisierenAktion: (infoId: string, formData: FormData) => void
  entwurfLoeschenAktion: (infoId: string) => void
  anhangLoeschenAktion: (anhangId: string) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="h-9 shrink-0 rounded-lg border border-flaeche-300 px-3 text-sm font-medium text-primaer transition hover:border-marke-gruen hover:text-ueberschrift"
      >
        Entwürfe anzeigen ({entwuerfe.length})
      </button>

      <dialog
        ref={dialogRef}
        className="fixed top-1/2 left-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rand bg-flaeche p-0 shadow-xl backdrop:bg-neutral-900/40"
      >
        <div className="flex items-center justify-between border-b border-rand px-5 py-4">
          <h2 className="text-lg font-semibold text-ueberschrift">Entwürfe</h2>
          <button type="button" onClick={() => dialogRef.current?.close()} className="text-sm text-sekundaer hover:text-primaer">
            Schließen
          </button>
        </div>
        <ul className="max-h-[70vh] divide-y divide-flaeche-100 overflow-y-auto">
          {entwuerfe.map((entwurf) => (
            <EntwurfZeile
              key={entwurf.id}
              entwurf={entwurf}
              optionen={optionen}
              aktualisierenAktion={aktualisierenAktion}
              entwurfLoeschenAktion={entwurfLoeschenAktion}
              anhangLoeschenAktion={anhangLoeschenAktion}
            />
          ))}
        </ul>
      </dialog>
    </>
  )
}
