"use client"

import { useId, useRef, useState } from "react"

import { TERMIN_FARBEN, TERMIN_ERINNERUNGEN } from "@/lib/termin-optionen"
import { PersonenAuswahl } from "@/components/personen-auswahl"
import { RichTextEditor } from "@/components/rich-text-editor"
import { wiederholenOptionen } from "@/lib/termine/wiederholung"

export type Person = { id: string; name: string }

export type AnhangAnzeige = { id: string; dateiname: string; groesseBytes: number; mimetyp: string }

export type TerminStandardwerte = {
  titel: string
  ganztaegig: boolean
  datum: string
  von: string
  bis: string
  vonDatum: string
  bisDatum: string
  beschreibung: string
  ort: string
  farbe: string
  teilnehmerIds: string[]
  erinnerungenMinuten: number[]
  kommentareErlaubt: boolean
}

// von/bis sind hier nur ein statischer Rückfallwert (z. B. falls das
// Anlegen-Pop-Up mal ohne die client-seitig berechnete "nächste volle
// Stunde" eingebunden würde, siehe TerminDialog) — deshalb schon im
// Zielrhythmus von 30 Minuten gehalten statt einer beliebigen Uhrzeit.
export const LEERE_TERMIN_STANDARDWERTE: TerminStandardwerte = {
  titel: "",
  ganztaegig: false,
  datum: "",
  von: "09:00",
  bis: "09:30",
  vonDatum: "",
  bisDatum: "",
  beschreibung: "",
  ort: "",
  farbe: "DUNKELGRUEN",
  teilnehmerIds: [],
  erinnerungenMinuten: [],
  kommentareErlaubt: true,
}

