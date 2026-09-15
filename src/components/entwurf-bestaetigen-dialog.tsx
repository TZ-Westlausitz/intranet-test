"use client"

import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"

/**
 * Nachfrage beim Schließen ohne zu speichern — "Als Entwurf speichern?"
 * (Rückmeldung 2026-09-09), wiederverwendet vom Formular-Baukasten
 * (`FormularBaukasten`), dem Info- und dem Auftrag-Erstellen-Dialog.
 *
 * Per `createPortal` an `document.body` gehängt statt an der Aufrufstelle
 * zu bleiben — beim Info-/Auftrag-Fall steht diese Nachfrage NEBEN einem
 * bereits offenen `<dialog>` (siehe Kommentar in TerminBearbeitenDialog
 * für denselben Grund: ein `<dialog>`-Kind eines anderen offenen
 * `<dialog>` verschwindet mit, sobald der äußere schließt — hier soll der
 * äußere Dialog aber bewusst noch offen bleiben, solange diese Nachfrage
 * läuft).
 *
 * Nur zwei Knöpfe ("Verwerfen"/"Als Entwurf speichern") — Escape auf
 * DIESEM Dialog (natives `close`-Ereignis) bedeutet "doch weiter
 * bearbeiten" und ruft `onZurueckZumBearbeiten`, ohne etwas zu verwerfen
 * oder zu speichern.
 */
export function EntwurfBestaetigenDialog({
  offen,
  onVerwerfen,
  onEntwurfSpeichern,
  onZurueckZumBearbeiten,
}: {
  offen: boolean
  onVerwerfen: () => void
  onEntwurfSpeichern: () => void
  onZurueckZumBearbeiten: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (offen) dialogRef.current?.showModal()
  }, [offen])

  // Portal-Erzeugung selbst hängt an `offen` — `document.body` darf erst
  // ausgewertet werden, wenn dieser Dialog durch eine echte Interaktion
  // (also garantiert im Browser) angefordert wird, nie beim serverseitigen
  // Rendern. Dieser Dialog wird u. a. UNBEDINGT (immer gemountet) von
  // FormularBaukasten/InfoErstellenDialog/AuftragErstellenDialog gerendert
  // — ohne diese Weiche würde jeder frische Seitenaufruf dort mit
  // "document is not defined" abstürzen (Rückmeldung 2026-09-09,
  // Fehlermeldung nach Absenden eines Formulars — derselbe Fehler wie in
  // FormularBearbeitenDialog). Kein `else dialogRef.current?.close()` mehr
  // nötig: sobald `offen` false wird, entfernt React den Portal-Inhalt
  // direkt aus dem DOM.
  if (!offen) return null

  return createPortal(
    <dialog
      ref={dialogRef}
      onClose={onZurueckZumBearbeiten}
      className="fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rand bg-flaeche p-5 shadow-xl backdrop:bg-neutral-900/40"
    >
      <p className="text-sm text-primaer">
        Ungespeicherte Änderungen — als Entwurf speichern, bevor du schließt?
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onVerwerfen}
          className="h-9 rounded-lg px-3 text-sm font-medium text-primaer hover:bg-flaeche-100"
        >
          Verwerfen
        </button>
        <button
          type="button"
          onClick={onEntwurfSpeichern}
          className="h-9 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
        >
          Als Entwurf speichern
        </button>
      </div>
    </dialog>,
    document.body,
  )
}
