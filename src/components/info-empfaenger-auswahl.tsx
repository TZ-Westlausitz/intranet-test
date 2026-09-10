"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"

import type { Person } from "@/components/termin-form-felder"

type EmpfaengerTyp = "abteilung" | "gruppe" | "person"
type EmpfaengerEintrag = { id: string; name: string; typ: EmpfaengerTyp }

const STANDARD_FELDNAME: Record<EmpfaengerTyp, string> = {
  abteilung: "empfaengerAbteilungen",
  gruppe: "empfaengerGruppen",
  person: "empfaengerPersonen",
}
const KATEGORIE_LABEL: Record<EmpfaengerTyp, string> = {
  abteilung: "Abteilungen",
  gruppe: "Gruppen",
  person: "Personen",
}
const CHIP_FARBE: Record<EmpfaengerTyp, string> = {
  abteilung: "bg-neutral-200 text-neutral-700",
  gruppe: "bg-marke-orange/20 text-marke-grau",
  person: "bg-marke-gruen/15 text-marke-grau",
}
const REIHENFOLGE: EmpfaengerTyp[] = ["abteilung", "gruppe", "person"]

/**
 * Eine einzige Empfänger-Suchzeile statt dreier getrennter (Abteilungen/
 * Gruppen/Personen) — beim Aufklappen zeigt sie alle drei Kategorien
 * gruppiert untereinander, gefiltert nach demselben Suchtext. Anders als
 * `PersonenAuswahl` (die dieselbe Chip-mit-Suchfeld-Mechanik für EINE
 * homogene Liste bietet) muss diese Komponente pro Auswahl wissen, aus
 * welcher der drei Kategorien sie stammt, um beim Absenden das richtige
 * Formularfeld zu befüllen (`empfaengerAbteilungen`/`empfaengerGruppen`/
 * `empfaengerPersonen` — dieselben drei Feldnamen, die infoErstellen/
 * infoAktualisieren ohnehin schon per `formData.getAll(...)` lesen,
 * unverändert durch diese Umstellung).
 *
 * Pfeiltasten ↑/↓ bewegen eine Hervorhebung durch die aktuell gefilterte
 * Liste (kategorieübergreifend, in Anzeigereihenfolge), Enter übernimmt
 * den hervorgehobenen Treffer, Escape schließt — Rückmeldung 2026-09-09,
 * Muster PersonenAuswahl.
 */
