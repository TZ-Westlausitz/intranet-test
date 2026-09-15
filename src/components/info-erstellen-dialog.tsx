"use client"

import { useRef, useState } from "react"

import { InfoFormFelder, LEERE_INFO_STANDARDWERTE, type InfoFormularOptionen } from "@/components/info-form-felder"
import { EntwurfBestaetigenDialog } from "@/components/entwurf-bestaetigen-dialog"

/**
 * "+ Info"-Knopf + Erstellen-Pop-Up — gleiches Muster wie
 * AufgabeBearbeitenDialog. Die Felder selbst stecken in InfoFormFelder
 * (geteilt mit InfoBearbeitenDialog).
 *
 * Schließen ohne zu veröffentlichen (Abbrechen-Knopf ODER Escape, siehe
 * `onCancel`) fragt bei nicht-leeren Eingaben nach, ob als Entwurf
 * gespeichert werden soll (Rückmeldung 2026-09-09, siehe
 * EntwurfBestaetigenDialog) — "leer" heißt hier: weder Titel noch Inhalt
 * eingetragen, geprüft über das aktuelle FormData statt über
 * kontrollierten State (die Felder in InfoFormFelder sind bewusst
 * unkontrolliert).
 */
export function InfoErstellenDialog({
  optionen,
  erstellenAktion,
  entwurfSpeichernAktion,
}: {
  optionen: InfoFormularOptionen
  erstellenAktion: (formData: FormData) => void
  entwurfSpeichernAktion: (formData: FormData) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const entwurfKnopfRef = useRef<HTMLButtonElement>(null)
  const [entwurfNachfrageOffen, setEntwurfNachfrageOffen] = useState(false)

  function schliessenNachAbsenden() {
    window.setTimeout(() => dialogRef.current?.close(), 0)
  }

  function istLeer(): boolean {
    if (!formRef.current) return true
    const daten = new FormData(formRef.current)
    return !String(daten.get("titel") ?? "").trim() && !String(daten.get("inhalt") ?? "").trim()
  }

  function schliessenVersuchen() {
    if (istLeer()) {
      dialogRef.current?.close()
      return
    }
    setEntwurfNachfrageOffen(true)
  }

  function entwurfVerwerfen() {
    setEntwurfNachfrageOffen(false)
    formRef.current?.reset()
    dialogRef.current?.close()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="h-9 shrink-0 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
      >
        + Info
      </button>

      <dialog
        ref={dialogRef}
        onCancel={(ereignis) => {
          if (istLeer()) return
          ereignis.preventDefault()
          setEntwurfNachfrageOffen(true)
        }}
        className="fixed top-1/2 left-1/2 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rand bg-flaeche p-0 shadow-xl backdrop:bg-neutral-900/40"
      >
        <form ref={formRef} action={erstellenAktion} onSubmit={schliessenNachAbsenden} className="flex max-h-[85vh] flex-col">
          <div className="border-b border-rand px-5 py-4">
            <h2 className="text-lg font-semibold text-ueberschrift">Neue Info</h2>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
            <InfoFormFelder standardwerte={LEERE_INFO_STANDARDWERTE} optionen={optionen} />
          </div>

          <div className="flex justify-end gap-2 border-t border-rand px-5 py-4">
            <button
              type="button"
              onClick={schliessenVersuchen}
              className="h-9 rounded-lg px-3 text-sm font-medium text-primaer transition hover:bg-flaeche-100"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="h-9 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
            >
              Veröffentlichen
            </button>
          </div>

          {/* Verstecktes zweites Submit-Ziel im selben Formular — React
             erlaubt mehrere Server Actions pro <form> über `formAction`
             an einem Knopf, damit "Als Entwurf speichern" ohne
             Feld-Duplizierung dieselben Werte mitschickt. */}
          <button ref={entwurfKnopfRef} type="submit" formAction={entwurfSpeichernAktion} className="hidden" />
        </form>
      </dialog>

      <EntwurfBestaetigenDialog
        offen={entwurfNachfrageOffen}
        onVerwerfen={entwurfVerwerfen}
        onEntwurfSpeichern={() => entwurfKnopfRef.current?.click()}
        onZurueckZumBearbeiten={() => setEntwurfNachfrageOffen(false)}
      />
    </>
  )
}
