"use client"

import { useId, useMemo, useState } from "react"

import type { Person } from "@/components/termin-form-felder"

type EmpfaengerTyp = "abteilung" | "gruppe" | "person"
type EmpfaengerEintrag = { id: string; name: string; typ: EmpfaengerTyp }

const FELDNAME: Record<EmpfaengerTyp, string> = {
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
 */
export function InfoEmpfaengerAuswahl({
  abteilungen,
  gruppen,
  personen,
  ausgewaehlt: anfangsIds,
}: {
  abteilungen: Person[]
  gruppen: Person[]
  personen: Person[]
  ausgewaehlt: { abteilungen: string[]; gruppen: string[]; personen: string[] }
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

  const ausgewaehlteIds = new Set(ausgewaehlt.map((e) => e.id))
  const gefiltert = alleEintraege.filter(
    (e) => !ausgewaehlteIds.has(e.id) && e.name.toLowerCase().includes(suchtext.toLowerCase()),
  )

  function hinzufuegen(eintrag: EmpfaengerEintrag) {
    setAusgewaehlt((bisher) => [...bisher, eintrag])
    setSuchtext("")
  }

  function entfernen(id: string) {
    setAusgewaehlt((bisher) => bisher.filter((e) => e.id !== id))
  }

  return (
    <div className="relative">
      {ausgewaehlt.map((e) => (
        <input key={e.id} type="hidden" name={FELDNAME[e.typ]} value={e.id} />
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
        value={suchtext}
        onChange={(ereignis) => {
          setSuchtext(ereignis.target.value)
          setGeoeffnet(true)
        }}
        onFocus={() => setGeoeffnet(true)}
        onBlur={() => window.setTimeout(() => setGeoeffnet(false), 150)}
        placeholder="Abteilung, Gruppe oder Person suchen …"
        className="h-9 w-full rounded-lg border border-neutral-300 px-2 text-sm"
      />

      {geoeffnet && (
        <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-lg">
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
                  {eintraege.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      // Verhindert, dass der onBlur des Suchfelds das Dropdown
                      // schließt, BEVOR der Klick hier ankommt.
                      onMouseDown={(ereignis) => ereignis.preventDefault()}
                      onClick={() => hinzufuegen(e)}
                      className="block w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                    >
                      {e.name}
                    </button>
                  ))}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
