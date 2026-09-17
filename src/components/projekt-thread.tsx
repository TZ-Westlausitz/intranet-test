"use client"

import { useRef, useState } from "react"

export type ProjektnachrichtAnzeige = {
  id: string
  text: string
  erstelltAm: Date
  person: { vorname: string; nachname: string }
}

export type ProjektDokumentErwaehnung = { id: string; dateiname: string }

// Ein per # eingefügter Dokumentverweis steht im Text als #[Dateiname](dokumentId).
const ERWAEHNUNG_MUSTER = /#\[([^\]]+)\]\(([a-zA-Z0-9]+)\)/g

/**
 * Rendert den Nachrichtentext und löst dabei #[Dateiname](dokumentId) in
 * einen anklickbaren Link zum Dokument auf — der Rest bleibt ganz normaler
 * React-Text (kein dangerouslySetInnerHTML nötig, siehe Kommentar am Model
 * Projektnachricht: schlichter String, hier nur zusätzlich geparst).
 */
function NachrichtText({ projektId, text }: { projektId: string; text: string }) {
  const teile: React.ReactNode[] = []
  let letzterIndex = 0
  let schluessel = 0
  const regex = new RegExp(ERWAEHNUNG_MUSTER)
  let treffer: RegExpExecArray | null
  while ((treffer = regex.exec(text)) !== null) {
    if (treffer.index > letzterIndex) teile.push(text.slice(letzterIndex, treffer.index))
    teile.push(
      <a
        key={schluessel++}
        href={`/api/projekte/${projektId}/dokumente/${treffer[2]}`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-marke-gruen-dunkel hover:underline"
      >
        #{treffer[1]}
      </a>,
    )
    letzterIndex = treffer.index + treffer[0].length
  }
  if (letzterIndex < text.length) teile.push(text.slice(letzterIndex))
  return <>{teile}</>
}

/**
 * Projektweiter Abstimmungs-Thread — chronologische Liste, kein
 * Live-Chat/WebSocket (siehe Kommentar am Model Projektnachricht): ein
 * Absenden lädt die Seite über die normale Server-Action-Navigation neu,
 * das reicht für den schmalen Rahmen dieses Bausteins.
 *
 * "#" im Nachrichtenfeld öffnet eine Ausklappliste der Projektdokumente —
 * eine Auswahl fügt #[Dateiname](dokumentId) ein, das beim Anzeigen
 * (NachrichtText) zu einem Link auf das Dokument wird.
 */
export function ProjektThread({
  projektId,
  nachrichten,
  dokumente,
  schreibgeschuetzt,
  nachrichtAktion,
}: {
  projektId: string
  nachrichten: ProjektnachrichtAnzeige[]
  dokumente: ProjektDokumentErwaehnung[]
  schreibgeschuetzt: boolean
  nachrichtAktion: (projektId: string, formData: FormData) => void
}) {
  const [text, setText] = useState("")
  const [erwaehnungOffen, setErwaehnungOffen] = useState(false)
  const [erwaehnungFilter, setErwaehnungFilter] = useState("")
  const eingabeRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const gefilterteDokumente = dokumente.filter((d) =>
    d.dateiname.toLowerCase().includes(erwaehnungFilter.toLowerCase()),
  )

  // Sucht rückwärts vom Cursor das letzte "#" — solange danach kein
  // Leerzeichen und keine bereits abgeschlossene Erwähnung ("]") kommt,
  // gilt das als laufende Eingabe für die Ausklappliste.
  function beiTextAendern(ereignis: React.ChangeEvent<HTMLInputElement>) {
    const wert = ereignis.target.value
    setText(wert)
    const cursorPosition = ereignis.target.selectionStart ?? wert.length
    const vorCursor = wert.slice(0, cursorPosition)
    const rautenIndex = vorCursor.lastIndexOf("#")
    const stueckAbRaute = rautenIndex === -1 ? "" : vorCursor.slice(rautenIndex + 1)
    if (rautenIndex !== -1 && !/[\s\]]/.test(stueckAbRaute)) {
      setErwaehnungFilter(stueckAbRaute)
      setErwaehnungOffen(true)
    } else {
      setErwaehnungOffen(false)
    }
  }

  function dokumentEinfuegen(dokument: ProjektDokumentErwaehnung) {
    const cursorPosition = eingabeRef.current?.selectionStart ?? text.length
    const vorCursor = text.slice(0, cursorPosition)
    const rautenIndex = vorCursor.lastIndexOf("#")
    if (rautenIndex === -1) return
    const neuerText = `${text.slice(0, rautenIndex)}#[${dokument.dateiname}](${dokument.id}) ${text.slice(cursorPosition)}`
    setText(neuerText)
    setErwaehnungOffen(false)
    eingabeRef.current?.focus()
  }

  return (
    <div className="flex flex-col gap-3">
      {nachrichten.length === 0 ? (
        <p className="text-sm text-sekundaer">Noch keine Nachrichten.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {nachrichten.map((nachricht) => (
            <li key={nachricht.id} className="rounded-lg bg-flaeche-schwach px-2.5 py-1.5">
              <p className="text-xs font-medium text-sekundaer">
                {nachricht.person.vorname} {nachricht.person.nachname} ·{" "}
                {nachricht.erstelltAm.toLocaleString("de-DE", { timeZone: "Europe/Berlin",
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p className="text-sm text-primaer">
                <NachrichtText projektId={projektId} text={nachricht.text} />
              </p>
            </li>
          ))}
        </ul>
      )}

      {!schreibgeschuetzt && (
        <form
          ref={formRef}
          action={nachrichtAktion.bind(null, projektId)}
          onSubmit={() =>
            window.setTimeout(() => {
              formRef.current?.reset()
              setText("")
            }, 0)
          }
          className="relative flex gap-2 border-t border-flaeche-100 pt-3"
        >
          <input
            ref={eingabeRef}
            type="text"
            name="text"
            required
            value={text}
            onChange={beiTextAendern}
            onBlur={() => window.setTimeout(() => setErwaehnungOffen(false), 150)}
            placeholder="Nachricht …"
            className="h-9 flex-1 rounded-lg border border-flaeche-300 px-2 text-sm"
          />
          <button
            type="submit"
            className="h-9 shrink-0 rounded-lg bg-flaeche-100 px-3 text-sm font-medium text-primaer transition hover:bg-flaeche-200"
          >
            Senden
          </button>

          {erwaehnungOffen && (
            <div className="absolute bottom-full left-0 z-10 mb-1 max-h-40 w-full max-w-xs overflow-y-auto rounded-lg border border-rand bg-flaeche shadow-lg">
              {gefilterteDokumente.length === 0 ? (
                <p className="px-3 py-2 text-sm text-tertiaer">Keine Dokumente</p>
              ) : (
                gefilterteDokumente.map((dokument) => (
                  <button
                    key={dokument.id}
                    type="button"
                    onMouseDown={(ereignis) => ereignis.preventDefault()}
                    onClick={() => dokumentEinfuegen(dokument)}
                    className="block w-full truncate px-3 py-2 text-left text-sm text-primaer hover:bg-flaeche-schwach"
                  >
                    📎 {dokument.dateiname}
                  </button>
                ))
              )}
            </div>
          )}
        </form>
      )}
    </div>
  )
}
