"use client"

import { useEffect, useRef, useState } from "react"
import { Plus, X } from "lucide-react"

type Zeile = { schluessel: number; id: string; text: string }

/**
 * Zeilen der Checkliste beim Anlegen/Bearbeiten einer Aufgabe: eine Zeile je
 * Unterpunkt, "Punkt hinzufügen" und Entfernen. Die Überschrift und den
 * Erklärtext liefert der Aufrufer (AuftragFormFelder: Checkbox "Checkliste"
 * mit Info-Symbol). Die Zeilen gehen als parallele Felder `checkpunktId`
 * (leer bei neuen Punkten, sonst die ID des vorhandenen — dadurch bleibt
 * dessen Abhak-Stand erhalten) und `checkpunktText` mit dem normalen
 * Formular-Absenden an die Server Action (siehe checkpunkteAusFormData).
 * Enter in einem Feld legt die nächste Zeile an, statt das ganze Formular
 * abzuschicken. `onAenderung` meldet die Texte für die Live-Vorschau.
 * Ohne vorhandene Punkte startet der Editor mit einer leeren Zeile
 * (`autoFokus`: Cursor gleich dort, wenn die Checkliste eben erst
 * eingeschaltet wurde).
 */
export function CheckpunkteEditor({
  startwerte,
  onAenderung,
  autoFokus = false,
}: {
  startwerte: { id: string; text: string }[]
  onAenderung?: (texte: string[]) => void
  autoFokus?: boolean
}) {
  const naechsterSchluessel = useRef(Math.max(startwerte.length, 1))
  const [zeilen, setZeilen] = useState<Zeile[]>(
    startwerte.length > 0
      ? startwerte.map((punkt, index) => ({ schluessel: index, id: punkt.id, text: punkt.text }))
      : [{ schluessel: 0, id: "", text: "" }],
  )
  const eingabeRefs = useRef(new Map<number, HTMLInputElement>())

  function setzen(neu: Zeile[]) {
    setZeilen(neu)
    onAenderung?.(neu.map((zeile) => zeile.text))
  }

  useEffect(() => {
    if (autoFokus) eingabeRefs.current.get(0)?.focus()
    // Nur beim Einhängen: Cursor in die erste Zeile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function hinzufuegen() {
    const schluessel = naechsterSchluessel.current++
    setzen([...zeilen, { schluessel, id: "", text: "" }])
    // Nach dem Rendern ins neue Feld springen.
    window.setTimeout(() => eingabeRefs.current.get(schluessel)?.focus(), 0)
  }

  return (
    <div className="mt-2">
      <ul className="flex flex-col gap-1.5">
        {zeilen.map((zeile) => (
          <li key={zeile.schluessel} className="flex items-center gap-1.5">
            <span aria-hidden className="h-4 w-4 shrink-0 rounded border-2 border-flaeche-300" />
            <input type="hidden" name="checkpunktId" value={zeile.id} />
            <input
              ref={(element) => {
                if (element) eingabeRefs.current.set(zeile.schluessel, element)
                else eingabeRefs.current.delete(zeile.schluessel)
              }}
              type="text"
              name="checkpunktText"
              maxLength={200}
              value={zeile.text}
              onChange={(ereignis) =>
                setzen(zeilen.map((andere) => (andere.schluessel === zeile.schluessel ? { ...andere, text: ereignis.target.value } : andere)))
              }
              placeholder="Unterpunkt"
              aria-label="Unterpunkt"
              onKeyDown={(ereignis) => {
                if (ereignis.key === "Enter") {
                  ereignis.preventDefault()
                  hinzufuegen()
                }
              }}
              className="h-9 min-w-0 flex-1 rounded-lg border border-flaeche-300 px-2 text-sm"
            />
            <button
              type="button"
              onClick={() => setzen(zeilen.filter((andere) => andere.schluessel !== zeile.schluessel))}
              aria-label="Unterpunkt entfernen"
              className="shrink-0 rounded p-1.5 text-tertiaer transition hover:bg-red-50 hover:text-red-600"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </li>
        ))}
      </ul>

      {zeilen.length < 30 && (
        <button
          type="button"
          onClick={hinzufuegen}
          className="mt-1.5 inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-marke-gruen-dunkel transition hover:bg-flaeche-100"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden /> Punkt hinzufügen
        </button>
      )}
    </div>
  )
}