function dateigroesseAnzeige(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Die eigentlichen Formularfelder für einen Termin — geteilt zwischen dem
 * Anlegen-Pop-Up (TerminDialog) und dem Bearbeiten-Pop-Up (in
 * TerminBearbeitenDialog), damit die ca. 150 Zeilen Feld-Markup nicht
 * zweimal gepflegt werden müssen. `useId()` statt fester `id`-Attribute,
 * weil auf einer Kalenderseite mehrere Bearbeiten-Formulare gleichzeitig
 * im DOM stehen können (eins pro eigenem Termin) — feste IDs wären dann
 * nicht mehr eindeutig.
 *
 * Reihenfolge der Felder ist bewusst so (Wunsch aus der Praxis): Titel,
 * Datum/Zeit, Ganztägig-Umschalter, Ort, Wiederholung, Farbe, Teilnehmer,
 * Notizen, Anhänge, Erinnerung, Kommentare-Umschalter.
 *
 * "Ganztägig" schaltet zwischen zwei Feldgruppen um: normal ein Datum +
 * Uhrzeiten (ein Tag), ganztägig zwei Datumsfelder ohne Uhrzeit (ein oder
 * mehrere Tage — Von-Datum = Bis-Datum ist einfach ein einzelner
 * ganztägiger Tag, kein Sonderfall).
 *
 * `wiederholenAnzeigen`: die "Wiederholen"-Felder gibt es nur beim
 * Anlegen (TerminDialog setzt das Flag), nicht beim Bearbeiten — dort
 * wirkt eine Änderung ohnehin nur auf diesen einen Termin der Serie,
 * eine Wiederholungsregel ergibt an der Stelle keinen Sinn mehr.
 *
 * `bestehendeAnhaenge` gibt es nur beim Bearbeiten (beim Anlegen kann es
 * noch keine geben) — jeweils mit einer "entfernen"-Checkbox, die die
 * Server Action als `anhaengeLoeschen` einsammelt.
 */
export function TerminFormFelder({
  personen,
  standardwerte,
  bestehendeAnhaenge = [],
  terminId,
  wiederholenAnzeigen = false,
}: {
  personen: Person[]
  standardwerte: TerminStandardwerte
  bestehendeAnhaenge?: AnhangAnzeige[]
  terminId?: string
  wiederholenAnzeigen?: boolean
}) {
  const id = useId()
  const bisRef = useRef<HTMLInputElement>(null)
  const bisDatumRef = useRef<HTMLInputElement>(null)
  const [ganztaegig, setGanztaegig] = useState(standardwerte.ganztaegig)
  const [wiederholen, setWiederholen] = useState("nein")
  const [wiederholenUnbefristet, setWiederholenUnbefristet] = useState(false)
  // Nur für die Labels in der Wiederholen-Auswahl ("Wöchentlich am
  // Dienstag" statt nur "Wöchentlich") — die eigentliche Berechnung der
  // Serie läuft serverseitig immer über das tatsächlich übermittelte
  // Startdatum, unabhängig davon, ob dieser Wert hier ganz aktuell ist.
  const [aktuellesDatum, setAktuellesDatum] = useState(standardwerte.datum || standardwerte.vonDatum)

  // Endzeit folgt der Startzeit (+30 Min.), bleibt danach aber ein
  // normales Feld — wer eine andere Dauer braucht, überschreibt es
  // einfach wieder. Verhindert nebenbei, dass die Endzeit nach einer
  // händischen Änderung der Startzeit vor dieser (bzw. in der
  // Vergangenheit) stehen bleibt.
  function beiVonAendern(ereignis: React.ChangeEvent<HTMLInputElement>) {
    const [stundenText, minutenText] = ereignis.target.value.split(":")
    const stunden = Number(stundenText)
    const minuten = Number(minutenText)
    if (Number.isNaN(stunden) || Number.isNaN(minuten) || !bisRef.current) return

    const gesamtMinuten = (stunden * 60 + minuten + 30) % (24 * 60)
    const neueStunden = Math.floor(gesamtMinuten / 60)
    const neueMinuten = gesamtMinuten % 60
    bisRef.current.value = `${String(neueStunden).padStart(2, "0")}:${String(neueMinuten).padStart(2, "0")}`
  }

  // "Bis" springt beim Ganztägig-Zeitraum NUR dann auf das neue
  // "Von"-Datum, wenn es sonst DAVOR läge (sonst wäre der Zeitraum
  // ungültig) — ein bereits eingestellter mehrtägiger Zeitraum bleibt
  // erhalten, wenn nur der Starttag nachjustiert wird. String-Vergleich
  // reicht, weil beide Felder im ISO-Format (YYYY-MM-DD) sind.
  //
  // `aktuellesDatum` (unten als `min` auf das "Bis"-Feld gesetzt) sorgt
  // zusätzlich dafür, dass sich danach auch von Hand kein früheres
  // Enddatum mehr auswählen lässt — der Sprung oben fängt nur den
  // Moment der Datumsänderung selbst ab, nicht eine spätere manuelle
  // Eingabe im "Bis"-Feld.
  function beiVonDatumAendern(ereignis: React.ChangeEvent<HTMLInputElement>) {
    const neuesVon = ereignis.target.value
    if (bisDatumRef.current && bisDatumRef.current.value < neuesVon) {
      bisDatumRef.current.value = neuesVon
    }
    setAktuellesDatum(neuesVon)
  }

  return (
    <>
      <div>
        <label htmlFor={`${id}-titel`} className="block text-xs font-medium text-neutral-600">
          Titel
        </label>
        <input
          id={`${id}-titel`}
          name="titel"
          type="text"
          required
          defaultValue={standardwerte.titel}
          className="mt-1 h-9 w-full rounded-lg border border-neutral-300 px-2 text-sm"
        />
      </div>

      {/* `key` auf beiden Zweigen erzwingt beim Umschalten von Ganztägig
          einen echten Neuaufbau dieser Felder statt eines von React
          gepatchten Wiederverwendens derselben DOM-Knoten — sonst behält
          z. B. das "Bis"-Feld beim Wechsel von Uhrzeit- auf Datumsfeld
          (type="time" → type="date" auf demselben Input-Element) seinen
          leeren Anzeigezustand, obwohl der defaultValue korrekt gesetzt
          wurde (ein Browser-Eigenheit bei Typwechsel auf demselben Knoten). */}
      {ganztaegig ? (
        <div key="ganztaegig" className="flex flex-wrap gap-3">
          <div>
            <label htmlFor={`${id}-vonDatum`} className="block text-xs font-medium text-neutral-600">
              Von
            </label>
            <input
              id={`${id}-vonDatum`}
              name="vonDatum"
              type="date"
              required
              defaultValue={standardwerte.vonDatum || standardwerte.datum}
              onChange={beiVonDatumAendern}
              className="mt-1 h-9 rounded-lg border border-neutral-300 px-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor={`${id}-bisDatum`} className="block text-xs font-medium text-neutral-600">
              Bis
            </label>
            <input
              id={`${id}-bisDatum`}
              name="bisDatum"
              type="date"
              required
              min={aktuellesDatum}
              defaultValue={standardwerte.bisDatum || standardwerte.datum}
              ref={bisDatumRef}
              className="mt-1 h-9 rounded-lg border border-neutral-300 px-2 text-sm"
            />
          </div>
        </div>
      ) : (
        <div key="zeitraum" className="flex flex-wrap gap-3">
          <div>
            <label htmlFor={`${id}-datum`} className="block text-xs font-medium text-neutral-600">
              Datum
            </label>
            <input
              id={`${id}-datum`}
              name="datum"
              type="date"
              required
              defaultValue={standardwerte.datum}
              onChange={(ereignis) => setAktuellesDatum(ereignis.target.value)}
              className="mt-1 h-9 rounded-lg border border-neutral-300 px-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor={`${id}-von`} className="block text-xs font-medium text-neutral-600">
              Von
            </label>
            <input
              id={`${id}-von`}
              name="von"
              type="time"
              required
              defaultValue={standardwerte.von}
              onChange={beiVonAendern}
              className="mt-1 h-9 rounded-lg border border-neutral-300 px-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor={`${id}-bis`} className="block text-xs font-medium text-neutral-600">
              Bis
            </label>
            <input
              id={`${id}-bis`}
              name="bis"
              type="time"
              required
              defaultValue={standardwerte.bis}
              ref={bisRef}
              className="mt-1 h-9 rounded-lg border border-neutral-300 px-2 text-sm"
            />
          </div>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input
          type="checkbox"
          name="ganztaegig"
          checked={ganztaegig}
          onChange={(ereignis) => setGanztaegig(ereignis.target.checked)}
          className="h-4 w-4 rounded border-neutral-300 text-marke-gruen focus:ring-marke-gruen"
        />
        Ganztägig (auch mehrtägig, z. B. Urlaub oder Dienstreise)
      </label>

      <div>
        <label htmlFor={`${id}-ort`} className="block text-xs font-medium text-neutral-600">
          Ort
        </label>
        <input
          id={`${id}-ort`}
          name="ort"
          type="text"
          defaultValue={standardwerte.ort}
          className="mt-1 h-9 w-full rounded-lg border border-neutral-300 px-2 text-sm"
        />
      </div>

      {wiederholenAnzeigen && (
        <fieldset>
          <legend className="text-xs font-medium text-neutral-600">Wiederholen</legend>
          <div className="mt-1.5 flex flex-wrap items-end gap-3">
            <select
              name="wiederholen"
              value={wiederholen}
              onChange={(ereignis) => setWiederholen(ereignis.target.value)}
              className="h-9 rounded-lg border border-neutral-300 px-2 text-sm"
            >
              {wiederholenOptionen(aktuellesDatum).map((option) => (
                <option key={option.wert} value={option.wert}>
                  {option.label}
                </option>
              ))}
            </select>

            {wiederholen === "benutzerdefiniert" && (
              <div className="flex items-end gap-2">
                <div>
                  <label htmlFor={`${id}-wiederholenIntervall`} className="block text-xs font-medium text-neutral-600">
                    Alle
                  </label>
                  <input
                    id={`${id}-wiederholenIntervall`}
                    name="wiederholenIntervall"
                    type="number"
                    min={1}
                    max={365}
                    defaultValue={1}
                    className="mt-1 h-9 w-16 rounded-lg border border-neutral-300 px-2 text-sm"
                  />
                </div>
                <select
                  name="wiederholenEinheit"
                  defaultValue="woche"
                  className="h-9 rounded-lg border border-neutral-300 px-2 text-sm"
                >
                  <option value="tag">Tag(e)</option>
                  <option value="woche">Woche(n)</option>
                  <option value="monat">Monat(e)</option>
                  <option value="jahr">Jahr(e)</option>
                </select>
              </div>
            )}
          </div>

          {wiederholen !== "nein" && (
            <div className="mt-3 flex flex-wrap items-end gap-3">
              {!wiederholenUnbefristet && (
                <div>
                  <label htmlFor={`${id}-wiederholenBis`} className="block text-xs font-medium text-neutral-600">
                    Bis wann
                  </label>
                  <input
                    id={`${id}-wiederholenBis`}
                    name="wiederholenBis"
                    type="date"
                    required={!wiederholenUnbefristet}
                    defaultValue={standardwerte.datum}
                    className="mt-1 h-9 rounded-lg border border-neutral-300 px-2 text-sm"
                  />
                </div>
              )}

              <label className="flex items-center gap-2 pb-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  name="wiederholenUnbefristet"
                  checked={wiederholenUnbefristet}
                  onChange={(ereignis) => setWiederholenUnbefristet(ereignis.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300 text-marke-gruen focus:ring-marke-gruen"
                />
                Unbefristet (bis zu 200 Termine)
              </label>
            </div>
          )}
        </fieldset>
      )}

      <fieldset>
        <legend className="text-xs font-medium text-neutral-600">Farbe</legend>
        <div className="mt-1.5 flex gap-2">
          {TERMIN_FARBEN.map((farbe) => (
            <label key={farbe.wert} className="cursor-pointer" title={farbe.name}>
              <input
                type="radio"
                name="farbe"
                value={farbe.wert}
                defaultChecked={farbe.wert === standardwerte.farbe}
                className="peer sr-only"
              />
              <span
                className={
                  "block h-7 w-7 rounded-full ring-offset-2 peer-checked:ring-2 peer-checked:ring-marke-grau peer-focus-visible:ring-2 " +
                  farbe.klasse
                }
              />
            </label>
          ))}
        </div>
      </fieldset>

      {personen.length > 0 && (
        <div>
          <label htmlFor={`${id}-teilnehmer-suche`} className="block text-xs font-medium text-neutral-600">
            Mitarbeiter einladen
          </label>
          <div className="mt-1.5">
            <PersonenAuswahl personen={personen} ausgewaehlteIds={standardwerte.teilnehmerIds} id={`${id}-teilnehmer`} />
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-neutral-600">Notizen</label>
        <div className="mt-1">
          <RichTextEditor name="beschreibung" defaultValue={standardwerte.beschreibung} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-neutral-600">Anhänge (Dokumente/Fotos)</label>

        {bestehendeAnhaenge.length > 0 && (
          <ul className="mt-1.5 flex flex-col gap-1">
            {bestehendeAnhaenge.map((anhang) => (
              <li key={anhang.id} className="flex items-center gap-2 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-sm">
                <a
                  href={`/api/termine/${terminId}/anhaenge/${anhang.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-0 flex-1 items-center gap-2"
                >
                  {anhang.mimetyp.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element -- interne Datei aus der Ablage, kein optimierbares Next-Image-Ziel
                    <img
                      src={`/api/termine/${terminId}/anhaenge/${anhang.id}`}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-neutral-100 text-neutral-400">
                      📄
                    </span>
                  )}
                  <span className="truncate text-marke-gruen-dunkel hover:underline">{anhang.dateiname}</span>
                </a>
                <label className="flex shrink-0 items-center gap-1.5 text-xs text-neutral-500">
                  <input
                    type="checkbox"
                    name="anhaengeLoeschen"
                    value={anhang.id}
                    className="h-4 w-4 rounded border-neutral-300 text-red-600 focus:ring-red-600"
                  />
                  entfernen
                </label>
                <span className="shrink-0 text-xs text-neutral-400">{dateigroesseAnzeige(anhang.groesseBytes)}</span>
              </li>
            ))}
          </ul>
        )}

        <input
          type="file"
          name="anhaenge"
          multiple
          accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
          className="mt-1.5 w-full text-sm text-neutral-600 file:mr-3 file:h-8 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:text-sm file:font-medium file:text-neutral-700 hover:file:bg-neutral-200"
        />
      </div>

      <fieldset>
        <legend className="text-xs font-medium text-neutral-600">Erinnerung</legend>
        <div className="mt-1.5 flex flex-col gap-1">
          {TERMIN_ERINNERUNGEN.map((erinnerung) => (
            <label key={erinnerung.minuten} className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                name="erinnerung"
                value={erinnerung.minuten}
                defaultChecked={standardwerte.erinnerungenMinuten.includes(erinnerung.minuten)}
                className="h-4 w-4 rounded border-neutral-300 text-marke-gruen focus:ring-marke-gruen"
              />
              {erinnerung.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input
          type="checkbox"
          name="kommentareErlaubt"
          defaultChecked={standardwerte.kommentareErlaubt}
          className="h-4 w-4 rounded border-neutral-300 text-marke-gruen focus:ring-marke-gruen"
        />
        Rückfragen (Kommentare) der Teilnehmenden erlauben
      </label>
    </>
  )
}
