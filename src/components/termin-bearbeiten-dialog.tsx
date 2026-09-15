"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

import { TerminFormFelder, type AnhangAnzeige, type Person, type TerminStandardwerte } from "@/components/termin-form-felder"

/**
 * Zahnrad-Button + Bearbeiten-Pop-Up, wiederverwendet an zwei Stellen:
 * im Info-Pop-Up eines Termin-Punkts (TerminInfoDialog) und direkt am
 * Zeilenende der Listenübersicht (TerminUebersicht) — deshalb eigenständig
 * statt dort verschachtelt. `vorOeffnenSchliessen` lässt den Aufrufer z. B.
 * ein anderes, noch offenes Pop-Up zuerst schließen.
 *
 * Das eigene `<dialog>` wird per `createPortal` an `document.body`
 * gehängt statt an der Stelle im Baum zu bleiben, an der die Komponente
 * aufgerufen wird. Grund: Im Info-Pop-Up steht dieser Aufruf INNERHALB
 * eines anderen offenen `<dialog>` (TerminInfoDialog) — ohne Portal wäre
 * dieses Bearbeiten-Dialog ein DOM-Kind davon. Schließt `vorOeffnenSchliessen`
 * den äußeren Dialog, verschwindet damit auch sein gesamter Unterbaum
 * (der Browser rendert nichts innerhalb eines geschlossenen `<dialog>`),
 * und das direkt danach aufgerufene `showModal()` zeigt buchstäblich
 * nichts an — das Fenster "verschwindet einfach". Der Portal löst das
 * Bearbeiten-Dialog aus diesem Unterbaum heraus, sodass es unabhängig
 * vom äußeren Dialog bestehen bleibt. `mounted` verzögert den Portal auf
 * den ersten Effekt-Durchlauf, weil `document` beim Server-Rendering
 * nicht existiert.
 *
 * "Termin löschen" tauscht den Inhalt desselben Pop-Ups gegen eine
 * Sicherheitsabfrage aus, statt ein zweites `<dialog>` obenauf zu stapeln
 * — zwei gleichzeitig offene native Dialoge lassen sich nicht sauber
 * schachteln, und ein Umschalten reicht für die Sicherheitsfrage völlig.
 *
 * Ist der Termin Teil einer wiederkehrenden Serie (`serieId` gesetzt),
 * bietet die Sicherheitsabfrage drei getrennte Formulare an: "Nur diesen
 * Termin" (bestehende Aktion, wirkt nur auf diese eine Zeile), "Diesen und
 * alle folgenden löschen" (bricht die Serie ab diesem Termin ab, frühere
 * Termine bleiben zur Dokumentation/Nachverfolgung im Kalender stehen)
 * oder "Ganze Serie löschen" (betrifft alle Termine mit derselben
 * `serieId`, auch vergangene) — genau die Rückfrage, die auch andere
 * Kalender-Apps bei wiederkehrenden Terminen stellen.
 */
