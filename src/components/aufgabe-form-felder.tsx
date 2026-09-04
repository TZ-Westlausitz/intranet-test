"use client"

import { RichTextEditor } from "@/components/rich-text-editor"
import { FeldInfo } from "@/components/feld-info"
import { AUFGABE_PRIORITAETEN } from "@/lib/aufgaben-optionen"

export type AufgabeAnhangAnzeige = { id: string; dateiname: string; groesseBytes: number; mimetyp: string }

export type AufgabeStandardwerte = {
  titel: string
  beschreibung: string
  faelligAm: string
  prioritaet: string
}

export const LEERE_AUFGABE_STANDARDWERTE: AufgabeStandardwerte = {
  titel: "",
  beschreibung: "",
  faelligAm: "",
  prioritaet: "MITTEL",
}

/**
 * Geteilt zwischen dem Anlegen-Formular und dem Bearbeiten-Pop-Up
 * (AufgabeBearbeitenDialog) — dieselben Felder, damit sie nicht zweimal
 * gepflegt werden müssen (genau das Muster von TerminFormFelder beim
 * Kalender).
 *
 * `weitereOptionenOffen`: beim Anlegen bewusst eingeklappt (kurzes
 * Formular für den Alltag), beim Bearbeiten von Anfang an ausgeklappt —
 * wer extra zum Bearbeiten kommt, will meist genau an diese Felder ran.
 *
 * `bestehendeAnhaenge`/`aufgabeId`/`anhangLoeschenAktion` gibt es nur beim
 * Bearbeiten (beim Anlegen kann es noch keine Anhänge geben).
 */
export function AufgabeFormFelder({
  standardwerte,
  weitereOptionenOffen = false,
  bestehendeAnhaenge = [],
  aufgabeId,
  anhangLoeschenAktion,
}: {
  standardwerte: AufgabeStandardwerte
  weitereOptionenOffen?: boolean
  bestehendeAnhaenge?: AufgabeAnhangAnzeige[]
  aufgabeId?: string
  anhangLoeschenAktion?: (anhangId: string) => void
}) {
  return (
    <>
      <div>
        <label className="block text-xs font-medium text-neutral-600">
          Titel <FeldInfo text="z. B. Dienstplan für Oktober vorbereiten" />
        </label>
        <input
          name="titel"
          type="text"
          required
          defaultValue={standardwerte.titel}
          className="mt-1 h-9 w-full rounded-lg border border-neutral-300 px-2 text-sm"
        />
      </div>

      <details open={weitereOptionenOffen}>
        <summary className="cursor-pointer text-xs font-medium text-marke-gruen-dunkel">
          + Weitere Optionen (Notizen, Fälligkeit, Priorität, Anhänge)
        </summary>

        <div className="mt-3 flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-neutral-600">Notizen (optional)</label>
            <div className="mt-1">
              <RichTextEditor name="beschreibung" defaultValue={standardwerte.beschreibung} />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-600">Fällig am</label>
              <input
                name="faelligAm"
                type="date"
                defaultValue={standardwerte.faelligAm}
                className="mt-1 h-9 rounded-lg border border-neutral-300 px-2 text-sm"
              />
            </div>

            <fieldset>
              <legend className="text-xs font-medium text-neutral-600">Priorität</legend>
              <div className="mt-1.5 flex gap-2">
                {AUFGABE_PRIORITAETEN.map((prioritaet) => (
                  <label
                    key={prioritaet.wert}
                    className="flex cursor-pointer items-center gap-1.5"
                    title={prioritaet.name}
                  >
                    <input
                      type="radio"
                      name="prioritaet"
                      value={prioritaet.wert}
                      defaultChecked={prioritaet.wert === standardwerte.prioritaet}
                      className="peer sr-only"
                    />
                    <span
                      className={
                        "flex h-7 w-7 items-center justify-center rounded-full ring-offset-2 peer-checked:ring-2 peer-checked:ring-marke-grau peer-focus-visible:ring-2 " +
                        prioritaet.klasse
                      }
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          {bestehendeAnhaenge.length > 0 && aufgabeId && (
            <div>
              <label className="block text-xs font-medium text-neutral-600">Bestehende Anhänge</label>
              <ul className="mt-1.5 flex flex-col gap-1">
                {bestehendeAnhaenge.map((anhang) => (
                  <li
                    key={anhang.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-sm"
                  >
                    <a
                      href={`/api/aufgaben/${aufgabeId}/anhaenge/${anhang.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-marke-gruen-dunkel hover:underline"
                    >
                      📎 {anhang.dateiname}
                    </a>
                    {anhangLoeschenAktion && (
                      <form action={anhangLoeschenAktion.bind(null, anhang.id)}>
                        <button
                          type="submit"
                          aria-label={`${anhang.dateiname} entfernen`}
                          className="shrink-0 rounded p-1 text-xs text-neutral-400 hover:bg-red-50 hover:text-red-600"
                        >
                          entfernen
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-neutral-600">
              {bestehendeAnhaenge.length > 0 ? "Weitere Anhänge" : "Anhänge (Dokumente/Fotos)"}
            </label>
            <input
              type="file"
              name="anhaenge"
              multiple
              accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
              className="mt-1.5 w-full text-sm text-neutral-600 file:mr-3 file:h-8 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:text-sm file:font-medium file:text-neutral-700 hover:file:bg-neutral-200"
            />
          </div>
        </div>
      </details>
    </>
  )
}
