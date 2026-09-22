"use client"

import { useEffect, useRef, useState } from "react"

/**
 * "+ Meldung"-Knopf + Anlegen-Pop-Up für die Kontaktstelle. Kein
 * Entwurf-Mechanismus wie bei Aufgaben — eine Meldung ist append-only
 * (Regel 2 sinngemäß), ein "Entwurf" würde die falsche Erwartung wecken,
 * dass sich der Inhalt später noch ändern lässt.
 *
 * Der "Anonym"-Haken (Rückmeldung 2026-09-22, Muster Überblick: nach
 * Eingabe des Titels wählbar) steuert serverseitig, ob die Kontaktstelle
 * die meldende Person je zu sehen bekommt (siehe
 * src/lib/kontaktstelle/abfragen.ts) — hier nur die Eingabe dafür.
 *
 * `autoOeffnen` öffnet das Pop-Up direkt beim Einhängen, Muster
 * AuftragErstellenDialog (`?neu=1`).
 */
export function MeldungErstellenDialog({
  erstellenAktion,
  autoOeffnen = false,
}: {
  erstellenAktion: (formData: FormData) => void
  autoOeffnen?: boolean
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [anhaenge, setAnhaenge] = useState<string[]>([])

  useEffect(() => {
    if (autoOeffnen) dialogRef.current?.showModal()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="h-9 shrink-0 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
      >
        + Meldung
      </button>

      <dialog
        ref={dialogRef}
        className="fixed top-1/2 left-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rand bg-flaeche p-0 shadow-xl backdrop:bg-neutral-900/40"
      >
        <form
          action={erstellenAktion}
          onSubmit={() => {
            setAnhaenge([])
            window.setTimeout(() => dialogRef.current?.close(), 0)
          }}
          className="flex max-h-[85vh] flex-col"
        >
          <div className="border-b border-rand px-5 py-4">
            <h2 className="text-lg font-semibold text-ueberschrift">Neue Meldung</h2>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-primaer">Titel</span>
              <input
                type="text"
                name="titel"
                required
                className="h-10 rounded-lg border border-flaeche-300 px-3 text-sm"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-primaer">Beschreibung</span>
              <textarea
                name="beschreibung"
                required
                rows={5}
                className="rounded-lg border border-flaeche-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="flex items-start gap-2 text-sm text-primaer">
              <input type="checkbox" name="istAnonym" className="mt-0.5 h-4 w-4" />
              <span>
                Anonym melden
                <span className="block text-xs text-sekundaer">
                  Die Kontaktstelle sieht dann nirgends, wer diese Meldung abgegeben hat. Du kannst den Verlauf trotzdem
                  über dein Konto verfolgen.
                </span>
              </span>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-primaer">Anhänge (optional)</span>
              <input
                type="file"
                name="anhaenge"
                multiple
                accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
                onChange={(ereignis) => setAnhaenge([...(ereignis.target.files ?? [])].map((datei) => datei.name))}
                className="text-sm"
              />
              {anhaenge.length > 0 && <p className="text-xs text-sekundaer">{anhaenge.join(", ")}</p>}
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t border-rand px-5 py-4">
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
              Melden
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}
