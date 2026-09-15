"use client"

import { useEffect, useRef, useState } from "react"

import { AuftragFormFelder, LEERER_AUFTRAG_STANDARDWERTE, type AuftragStandardwerte } from "@/components/auftrag-form-felder"
import { EntwurfBestaetigenDialog } from "@/components/entwurf-bestaetigen-dialog"
import type { Person } from "@/components/termin-form-felder"

/**
 * "+ Aufgabe"-Knopf + Anlegen-Pop-Up (UI-Text "Aufgabe" statt "Auftrag"
 * seit Rückmeldung 2026-09-15, Komponenten-/Modellname Auftrag intern
 * unverändert) — ersetzt die vormals immer sichtbare
 * Inline-Formular-Sektion auf `/aufgaben` (Rückmeldung 2026-09-09: Umbau
 * zu einem Dialog wie bei Info, weil es sonst keine schließbare Oberfläche
 * gäbe, an der eine Entwurf-Nachfrage ansetzen könnte). Zwei Modi über
 * `entwurf` unterschieden: ohne = frisches Anlegen (kein eigener Knopf
 * nötig, `entwurf` bleibt weg); mit = "Weiter bearbeiten" für einen
 * bestehenden Entwurf, dann OHNE eigenen "+ Aufgabe"-Auslöser (wird von
 * außen über `offenErzwingen` geöffnet, siehe /aufgaben Entwürfe-Liste).
 *
 * Schließen ohne zu speichern (Abbrechen-Knopf ODER Escape) fragt bei
 * nicht-leeren Eingaben nach, ob als Entwurf gespeichert werden soll,
 * genau wie bei InfoErstellenDialog.
 *
 * `autoOeffnen` (Rückmeldung vom 2026-09-15, Handy-Schnellerstellen-Menü):
 * öffnet das Pop-Up direkt beim Einhängen, für den Sprung von "+ Aufgabe"
 * im schwebenden Handy-Menü hierher — nur im frischen-Anlegen-Modus
 * gemeint, `entwurf` und `autoOeffnen` treffen praktisch nie zusammen auf.
 */
export function AuftragErstellenDialog({
  personen,
  erstellenAktion,
  entwurfSpeichernAktion,
  entwurf,
  autoOeffnen = false,
}: {
  personen: Person[]
  erstellenAktion: (formData: FormData) => void
  entwurfSpeichernAktion: (formData: FormData) => void
  entwurf?: { id: string; standardwerte: AuftragStandardwerte }
  autoOeffnen?: boolean
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (autoOeffnen) dialogRef.current?.showModal()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const formRef = useRef<HTMLFormElement>(null)
  const entwurfKnopfRef = useRef<HTMLButtonElement>(null)
  const [entwurfNachfrageOffen, setEntwurfNachfrageOffen] = useState(false)

  function schliessenNachAbsenden() {
    window.setTimeout(() => dialogRef.current?.close(), 0)
  }

  function istLeer(): boolean {
    if (!formRef.current) return true
    const daten = new FormData(formRef.current)
    return (
      !String(daten.get("titel") ?? "").trim() &&
      !String(daten.get("zugewiesenAn") ?? "").trim() &&
      !String(daten.get("beschreibung") ?? "").trim()
    )
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
      {!entwurf && (
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          className="h-9 shrink-0 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
        >
          + Aufgabe
        </button>
      )}
      {entwurf && (
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          className="text-xs font-medium text-marke-gruen-dunkel hover:underline"
        >
          Weiter bearbeiten
        </button>
      )}

      <dialog
        ref={dialogRef}
        onCancel={(ereignis) => {
          if (istLeer()) return
          ereignis.preventDefault()
          setEntwurfNachfrageOffen(true)
        }}
        className="fixed top-1/2 left-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rand bg-flaeche p-0 shadow-xl backdrop:bg-neutral-900/40"
      >
        <form
          ref={formRef}
          action={erstellenAktion}
          onSubmit={schliessenNachAbsenden}
          className="flex max-h-[85vh] flex-col"
        >
          <div className="border-b border-rand px-5 py-4">
            <h2 className="text-lg font-semibold text-ueberschrift">{entwurf ? "Entwurf weiter bearbeiten" : "Neue Aufgabe"}</h2>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
            <AuftragFormFelder standardwerte={entwurf?.standardwerte ?? LEERER_AUFTRAG_STANDARDWERTE} personen={personen} />
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
              Zuweisen
            </button>
          </div>

          {/* Verstecktes zweites Submit-Ziel im selben Formular — siehe
             Kommentar in InfoErstellenDialog. */}
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
