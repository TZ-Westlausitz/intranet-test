import { Paperclip } from "lucide-react"

import { RichTextEditor } from "@/components/rich-text-editor"
import { AUFGABE_PRIORITAETEN } from "@/lib/aufgaben-optionen"
import { datumIsoAusDate } from "@/lib/datum"

export type AufgabeAnhangAnzeige = { id: string; dateiname: string; groesseBytes: number; mimetyp: string }

export type AufgabeStandardwerte = {
  titel: string
  beschreibung: string
  faelligAm: string
  prioritaet: string
  /** datumIsoAusDate-formatiert, leer = kein Termin gesetzt. */
  geplantAm: string
  /**
   * Ob das "Geplant für"-Feld überhaupt angezeigt wird — beim Anlegen
   * immer `true`, beim Bearbeiten nur solange die Aufgabe noch nicht aktiv
   * ist (siehe aufgabeZuStandardwerte). Auf einer schon aktiven Aufgabe
   * wäre das Feld irreführend leer.
   */
  geplantAmBearbeitbar: boolean
}

export const LEERE_AUFGABE_STANDARDWERTE: AufgabeStandardwerte = {
  titel: "",
  beschreibung: "",
  faelligAm: "",
  prioritaet: "MITTEL",
  geplantAm: "",
  geplantAmBearbeitbar: true,
}

/**
 * Wandelt eine geladene Aufgabe (To-do-Liste oder Kalendereintrag unter
 * "Geplante Aktionen") in `AufgabeStandardwerte` für den Bearbeiten-Dialog
 * um — an EINER Stelle statt an jeder aufrufenden Komponente einzeln
 * nachgebaut (Muster: infoZuStandardwerte in info-form-felder.tsx).
 */
export function aufgabeZuStandardwerte(aufgabe: {
  titel: string
  beschreibung: string | null
  faelligAm: Date | null
  prioritaet: string
  geplantAm: Date | null
}): AufgabeStandardwerte {
  const jetzt = new Date()
  return {
    titel: aufgabe.titel,
    beschreibung: aufgabe.beschreibung ?? "",
    faelligAm: aufgabe.faelligAm ? datumIsoAusDate(aufgabe.faelligAm) : "",
    prioritaet: aufgabe.prioritaet,
    geplantAm: aufgabe.geplantAm ? datumIsoAusDate(aufgabe.geplantAm) : "",
    geplantAmBearbeitbar: aufgabe.geplantAm === null || aufgabe.geplantAm > jetzt,
  }
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
        <label className="block text-xs font-medium text-primaer">
          Titel
        </label>
        <input
          name="titel"
          type="text"
          required
          defaultValue={standardwerte.titel}
          className="mt-1 h-9 w-full rounded-lg border border-flaeche-300 px-2 text-sm"
        />
      </div>

      <details open={weitereOptionenOffen}>
        <summary className="cursor-pointer text-xs font-medium text-marke-gruen-dunkel">
          + Weitere Optionen (Notizen, Fälligkeit, Priorität, Anhänge)
        </summary>

        <div className="mt-3 flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-primaer">Notizen (optional)</label>
            <div className="mt-1">
              <RichTextEditor name="beschreibung" defaultValue={standardwerte.beschreibung} />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-primaer">Fällig am</label>
              <input
                name="faelligAm"
                type="date"
                defaultValue={standardwerte.faelligAm}
                className="mt-1 h-9 rounded-lg border border-flaeche-300 px-2 text-sm"
              />
            </div>

            <fieldset>
              <legend className="text-xs font-medium text-primaer">Priorität</legend>
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

          {standardwerte.geplantAmBearbeitbar && (
            <div>
              <label className="block text-xs font-medium text-primaer">Geplant für (optional)</label>
              <input
                name="geplantAm"
                type="date"
                defaultValue={standardwerte.geplantAm}
                className="mt-1 h-9 rounded-lg border border-flaeche-300 px-2 text-sm"
              />
              <p className="mt-1.5 text-xs text-sekundaer">Taucht erst ab diesem Datum in der To-Do-Liste auf.</p>
            </div>
          )}

          {bestehendeAnhaenge.length > 0 && aufgabeId && (
            <div>
              <label className="block text-xs font-medium text-primaer">Bestehende Anhänge</label>
              <ul className="mt-1.5 flex flex-col gap-1">
                {bestehendeAnhaenge.map((anhang) => (
                  <li
                    key={anhang.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-rand px-2.5 py-1.5 text-sm"
                  >
                    <a
                      href={`/api/aufgaben/${aufgabeId}/anhaenge/${anhang.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 truncate text-marke-gruen-dunkel hover:underline"
                    >
                      <Paperclip className="h-3.5 w-3.5 shrink-0" aria-hidden /> {anhang.dateiname}
                    </a>
                    {anhangLoeschenAktion && (
                      <form action={anhangLoeschenAktion.bind(null, anhang.id)}>
                        <button
                          type="submit"
                          aria-label={`${anhang.dateiname} entfernen`}
                          className="shrink-0 rounded p-1 text-xs text-tertiaer hover:bg-red-50 hover:text-red-600"
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
            <label className="block text-xs font-medium text-primaer">
              {bestehendeAnhaenge.length > 0 ? "Weitere Anhänge" : "Anhänge (Dokumente/Fotos)"}
            </label>
            <input
              type="file"
              name="anhaenge"
              multiple
              accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
              className="mt-1.5 w-full text-sm text-primaer file:mr-3 file:h-8 file:rounded-lg file:border-0 file:bg-flaeche-100 file:px-3 file:text-sm file:font-medium file:text-primaer hover:file:bg-flaeche-200"
            />
          </div>
        </div>
      </details>
    </>
  )
}
