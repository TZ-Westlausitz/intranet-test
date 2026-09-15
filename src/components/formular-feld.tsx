"use client"

import { useEffect, useRef } from "react"

import { FormularElementTyp } from "@/generated/prisma/enums"

export type FormularFeldElement = {
  id: string
  typ: FormularElementTyp
  label: string | null
  pflicht: boolean
  inhalt: string | null
  optionen: { wert: string }[]
  bedingungElementId?: string | null
  bedingungWert?: string | null
}

/** Ob `element` gegeben die aktuellen Trigger-Werte sichtbar ist — siehe FormularElement.bedingungElementId. Ohne Bedingung immer sichtbar. */
export function formularElementSichtbar(
  element: { bedingungElementId?: string | null; bedingungWert?: string | null },
  triggerWerte: Record<string, string>,
): boolean {
  if (!element.bedingungElementId) return true
  return triggerWerte[element.bedingungElementId] === element.bedingungWert
}

/** IDs aller Elemente, die als Bedingungs-Trigger für mindestens ein anderes Element dienen — die brauchen kontrollierten (statt unkontrollierten) State. */
export function formularTriggerIds(elemente: { bedingungElementId?: string | null }[]): Set<string> {
  return new Set(elemente.filter((e) => e.bedingungElementId).map((e) => e.bedingungElementId as string))
}

const EINGABE_KLASSE = "h-9 w-full rounded-lg border border-flaeche-300 px-2 text-sm"

/** Heutiges Datum als "YYYY-MM-DD" in der LOKALEN Zeitzone (nicht toISOString — die rechnet auf UTC um und würde nahe Mitternacht das falsche Datum liefern). */
function heutigesDatumIso(): string {
  const heute = new Date()
  const monat = String(heute.getMonth() + 1).padStart(2, "0")
  const tag = String(heute.getDate()).padStart(2, "0")
  return `${heute.getFullYear()}-${monat}-${tag}`
}

/**
 * Datumsfeld, mit Heute vorbelegt (Rückmeldung 2026-09-09: manche Browser
 * zeigen im Datepicker optisch schon das heutige Datum, ohne es wirklich
 * als Wert zu committen — beim Absenden griff dann trotzdem die
 * Pflichtfeld-Prüfung). Die Vorbelegung passiert erst NACH dem Mounten via
 * Ref statt über `defaultValue` direkt, damit Server- und Client-Rendering
 * (unterschiedliche Zeitzonen möglich) exakt gleich aussehen — sonst
 * Hydration-Mismatch. Kein Effekt auf CHECKBOX/Trigger-Logik: rein lokal.
 */
function FormularDatumFeld({ id, name, required }: { id: string; name: string; required: boolean }) {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (ref.current && !ref.current.value) ref.current.value = heutigesDatumIso()
  }, [])

  return <input ref={ref} id={id} name={name} type="date" required={required} className={EINGABE_KLASSE} />
}

/**
 * Für die Anzeige von gespeichertem Rich-Text-HTML (Beschreibung,
 * TEXTBLOCK) außerhalb des Editors — dieselben Tabellen-/Bild-Regeln wie
 * `RichTextEditor`s eigene Editor-Klasse, sonst laufen eingefügte Bilder
 * und Zwei-Spalten-Tabellen (siehe RichTextEditor, bilderErlaubt/
 * tabelleErlaubt) außerhalb des Editors aus dem Rahmen.
 */
export const RICH_TEXT_ANZEIGE_KLASSE =
  "prose prose-sm max-w-none [&_a]:text-marke-gruen-dunkel [&_a]:underline [&_img]:max-w-full [&_table]:w-full [&_table]:table-fixed [&_table]:border-collapse [&_td]:border [&_td]:border-flaeche-300 [&_td]:p-2 [&_td]:align-top [&_th]:border [&_th]:border-flaeche-300 [&_th]:p-2 [&_th]:align-top"

/** Linienstil für TRENNZEICHEN — siehe Kommentar am Model FormularElement (Wert steckt in `label`). */
const TRENNZEICHEN_BORDER: Record<string, string> = {
  PUNKTIERT: "dotted",
  DURCHGEZOGEN: "solid",
  GESTRICHELT: "dashed",
}

/**
 * Rendert EIN Formular-Element — dieselbe Komponente für die Live-Vorschau
 * im Baukasten (FormularBaukasten) und das echte Ausfüllen
 * (FormularAusfuellen), nur ohne bzw. mit umschließendem `<form
 * action=...>`. Feldname `element_${element.id}` — dieselbe Konvention
 * liest `formularEinreichen` serverseitig wieder aus.
 *
 * Bedingt sichtbare Elemente (siehe FormularElement.bedingungElementId)
 * werden hier NICHT gefiltert — das entscheidet der Aufrufer (welche
 * Elemente überhaupt gerendert werden, siehe formularElementSichtbar).
 * Diese Komponente kümmert sich nur um den kontrollierten State des
 * Trigger-Felds selbst (`wert`/`aufWertAendern`).
 */