export function InfoEmpfaengerAuswahl({
  abteilungen,
  gruppen,
  personen,
  ausgewaehlt: anfangsIds,
  feldnamen = STANDARD_FELDNAME,
}: {
  abteilungen: Person[]
  gruppen: Person[]
  personen: Person[]
  ausgewaehlt: { abteilungen: string[]; gruppen: string[]; personen: string[] }
  /** Überschreibt die drei Standard-Feldnamen — für eine zweite Empfänger-Auswahl auf derselben Seite (siehe FormularBaukasten). */
  feldnamen?: Record<EmpfaengerTyp, string>
}) {
  const id = useId()

  const alleEintraege = useMemo<EmpfaengerEintrag[]>(
    () => [
      ...abteilungen.map((a) => ({ ...a, typ: "abteilung" as const })),
      ...gruppen.map((g) => ({ ...g, typ: "gruppe" as const })),
      ...personen.map((p) => ({ ...p, typ: "person" as const })),
    ],
    [abteilungen, gruppen, personen],
  )

  // Lazy-Initializer statt useMemo — läuft garantiert nur einmal beim
  // ersten Rendern, genau wie `useState(ausgewaehlteIds)` in
  // PersonenAuswahl für den einfacheren Ein-Kategorie-Fall.
  const [ausgewaehlt, setAusgewaehlt] = useState<EmpfaengerEintrag[]>(() => {
    const ids = new Set([...anfangsIds.abteilungen, ...anfangsIds.gruppen, ...anfangsIds.personen])
    return alleEintraege.filter((e) => ids.has(e.id))
  })
  const [suchtext, setSuchtext] = useState("")
  const [geoeffnet, setGeoeffnet] = useState(false)
  const [hervorgehoben, setHervorgehoben] = useState(0)
  const listeRef = useRef<HTMLDivElement>(null)

  const ausgewaehlteIds = new Set(ausgewaehlt.map((e) => e.id))
  const gefiltert = alleEintraege.filter(
    (e) => !ausgewaehlteIds.has(e.id) && e.name.toLowerCase().includes(suchtext.toLowerCase()),
  )
  // In genau der Reihenfolge, in der die Kategorien unten gerendert werden
  // — Grundlage für die Pfeiltasten-Indizes, unabhängig von der
  // eigentlichen Gruppierung in der Anzeige.
  const gefiltertSortiert = REIHENFOLGE.flatMap((typ) => gefiltert.filter((e) => e.typ === typ))
  const hervorgehobenerIndex = Math.min(hervorgehoben, gefiltertSortiert.length - 1)

  useEffect(() => {
    if (!geoeffnet) return
    listeRef.current
      ?.querySelector(`[data-index="${hervorgehobenerIndex}"]`)
      ?.scrollIntoView({ block: "nearest" })
  }, [hervorgehobenerIndex, geoeffnet])

  function hinzufuegen(eintrag: EmpfaengerEintrag) {
    setAusgewaehlt((bisher) => [...bisher, eintrag])
    setSuchtext("")
    setHervorgehoben(0)
  }

  function entfernen(id: string) {
    setAusgewaehlt((bisher) => bisher.filter((e) => e.id !== id))
  }

  function beiTaste(ereignis: React.KeyboardEvent<HTMLInputElement>) {
    if (ereignis.key === "ArrowDown") {
      ereignis.preventDefault()
      setGeoeffnet(true)
      setHervorgehoben((i) => Math.min(i + 1, gefiltertSortiert.length - 1))
    } else if (ereignis.key === "ArrowUp") {
      ereignis.preventDefault()
      setHervorgehoben((i) => Math.max(i - 1, 0))
    } else if (ereignis.key === "Enter") {
      if (!geoeffnet || gefiltertSortiert.length === 0) return
      ereignis.preventDefault()
      hinzufuegen(gefiltertSortiert[hervorgehobenerIndex])
    } else if (ereignis.key === "Escape") {
      setGeoeffnet(false)
    }
  }

  return (
    <div className="relative">
      {ausgewaehlt.map((e) => (
        <input key={e.id} type="hidden" name={feldnamen[e.typ]} value={e.id} />
      ))}

      {ausgewaehlt.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {ausgewaehlt.map((e) => (
            <span
              key={e.id}
              className={"flex items-center gap-1 rounded-full py-1 pl-2.5 pr-1 text-xs " + CHIP_FARBE[e.typ]}
            >
              {e.name}
              <button
                type="button"
                aria-label={`${e.name} entfernen`}
                onClick={() => entfernen(e.id)}
                className="flex h-4 w-4 items-center justify-center rounded-full text-neutral-500 hover:bg-white/60"
              >
                ×
              </button>
            </span>
          ))}
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
        placeholder="Abteilung, Gruppe oder Person suchen …"
        className="h-9 w-full rounded-lg border border-neutral-300 px-2 text-sm"
      />

      {geoeffnet && (
        <div
          ref={listeRef}
          id={`${id}-liste`}
          role="listbox"
          className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-lg"
        >
          {gefiltert.length === 0 ? (
            <p className="px-3 py-2 text-sm text-neutral-400">Keine Treffer</p>
          ) : (
            REIHENFOLGE.map((typ) => {
              const eintraege = gefiltert.filter((e) => e.typ === typ)
              if (eintraege.length === 0) return null
              return (
                <div key={typ}>
                  <p className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-neutral-400 uppercase">
                    {KATEGORIE_LABEL[typ]}
                  </p>
                  {eintraege.map((e) => {
                    const index = gefiltertSortiert.indexOf(e)
                    return (
                      <button
                        key={e.id}
                        type="button"
                        data-index={index}
                        role="option"
                        aria-selected={index === hervorgehobenerIndex}
                        // Verhindert, dass der onBlur des Suchfelds das Dropdown
                        // schließt, BEVOR der Klick hier ankommt.
                        onMouseDown={(ereignis) => ereignis.preventDefault()}
                        onMouseEnter={() => setHervorgehoben(index)}
                        onClick={() => hinzufuegen(e)}
                        className={
                          "block w-full px-3 py-2 text-left text-sm text-neutral-700 " +
                          (index === hervorgehobenerIndex ? "bg-marke-gruen/10" : "hover:bg-neutral-50")
                        }
                      >
                        {e.name}
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
