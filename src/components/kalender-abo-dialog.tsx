"use client"

import { useRef, useState } from "react"
import { CalendarSync } from "lucide-react"

/**
 * "Kalender abonnieren": zeigt den persönlichen, geheimen Abo-Link
 * (siehe src/lib/kalender-abo/) und erklärt, wie man ihn in Outlook, am Handy
 * oder in Google einträgt. Erzeugen/Neu erzeugen/Beenden sind direkte
 * Server-Action-Aufrufe über kleine Formulare — der Link entsteht erst auf
 * Wunsch, vorher gibt es keinen.
 */
export function KalenderAboDialog({
  aboUrl,
  erzeugenAktion,
  beendenAktion,
}: {
  /** Vollständige https-Adresse des Feeds, `null` = noch kein Abo. */
  aboUrl: string | null
  erzeugenAktion: () => Promise<void>
  beendenAktion: () => Promise<void>
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [kopiert, setKopiert] = useState(false)

  const webcalUrl = aboUrl ? aboUrl.replace(/^https?:\/\//, "webcal://") : null

  async function kopieren() {
    if (!aboUrl) return
    try {
      await navigator.clipboard.writeText(aboUrl)
      setKopiert(true)
      window.setTimeout(() => setKopiert(false), 2500)
    } catch {
      // Zwischenablage nicht erlaubt: das Feld bleibt markierbar, der Link lässt sich von Hand kopieren.
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-flaeche-300 px-3 text-sm font-medium text-primaer transition hover:bg-flaeche-100"
      >
        <CalendarSync className="h-4 w-4" aria-hidden />
        Kalender abonnieren
      </button>

      <dialog
        ref={dialogRef}
        className="fixed top-1/2 left-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rand bg-flaeche p-0 shadow-xl backdrop:bg-neutral-900/40"
      >
        <div className="border-b border-rand px-5 py-4">
          <h2 className="text-lg font-semibold text-ueberschrift">Kalender abonnieren</h2>
          <p className="mt-1 text-sm text-sekundaer">
            Deine Intranet-Termine erscheinen automatisch in Outlook, im Handy-Kalender oder in Google Kalender — ein
            Microsoft-Konto brauchst du dafür nicht. Das geht nur in eine Richtung: Änderungen in der anderen App
            kommen nicht ins Intranet zurück.
          </p>
        </div>

        <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto px-5 py-4 text-sm">
          {!aboUrl || !webcalUrl ? (
            <form action={erzeugenAktion}>
              <button
                type="submit"
                className="h-9 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
              >
                Abo-Link erzeugen
              </button>
            </form>
          ) : (
            <>
              <div>
                <label htmlFor="abo-link" className="block text-xs font-medium text-primaer">
                  Dein persönlicher Link
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    id="abo-link"
                    readOnly
                    value={aboUrl}
                    onFocus={(ereignis) => ereignis.currentTarget.select()}
                    className="h-9 min-w-0 flex-1 rounded-lg border border-flaeche-300 bg-flaeche-schwach px-2 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={kopieren}
                    className="h-9 shrink-0 rounded-lg bg-flaeche-100 px-3 text-xs font-medium text-primaer transition hover:bg-flaeche-200"
                  >
                    {kopiert ? "Kopiert" : "Kopieren"}
                  </button>
                </div>
                <a href={webcalUrl} className="mt-2 inline-block text-xs font-medium text-marke-gruen-dunkel hover:underline">
                  Direkt in der Kalender-App öffnen
                </a>
              </div>

              <ul className="flex flex-col gap-1.5 text-sm text-primaer">
                <li>
                  <span className="font-medium">Outlook:</span> Kalender → Kalender hinzufügen → Aus dem Internet
                  abonnieren, Link einfügen.
                </li>
                <li>
                  <span className="font-medium">iPhone:</span> Einstellungen → Kalender → Accounts → Account
                  hinzufügen → Andere → Kalenderabo hinzufügen.
                </li>
                <li>
                  <span className="font-medium">Android/Google:</span> Google Kalender im Browser → Weitere
                  Kalender → Per URL.
                </li>
              </ul>

              <p className="rounded-lg bg-flaeche-schwach px-3 py-2 text-xs text-sekundaer">
                Der Link enthält Titel, Zeit und Ort deiner Termine, ohne Beschreibung. Wer ihn kennt, kann sie sehen —
                bitte nicht weitergeben. Die Kalender-App aktualisiert sich nur alle paar Stunden, neue Termine
                erscheinen also nicht sofort.
              </p>

              <div className="flex flex-wrap gap-2 border-t border-rand pt-3">
                <form
                  action={erzeugenAktion}
                  onSubmit={(ereignis) => {
                    if (!confirm("Neuen Link erzeugen? Der bisherige Link funktioniert danach nicht mehr — du musst ihn in deiner Kalender-App ersetzen.")) {
                      ereignis.preventDefault()
                    }
                  }}
                >
                  <button type="submit" className="h-9 rounded-lg px-3 text-xs font-medium text-sekundaer transition hover:bg-flaeche-100">
                    Neuen Link erzeugen
                  </button>
                </form>
                <form
                  action={beendenAktion}
                  onSubmit={(ereignis) => {
                    if (!confirm("Abo beenden? Der Link liefert danach keine Termine mehr.")) ereignis.preventDefault()
                  }}
                >
                  <button type="submit" className="h-9 rounded-lg px-3 text-xs font-medium text-sekundaer transition hover:bg-red-50 hover:text-red-600">
                    Abo beenden
                  </button>
                </form>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end border-t border-rand px-5 py-3">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="h-9 rounded-lg px-3 text-sm font-medium text-primaer transition hover:bg-flaeche-100"
          >
            Schließen
          </button>
        </div>
      </dialog>
    </>
  )
}
