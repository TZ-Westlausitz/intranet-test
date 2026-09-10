"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"

import type { Person } from "@/components/termin-form-felder"

/**
 * Suchleiste statt Checkbox-Liste für die Teilnehmerauswahl — bei
 * mehrmaligem Ausklappen sind bei wachsender Belegschaft mehr Namen als
 * in eine kurze Liste passen. Beim Anklicken/Fokussieren öffnet sich die
 * Liste aller noch nicht ausgewählten Personen (auch ohne Sucheingabe),
 * Tippen schränkt sie ein — genau das Verhalten aus dem alten "Überblick".
 *
 * Ausgewählte Personen bleiben als verstecktes `<input name="teilnehmer">`
 * pro Person im Formular — die Server Action liest weiterhin unverändert
 * `formData.getAll("teilnehmer")`, unabhängig davon, ob dahinter eine
 * Checkbox-Liste oder diese Suchleiste steckt.
 *
 * Bewusst NUR Personen, keine Gruppen (Standort/Abteilung o. Ä.) — das
 * wurde für später zurückgestellt, siehe Memory
 * mitarbeiter-auswahl-klappmenue-mit-suche.
 *
 * `mehrfach = false` (z. B. beim Auftrag-Zuweisen, wo es immer genau eine
 * Person gibt): eine neue Auswahl ersetzt die vorherige statt sie zu
 * ergänzen, es gibt also nie mehr als einen Chip. `name` erlaubt ein
 * anderes Feldnamen als "teilnehmer", z. B. "zugewiesenAn".
 *
 * Pfeiltasten ↑/↓ bewegen eine Hervorhebung durch die aktuell gefilterte
 * Liste, Enter übernimmt den hervorgehobenen Treffer, Escape schließt —
 * Rückmeldung 2026-09-09: eine Suchleiste mit Ergebnisliste ohne
 * Tastatur-Auswahl fühlt sich unvollständig an, wenn man ohnehin schon
 * tippt statt zu klicken.
 */
export function PersonenAuswahl({
  personen,
  ausgewaehlteIds,
  name = "teilnehmer",
  mehrfach = true,
  id: eigeneId,
}: {
  personen: Person[]
  ausgewaehlteIds: string[]
  name?: string
  mehrfach?: boolean
  /** Für ein `<label htmlFor>` der aufrufenden Seite — ohne Angabe wird ein Suchfeld-Element ohne verknüpftes Label erzeugt. */
  id?: string
}) {
  const generierteId = useId()
  const id = eigeneId ?? generierteId
  const [ausgewaehlt, setAusgewaehlt] = useState<string[]>(ausgewaehlteIds)
  const [suchtext, setSuchtext] = useState("")
  const [geoeffnet, setGeoeffnet] = useState(false)
  const [hervorgehoben, setHervorgehoben] = useState(0)
  const listeRef = useRef<HTMLDivElement>(null)

  const personenNachId = useMemo(() => new Map(personen.map((p) => [p.id, p])), [personen])

  const gefiltert = personen.filter(
    (p) => !ausgewaehlt.includes(p.id) && p.name.toLowerCase().includes(suchtext.toLowerCase()),
  )
  const hervorgehobenerIndex = Math.min(hervorgehoben, gefiltert.length - 1)

  // Die Hervorhebung ins Bild scrollen, wenn sie per Pfeiltaste aus dem
  // sichtbaren Bereich der Trefferliste wandert.
  useEffect(() => {
    if (!geoeffnet) return
    listeRef.current
      ?.querySelector(`[data-index="${hervorgehobenerIndex}"]`)
      ?.scrollIntoView({ block: "nearest" })
  }, [hervorgehobenerIndex, geoeffnet])

  function hinzufuegen(personId: string) {
    setAusgewaehlt((bisher) => (mehrfach ? [...bisher, personId] : [personId]))
    setSuchtext("")
    setHervorgehoben(0)
  }

  function entfernen(personId: string) {
    setAusgewaehlt((bisher) => bisher.filter((x) => x !== personId))
  }

  function beiTaste(ereignis: React.KeyboardEvent<HTMLInputElement>) {
    if (ereignis.key === "ArrowDown") {
      ereignis.preventDefault()
      setGeoeffnet(true)
      setHervorgehoben((i) => Math.min(i + 1, gefiltert.length - 1))
    } else if (ereignis.key === "ArrowUp") {
      ereignis.preventDefault()
      setHervorgehoben((i) => Math.max(i - 1, 0))
    } else if (ereignis.key === "Enter") {
      if (!geoeffnet || gefiltert.length === 0) return
      ereignis.preventDefault()
      hinzufuegen(gefiltert[hervorgehobenerIndex].id)
    } else if (ereignis.key === "Escape") {
      setGeoeffnet(false)
    }
  }

  return (
    <div className="relative">
      {ausgewaehlt.map((personId) => (
        <input key={personId} type="hidden" name={name} value={personId} />
      ))}

      {ausgewaehlt.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {ausgewaehlt.map((personId) => {
            const person = personenNachId.get(personId)
            if (!person) return null
            return (
              <span
                key={personId}
                className="flex items-center gap-1 rounded-full bg-marke-gruen/15 py-1 pl-2.5 pr-1 text-xs text-marke-grau"
              >
                {person.name}
                <button
                  type="button"
                  aria-label={`${person.name} entfernen`}
                  onClick={() => entfernen(personId)}
                  className="flex h-4 w-4 items-center justify-center rounded-full text-neutral-500 hover:bg-white/60"
                >
                  ×
                </button>
              </span>
            )
          })}
        </div>
      )}

      <input
        id={`${id}-suche`}
        type="text"
        role="combobox"
        aria-expanded={geoeffnet}
        aria-controls={`${id}-liste`}
        aria-autocomplete="list"
        value={suchtext}
        onChange={(ereignis) => {
          setSuchtext(ereignis.target.value)
          setGeoeffnet(true)
          setHervorgehoben(0)
        }}
        onFocus={() => setGeoeffnet(true)}
        onBlur={() => window.setTimeout(() => setGeoeffnet(false), 150)}
        onKeyDown={beiTaste}
        placeholder="Person suchen …"
        className="h-9 w-full rounded-lg border border-neutral-300 px-2 text-sm"
      />

      {geoeffnet && (
        <div
          ref={listeRef}
          id={`${id}-liste`}
          role="listbox"
          className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-lg"
        >
          {gefiltert.length === 0 ? (
            <p className="px-3 py-2 text-sm text-neutral-400">Keine Treffer</p>
          ) : (
            gefiltert.map((person, index) => (
              <button
                key={person.id}
                type="button"
                data-index={index}
                role="option"
                aria-selected={index === hervorgehobenerIndex}
                // Verhindert, dass der onBlur des Suchfelds das Dropdown
                // schließt, BEVOR der Klick hier ankommt.
                onMouseDown={(ereignis) => ereignis.preventDefault()}
                onMouseEnter={() => setHervorgehoben(index)}
                onClick={() => hinzufuegen(person.id)}
                className={
                  "block w-full px-3 py-2 text-left text-sm text-neutral-700 " +
                  (index === hervorgehobenerIndex ? "bg-marke-gruen/10" : "hover:bg-neutral-50")
                }
              >
                {person.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