export function TerminBearbeitenDialog({
  terminId,
  serieId,
  standardwerte,
  bestehendeAnhaenge = [],
  personen,
  aktualisierenAktion,
  loeschenAktion,
  serieLoeschenAktion,
  serieAbHierLoeschenAktion,
  rueckkehrJahr,
  rueckkehrMonat,
  vorOeffnenSchliessen,
}: {
  terminId: string
  serieId: string | null
  standardwerte: TerminStandardwerte
  bestehendeAnhaenge?: AnhangAnzeige[]
  personen: Person[]
  aktualisierenAktion: (terminId: string, formData: FormData) => void
  loeschenAktion: (terminId: string, formData: FormData) => void
  serieLoeschenAktion: (serieId: string, formData: FormData) => void
  serieAbHierLoeschenAktion: (terminId: string, formData: FormData) => void
  rueckkehrJahr: number
  rueckkehrMonat: number
  vorOeffnenSchliessen?: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [loeschenBestaetigen, setLoeschenBestaetigen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  function schliessenNachAbsenden() {
    window.setTimeout(() => dialogRef.current?.close(), 0)
  }

  const dialog = (
    <dialog
      ref={dialogRef}
      className="fixed top-1/2 left-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rand bg-flaeche p-0 shadow-xl backdrop:bg-neutral-900/40"
    >
      {loeschenBestaetigen ? (
        <div>
          <div className="border-b border-rand px-5 py-4">
            <h2 className="text-lg font-semibold text-ueberschrift">Termin löschen</h2>
          </div>

          <div className="px-5 py-4">
            <p className="text-sm text-primaer">Wirklich löschen?</p>
            <p className="mt-1 text-sm text-sekundaer">
              Das kann nicht rückgängig gemacht werden. Eingeladene Teilnehmende werden benachrichtigt.
              {serieId && " Dieser Termin ist Teil einer wiederkehrenden Serie."}
            </p>
          </div>

          {/* Untereinander statt nebeneinander: bei drei Löschoptionen
              (wiederkehrender Termin) wäre eine Reihe zu eng geworden und
              die Buttons hätten sich schlecht unterscheiden lassen.
              Abbrechen ganz unten, damit die zerstörerischen Optionen
              nicht direkt neben dem Fluchtweg stehen. */}
          <div className="flex flex-col gap-2 border-t border-rand px-5 py-4">
            {serieId && (
              <form action={serieLoeschenAktion.bind(null, serieId)} onSubmit={schliessenNachAbsenden}>
                <input type="hidden" name="rueckkehrJahr" value={rueckkehrJahr} />
                <input type="hidden" name="rueckkehrMonat" value={rueckkehrMonat} />
                <button
                  type="submit"
                  className="h-9 w-full rounded-lg border border-red-600 px-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                >
                  Ganze Serie löschen
                </button>
              </form>
            )}

            {serieId && (
              <form action={serieAbHierLoeschenAktion.bind(null, terminId)} onSubmit={schliessenNachAbsenden}>
                <input type="hidden" name="rueckkehrJahr" value={rueckkehrJahr} />
                <input type="hidden" name="rueckkehrMonat" value={rueckkehrMonat} />
                <button
                  type="submit"
                  className="h-9 w-full rounded-lg border border-red-600 px-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                >
                  Diesen und alle folgenden löschen
                </button>
              </form>
            )}

            <form action={loeschenAktion.bind(null, terminId)} onSubmit={schliessenNachAbsenden}>
              <input type="hidden" name="rueckkehrJahr" value={rueckkehrJahr} />
              <input type="hidden" name="rueckkehrMonat" value={rueckkehrMonat} />
              <button
                type="submit"
                className="h-9 w-full rounded-lg bg-red-600 px-3 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                {serieId ? "Nur diesen Termin" : "Ja, löschen"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => setLoeschenBestaetigen(false)}
              className="h-9 w-full rounded-lg px-3 text-sm font-medium text-primaer transition hover:bg-flaeche-100"
            >
              Abbrechen
            </button>
          </div>
        </div>
      ) : (
        <form
          action={aktualisierenAktion.bind(null, terminId)}
          onSubmit={schliessenNachAbsenden}
          className="flex max-h-[85vh] flex-col"
        >
          <div className="border-b border-rand px-5 py-4">
            <h2 className="text-lg font-semibold text-ueberschrift">Termin bearbeiten</h2>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
            <TerminFormFelder
              personen={personen}
              standardwerte={standardwerte}
              bestehendeAnhaenge={bestehendeAnhaenge}
              terminId={terminId}
            />
            <input type="hidden" name="rueckkehrJahr" value={rueckkehrJahr} />
            <input type="hidden" name="rueckkehrMonat" value={rueckkehrMonat} />
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-rand px-5 py-4">
            <button
              type="button"
              onClick={() => setLoeschenBestaetigen(true)}
              className="h-9 rounded-lg px-3 text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              Termin löschen
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="h-9 rounded-lg px-3 text-sm font-medium text-primaer transition hover:bg-flaeche-100"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="h-9 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
              >
                Änderungen speichern
              </button>
            </div>
          </div>
        </form>
      )}
    </dialog>
  )

  return (
    <>
      <button
        type="button"
        aria-label="Termin bearbeiten"
        onClick={() => {
          vorOeffnenSchliessen?.()
          setLoeschenBestaetigen(false)
          dialogRef.current?.showModal()
        }}
        className="shrink-0 rounded-lg p-1.5 text-sekundaer transition hover:bg-flaeche-100"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden
        >
          <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>

      {mounted && createPortal(dialog, document.body)}
    </>
  )
}
