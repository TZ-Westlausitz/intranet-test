"use client"

import { useMemo, useState } from "react"
import Link from "next/link"

import { FristAnzeige } from "@/components/fuhrpark/frist-anzeige"
import { reifenHinweis, REIFENART_TEXT, type FristStufe } from "@/lib/fuhrpark/fristen"
import type { fuhrparkFahrzeuge } from "@/lib/fuhrpark/abfragen"

// Laufzeit-Import aus @/lib/fuhrpark/abfragen vermeiden (zieht dessen
// Prisma-Import in den Browser-Bundle, diese Datei ist eine Client
// Component) — nur der Typ wird gebraucht, der ist zur Laufzeit weg.
// Analog zu KontakteListe/BenutzerListe.
type Fahrzeug = Awaited<ReturnType<typeof fuhrparkFahrzeuge>>[number] & { stufe: FristStufe }

const FRIST_FILTER_OPTIONEN: { wert: FristStufe | ""; label: string }[] = [
  { wert: "", label: "Alle Fristen" },
  { wert: "ueberfaellig", label: "Überfällig" },
  { wert: "bald", label: "Bald fällig" },
  { wert: "ok", label: "In Ordnung" },
]

const REIFEN_FILTER_OPTIONEN: { wert: string; label: string }[] = [
  { wert: "", label: "Alle Reifen" },
  { wert: "SOMMER", label: "Sommerreifen" },
  { wert: "WINTER", label: "Winterreifen" },
  { wert: "GANZJAHR", label: "Ganzjahresreifen" },
]

const SELECT = "h-9 rounded-lg border border-flaeche-300 bg-flaeche px-2 text-sm sm:w-44"

/**
 * Filterleiste + Liste für den Fuhrpark (Rückmeldung 2026-09-29) — rein
 * clientseitig wie KontakteListe/BenutzerListe: die Fahrzeugliste ist
 * ohnehin komplett geladen (kein Fuhrpark mit tausenden Fahrzeugen), Tippen/
 * Auswählen soll sofort wirken statt bei jeder Eingabe neu zu laden.
 *
 * Die Suche deckt genau die vier Felder ab, die in einer Zeile stehen:
 * Kennzeichen, Bezeichnung, Halter, Standort (Ort) — kombinierbar mit den
 * drei Auswahlfiltern (UND-Verknüpfung).
 */
export function FuhrparkListe({ fahrzeuge, orte, heute }: { fahrzeuge: Fahrzeug[]; orte: { id: string; name: string }[]; heute: Date }) {
  const [suchtext, setSuchtext] = useState("")
  const [ortFilter, setOrtFilter] = useState("")
  const [fristFilter, setFristFilter] = useState<FristStufe | "">("")
  const [reifenFilter, setReifenFilter] = useState("")

  const gefiltert = useMemo(() => {
    const text = suchtext.trim().toLowerCase()
    return fahrzeuge.filter((f) => {
      if (text) {
        const haystack = [f.bezeichnung, f.kennzeichen, f.halter ? `${f.halter.vorname} ${f.halter.nachname}` : "", f.ort?.name ?? ""]
          .join(" ")
          .toLowerCase()
        if (!haystack.includes(text)) return false
      }
      if (ortFilter && f.ort?.id !== ortFilter) return false
      if (fristFilter && f.stufe !== fristFilter) return false
      if (reifenFilter && f.reifenart !== reifenFilter) return false
      return true
    })
  }, [fahrzeuge, suchtext, ortFilter, fristFilter, reifenFilter])

  const filterAktiv = suchtext.trim() !== "" || ortFilter !== "" || fristFilter !== "" || reifenFilter !== ""

  return (
    <>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <input
          type="text"
          value={suchtext}
          onChange={(ereignis) => setSuchtext(ereignis.target.value)}
          placeholder="Kennzeichen, Bezeichnung, Halter oder Ort suchen …"
          className="h-9 flex-1 rounded-lg border border-flaeche-300 bg-flaeche px-2 text-sm sm:min-w-56"
        />
        <select value={ortFilter} onChange={(ereignis) => setOrtFilter(ereignis.target.value)} className={SELECT}>
          <option value="">Alle Standorte</option>
          {orte.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <select
          value={fristFilter}
          onChange={(ereignis) => setFristFilter(ereignis.target.value as FristStufe | "")}
          className={SELECT}
        >
          {FRIST_FILTER_OPTIONEN.map((o) => (
            <option key={o.wert} value={o.wert}>
              {o.label}
            </option>
          ))}
        </select>
        <select value={reifenFilter} onChange={(ereignis) => setReifenFilter(ereignis.target.value)} className={SELECT}>
          {REIFEN_FILTER_OPTIONEN.map((o) => (
            <option key={o.wert} value={o.wert}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {filterAktiv && (
        <p className="mt-2 text-xs text-tertiaer">
          {gefiltert.length} von {fahrzeuge.length} Fahrzeugen
        </p>
      )}

      {gefiltert.length === 0 ? (
        <p className="mt-6 text-sm text-sekundaer">Keine Treffer.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {gefiltert.map((f) => {
            const hinweis = reifenHinweis(f.reifenart, heute)
            return (
              <li key={f.id}>
                <Link
                  href={`/fuhrpark/${f.id}`}
                  className={
                    "block rounded-xl border bg-flaeche p-4 transition hover:border-marke-gruen focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen " +
                    (f.stufe === "ueberfaellig" ? "border-red-500/60" : f.stufe === "bald" ? "border-marke-orange" : "border-rand")
                  }
                >
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-semibold text-ueberschrift">{f.bezeichnung}</span>
                    <span className="text-sm text-sekundaer">{f.kennzeichen}</span>
                    {f.fuerPrivatausleiheFreigegeben && (
                      <span className="rounded-full bg-marke-gruen/15 px-2 py-0.5 text-[11px] font-medium text-marke-gruen-dunkel">
                        Mietpark
                      </span>
                    )}
                    {f._count.schaeden > 0 && (
                      <span className="rounded-full bg-marke-orange/20 px-2 py-0.5 text-[11px] font-medium text-ueberschrift">
                        {f._count.schaeden === 1 ? "1 offener Schaden" : `${f._count.schaeden} offene Schäden`}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-sekundaer">
                    {f.ort ? f.ort.name : "Kein fester Standort"}
                    {" · "}
                    {f.halter ? `${f.halter.vorname} ${f.halter.nachname}` : "kein fester Halter"}
                    {f.zuordnungHinweis ? ` · ${f.zuordnungHinweis}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <FristAnzeige label="TÜV" faelligAm={f.huFaelligAm} heute={heute} />
                    <FristAnzeige label="Service" faelligAm={f.serviceFaelligAm} heute={heute} />
                    {f.reifenart && (
                      <span className="inline-flex items-center rounded-full bg-flaeche-100 px-2.5 py-1 text-xs font-medium text-primaer">
                        {REIFENART_TEXT[f.reifenart]}
                      </span>
                    )}
                  </div>
                  {hinweis && <p className="mt-2 text-xs text-sekundaer">{hinweis}</p>}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