export function FormularFeld({
  element,
  orte,
  wert,
  aufWertAendern,
}: {
  element: FormularFeldElement
  orte: { id: string; name: string }[]
  /** Aktueller Wert + Setter, NUR für AUSWAHL_EINZEL-Elemente, die als Bedingungs-Trigger für ein anderes Element dienen (siehe formularTriggerIds) — sonst bleibt das Feld unkontrolliert. */
  wert?: string
  aufWertAendern?: (wert: string) => void
}) {
  const feldName = `element_${element.id}`

  if (element.typ === FormularElementTyp.TEXTBLOCK) {
    return (
      <div
        className={RICH_TEXT_ANZEIGE_KLASSE + " text-primaer"}
        dangerouslySetInnerHTML={{ __html: element.inhalt ?? "" }}
      />
    )
  }

  if (element.typ === FormularElementTyp.TRENNZEICHEN) {
    const stilKlasse =
      TRENNZEICHEN_BORDER[element.label ?? ""] === "dotted"
        ? "border-dotted border-t-2"
        : TRENNZEICHEN_BORDER[element.label ?? ""] === "dashed"
          ? "border-dashed border-t-2"
          : "border-solid border-t"
    return <hr className={"border-flaeche-300 " + stilKlasse} />
  }

  return (
    <div className={element.bedingungElementId ? "border-l-2 border-rand pl-3" : undefined}>
      <label htmlFor={feldName} className="mb-1 block text-sm font-medium text-primaer">
        {element.label}
        {element.pflicht && <span className="text-marke-orange"> *</span>}
      </label>

      {element.typ === FormularElementTyp.TEXT_EINZEILIG && (
        <input id={feldName} name={feldName} type="text" required={element.pflicht} className={EINGABE_KLASSE} />
      )}

      {element.typ === FormularElementTyp.TEXT_MEHRZEILIG && (
        <textarea id={feldName} name={feldName} required={element.pflicht} rows={4} className={EINGABE_KLASSE + " h-auto"} />
      )}

      {element.typ === FormularElementTyp.ZAHL && (
        <input id={feldName} name={feldName} type="number" required={element.pflicht} className={EINGABE_KLASSE} />
      )}

      {element.typ === FormularElementTyp.DATUM && (
        <FormularDatumFeld id={feldName} name={feldName} required={element.pflicht} />
      )}

      {element.typ === FormularElementTyp.DATEI && (
        <input id={feldName} name={feldName} type="file" required={element.pflicht} className="text-sm" />
      )}

      {element.typ === FormularElementTyp.ORT && (
        <select id={feldName} name={feldName} required={element.pflicht} defaultValue="" className={EINGABE_KLASSE}>
          <option value="" disabled>
            Bitte wählen …
          </option>
          {orte.map((ort) => (
            <option key={ort.id} value={ort.id}>
              {ort.name}
            </option>
          ))}
        </select>
      )}

      {element.typ === FormularElementTyp.AUSWAHL_EINZEL &&
        (aufWertAendern ? (
          <select
            id={feldName}
            name={feldName}
            required={element.pflicht}
            value={wert ?? ""}
            onChange={(e) => aufWertAendern(e.target.value)}
            className={EINGABE_KLASSE}
          >
            <option value="" disabled>
              Bitte wählen …
            </option>
            {element.optionen.map((option) => (
              <option key={option.wert} value={option.wert}>
                {option.wert}
              </option>
            ))}
          </select>
        ) : (
          <select id={feldName} name={feldName} required={element.pflicht} defaultValue="" className={EINGABE_KLASSE}>
            <option value="" disabled>
              Bitte wählen …
            </option>
            {element.optionen.map((option) => (
              <option key={option.wert} value={option.wert}>
                {option.wert}
              </option>
            ))}
          </select>
        ))}

      {element.typ === FormularElementTyp.AUSWAHL_MEHRFACH && (
        <div className="flex flex-col gap-1.5">
          {element.optionen.map((option) => (
            <label key={option.wert} className="flex items-center gap-2 text-sm text-primaer">
              <input type="checkbox" name={feldName} value={option.wert} className="h-4 w-4 rounded border-flaeche-300" />
              {option.wert}
            </label>
          ))}
        </div>
      )}

      {element.typ === FormularElementTyp.CHECKBOX && (
        <label className="flex items-center gap-2 text-sm text-primaer">
          <input id={feldName} name={feldName} type="checkbox" className="h-4 w-4 rounded border-flaeche-300" />
          Ja
        </label>
      )}
    </div>
  )
}
