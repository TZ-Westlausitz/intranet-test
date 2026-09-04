"use client"

import { useEffect, useState } from "react"

import { Hinweis } from "@/components/hinweis"
import { FeldInfo } from "@/components/feld-info"
import { heutigesDatumIso } from "@/lib/datum"

/**
 * Formular für die Fahrzeug-Anfrage — Client-Komponente, weil die
 * PDF-Vorschau unten die Eingaben von oben live übernehmen soll (Fahrer,
 * Zeitraum). Zweck fließt nicht ins PDF ein und bleibt deshalb
 * unkontrolliert (kein State nötig).
 *
 * Die Vorschau selbst kommt aus einer Server-Route
 * (/api/nutzungsvereinbarung-vorschau), die das echte, ausfüllbare PDF
 * serverseitig befüllt — Regel 6 in der CLAUDE.md: PDFs werden
 * ausschließlich serverseitig erzeugt, auch die Vorschau.
 *
 * Das Häkchen ist weiterhin KEINE Unterschrift — siehe Kommentar in
 * page.tsx.
 */

function useDebounced<T>(wert: T, verzoegerungMs: number): T {
  const [debounced, setDebounced] = useState(wert)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(wert), verzoegerungMs)
    return () => clearTimeout(timer)
  }, [wert, verzoegerungMs])

  return debounced
}

export function AnfrageFormular({
  fahrzeugId,
  aktion,
  fehler,
}: {
  fahrzeugId: string
  aktion: (formData: FormData) => void
  fehler?: string
}) {
  const [geplantVon, setGeplantVon] = useState(() => heutigesDatumIso())
  const [geplantBis, setGeplantBis] = useState(() => heutigesDatumIso())
  const [fahrer, setFahrer] = useState("")
  const [vorschauOffen, setVorschauOffen] = useState(false)

  // Rutscht "Von" über "Bis" hinaus (der häufige Fall: nur ein Tag gemeint),
  // zieht "Bis" automatisch nach — bleibt aber jederzeit von Hand auf einen
  // späteren Tag änderbar, z.B. für mehrtägige Ausleihen. `min` unten am
  // "Bis"-Feld sorgt zusätzlich dafür, dass sich von Hand kein Tag vor
  // "Von" mehr auswählen lässt.
  function geplantVonAendern(neuesVon: string) {
    setGeplantVon(neuesVon)
    if (neuesVon > geplantBis) {
      setGeplantBis(neuesVon)
    }
  }

  // Nicht bei jedem Tastendruck neu erzeugen lassen — kurze Pause abwarten.
  const geplantVonVerzoegert = useDebounced(geplantVon, 400)
  const geplantBisVerzoegert = useDebounced(geplantBis, 400)
  const fahrerVerzoegert = useDebounced(fahrer, 400)

  // "#view=Fit": PDF-Open-Parameter, den Chromiums eingebauter PDF-Viewer
  // versteht — zeigt die Seite komplett statt mit ihrem sonstigen
  // Standard-Zoom, bei dem oben ein Teil abgeschnitten wirkt.
  const vorschauUrl =
    `/api/nutzungsvereinbarung-vorschau?fahrzeugId=${encodeURIComponent(fahrzeugId)}` +
    `&fahrer=${encodeURIComponent(fahrerVerzoegert)}` +
    `&geplantVon=${encodeURIComponent(geplantVonVerzoegert)}` +
    `&geplantBis=${encodeURIComponent(geplantBisVerzoegert)}` +
    `#view=Fit`

  return (
    <form action={aktion} className="mt-8 flex flex-col gap-4">
      <input type="hidden" name="fahrzeugId" value={fahrzeugId} />

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium">Von</span>
          <input
            type="date"
            name="geplantVon"
            required
            value={geplantVon}
            onChange={(e) => geplantVonAendern(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2.5 text-base focus:border-marke-gruen focus:outline focus:outline-2 focus:outline-marke-gruen"
          />
        </label>

        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium">Bis</span>
          <input
            type="date"
            name="geplantBis"
            required
            min={geplantVon}
            value={geplantBis}
            onChange={(e) => setGeplantBis(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2.5 text-base focus:border-marke-gruen focus:outline focus:outline-2 focus:outline-marke-gruen"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Fahrer, falls abweichend</span>
        <input
          type="text"
          name="fahrer"
          value={fahrer}
          onChange={(e) => setFahrer(e.target.value)}
          placeholder="Leer lassen, wenn du selbst fährst"
          className="rounded-lg border border-neutral-300 px-3 py-2.5 text-base focus:border-marke-gruen focus:outline focus:outline-2 focus:outline-marke-gruen"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">
          Zweck <FeldInfo text="z. B. Umzug, Familienfeier" />
        </span>
        <input
          type="text"
          name="zweck"
          required
          className="rounded-lg border border-neutral-300 px-3 py-2.5 text-base focus:border-marke-gruen focus:outline focus:outline-2 focus:outline-marke-gruen"
        />
      </label>

      <details
        className="rounded-lg border border-neutral-200 p-4"
        onToggle={(e) => setVorschauOffen(e.currentTarget.open)}
      >
        <summary className="cursor-pointer text-sm font-medium text-marke-grau">
          Nutzungsvereinbarung ansehen
        </summary>
        <div className="mt-3">
          {vorschauOffen && (
            <iframe
              src={vorschauUrl}
              title="Nutzungsvereinbarung (Vorschau, unterschrieben wird bei der Übergabe)"
              className="h-[70vh] w-full rounded border border-neutral-200"
            />
          )}
        </div>
      </details>

      <div className="flex flex-col gap-2">
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="bestaetigt" className="mt-1" />
          <span>
            Ich habe die Nutzungsvereinbarung gelesen. Meine Anfrage für den
            oben genannten Zeitraum ist verbindlich gemeint. Die eigentliche
            Unterschrift der Nutzungsvereinbarung erfolgt bei der Übergabe.
          </span>
        </label>
        {fehler === "haekchen" && <Hinweis>Pflichtfeld — bitte ankreuzen.</Hinweis>}
      </div>

      {fehler === "pflichtfeld" && <Hinweis>Bitte alle Felder ausfüllen.</Hinweis>}
      {fehler === "zeitraum" && <Hinweis>&quot;Bis&quot; darf nicht vor &quot;Von&quot; liegen.</Hinweis>}

      <button
        type="submit"
        className="mt-2 rounded-lg bg-marke-gruen px-4 py-2.5 font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen focus-visible:outline-offset-2"
      >
        Anfrage senden
      </button>
    </form>
  )
}
