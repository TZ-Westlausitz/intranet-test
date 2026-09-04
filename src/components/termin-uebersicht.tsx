"use client"

import { useState } from "react"

import { TerminListe, type TerminListenAktionen, type TerminListenEintrag } from "@/components/termin-liste"
import { TerminSucheFeld } from "@/components/termin-suche"
import { MAX_SUCHTREFFER } from "@/lib/termine/konstanten"

export type TerminUebersichtEintrag = TerminListenEintrag

type Filter = "heute" | "woche" | "monat"

const FILTER: { wert: Filter; label: string }[] = [
  { wert: "heute", label: "Heute" },
  { wert: "woche", label: "Diese Woche" },
  { wert: "monat", label: "Diesen Monat" },
]

/**
 * Liste der nächsten Termine unter den Feiertage/Schulferien-Einstellungen
 * — unabhängig vom gerade durchblätterten Monat: Grundlage ist immer das
 * echte "heute", nicht die drei gerade angezeigten Kalenderblätter (sonst
 * würde die Liste beim Vor-/Zurückblättern verschwinden). Immer sichtbar,
 * auch ohne Treffer — dann eben mit kurzem Hinweistext statt komplett zu
 * verschwinden, damit die Suchleiste im Kopf immer erreichbar bleibt.
 *
 * Die Suche lebt bewusst HIER in der Kopfzeile statt oben im
 * Kalender-Menü (das wirkte mit zu vielen Elementen überfüllt) — bei
 * aktiver Suche ersetzen die Treffer (`sucheErgebnis`) einfach die Liste
 * der nächsten Termine, die Zeitraum-Chips (Heute/Woche/Monat) weichen
 * dann einem "Suche zurücksetzen"-Link, weil sie auf Suchtreffer ohnehin
 * nicht anwendbar sind (die können auch in der Vergangenheit liegen).
 *
 * Die eigentliche Zeilendarstellung steckt in TerminListe — geteilt mit
 * den Suchergebnissen, nur Überschrift und Zeitraum-Filter sind hier
 * speziell.
 */
export function TerminUebersicht({
  eintraege,
  heuteEndeIso,
  wocheEndeIso,
  suchtext,
  sucheErgebnis,
  ...aktionen
}: {
  eintraege: TerminUebersichtEintrag[]
  heuteEndeIso: string
  wocheEndeIso: string
  suchtext: string
  sucheErgebnis: TerminListenEintrag[]
} & TerminListenAktionen) {
  const [filter, setFilter] = useState<Filter>("monat")

  const sucheAktiv = suchtext.length > 0

  const grenze = filter === "heute" ? heuteEndeIso : filter === "woche" ? wocheEndeIso : null
  const gefiltert = grenze ? eintraege.filter((e) => e.beginnIso <= grenze) : eintraege

  return (
    <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-marke-grau">
          {sucheAktiv ? (
            <>
              Suchergebnisse für „{suchtext}“ ({sucheErgebnis.length}
              {sucheErgebnis.length === MAX_SUCHTREFFER ? "+" : ""})
            </>
          ) : (
            "Nächste Termine"
          )}
        </h2>

        <div className="flex flex-wrap items-center gap-3">
          {sucheAktiv ? (
            <a href="/kalender" className="text-xs font-medium text-neutral-500 hover:text-neutral-700">
              Suche zurücksetzen
            </a>
          ) : (
            <div className="flex gap-1 rounded-lg bg-neutral-100 p-1">
              {FILTER.map((f) => (
                <button
                  key={f.wert}
                  type="button"
                  onClick={() => setFilter(f.wert)}
                  className={
                    "rounded-md px-2.5 py-1 text-xs font-medium transition " +
                    (filter === f.wert
                      ? "bg-white text-marke-grau shadow-sm"
                      : "text-neutral-500 hover:text-neutral-700")
                  }
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          <TerminSucheFeld suchtext={suchtext} />
        </div>
      </div>

      {sucheAktiv && sucheErgebnis.length === MAX_SUCHTREFFER && (
        <p className="mt-1 text-xs text-neutral-400">
          Zeigt die {MAX_SUCHTREFFER} neuesten Treffer — es gibt möglicherweise weitere. Suchbegriff genauer fassen,
          um einzugrenzen.
        </p>
      )}

      <TerminListe
        eintraege={sucheAktiv ? sucheErgebnis : gefiltert}
        leerText={sucheAktiv ? "Keine Termine gefunden." : "Keine Termine in diesem Zeitraum."}
        aktionen={aktionen}
      />
    </div>
  )
}
