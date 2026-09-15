"use client"

import { useRef, useState } from "react"

import { PersonenAuswahl } from "@/components/personen-auswahl"
import { AUFGABE_PRIORITAET_KLASSEN, AUFGABE_PRIORITAETEN } from "@/lib/aufgaben-optionen"
import { AUFGABE_STATUS_KLASSEN, AUFGABE_STATUS_NAMEN } from "@/lib/projekte-optionen"

export type ProjektAufgabeAnzeige = {
  id: string
  titel: string
  prioritaet: string
  faelligAm: Date | null
  status: string | null
  zwischenzielId: string | null
  erstelltVonId: string | null
  zugewiesenAnId: string | null
  erstelltVon: { vorname: string; nachname: string } | null
  zugewiesenAn: { vorname: string; nachname: string } | null
  anhaenge: { id: string; dateiname: string }[]
}

function AufgabeZeile({
  projektId,
  aufgabe,
  eigenePersonId,
  istLeitung,
  schreibgeschuetzt,
  annehmenAktion,
  kenntnisnahmeAktion,
  inArbeitAktion,
  statusSetzenAktion,
  loeschenAktion,
}: {
  projektId: string
  aufgabe: ProjektAufgabeAnzeige
  eigenePersonId: string
  istLeitung: boolean
  schreibgeschuetzt: boolean
  annehmenAktion: (projektId: string, aufgabeId: string) => void
  kenntnisnahmeAktion: (projektId: string, aufgabeId: string) => void
  inArbeitAktion: (projektId: string, aufgabeId: string) => void
  statusSetzenAktion: (projektId: string, aufgabeId: string, erledigt: boolean) => void
  loeschenAktion: (projektId: string, aufgabeId: string) => void
}) {
  const istZugewiesen = aufgabe.zugewiesenAnId === eigenePersonId
  const darfStatusAendern = !schreibgeschuetzt && (istZugewiesen || istLeitung)
  const darfLoeschen = !schreibgeschuetzt && (aufgabe.erstelltVonId === eigenePersonId || istLeitung)

  return (
    <li className="flex items-start justify-between gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={"h-2 w-2 shrink-0 rounded-full " + AUFGABE_PRIORITAET_KLASSEN[aufgabe.prioritaet]} />
          <span className={"text-sm text-primaer " + (aufgabe.status === "ERLEDIGT" ? "text-tertiaer line-through" : "")}>
            {aufgabe.titel}
          </span>
          <span
            className={
              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium " + AUFGABE_STATUS_KLASSEN[aufgabe.status ?? "OFFEN"]
            }
          >
            {AUFGABE_STATUS_NAMEN[aufgabe.status ?? "OFFEN"]}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-tertiaer">
          {aufgabe.zugewiesenAn ? `${aufgabe.zugewiesenAn.vorname} ${aufgabe.zugewiesenAn.nachname}` : "niemand übernommen"}
          {aufgabe.faelligAm &&
            ` · fällig ${aufgabe.faelligAm.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}`}
        </p>
        {aufgabe.anhaenge.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {aufgabe.anhaenge.map((anhang) => (
              <a
                key={anhang.id}
                href={`/api/aufgaben/${aufgabe.id}/anhaenge/${anhang.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex max-w-[10rem] items-center gap-1 truncate rounded-full bg-flaeche-100 px-2 py-0.5 text-xs text-primaer hover:underline"
              >
                📎 {anhang.dateiname}
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {!schreibgeschuetzt && aufgabe.status === "OFFEN" && aufgabe.zugewiesenAnId === null && (
          <form action={annehmenAktion.bind(null, projektId, aufgabe.id)}>
            <button
              type="submit"
              className="h-7 rounded-lg bg-flaeche-100 px-2.5 text-xs font-medium text-primaer transition hover:bg-flaeche-200"
            >
              Übernehmen
            </button>
          </form>
        )}

        {!schreibgeschuetzt && aufgabe.status === "OFFEN" && istZugewiesen && (
          <form action={kenntnisnahmeAktion.bind(null, projektId, aufgabe.id)}>
            <button
              type="submit"
              className="h-7 rounded-lg bg-marke-orange/15 px-2.5 text-xs font-medium text-ueberschrift transition hover:bg-marke-orange/25"
            >
              Annehmen
            </button>
          </form>
        )}

        {darfStatusAendern && aufgabe.status === "ANGENOMMEN" && (
          <form action={inArbeitAktion.bind(null, projektId, aufgabe.id)}>
            <button
              type="submit"
              className="h-7 rounded-lg bg-blue-100 px-2.5 text-xs font-medium text-blue-700 transition hover:bg-blue-200"
            >
              Arbeit beginnen
            </button>
          </form>
        )}

        {darfStatusAendern && aufgabe.status === "IN_ARBEIT" && (
          <form action={statusSetzenAktion.bind(null, projektId, aufgabe.id, true)}>
            <button
              type="submit"
              className="h-7 rounded-lg bg-marke-gruen/15 px-2.5 text-xs font-medium text-marke-gruen-dunkel transition hover:bg-marke-gruen/25"
            >
              Erledigt
            </button>
          </form>
        )}

        {darfStatusAendern && aufgabe.status === "ERLEDIGT" && (
          <form action={statusSetzenAktion.bind(null, projektId, aufgabe.id, false)}>
            <button
              type="submit"
              className="h-7 rounded-lg bg-flaeche-100 px-2.5 text-xs font-medium text-primaer transition hover:bg-flaeche-200"
            >
              Wieder öffnen
            </button>
          </form>
        )}

        {darfLoeschen && (
          <form action={loeschenAktion.bind(null, projektId, aufgabe.id)}>
            <button
              type="submit"
              aria-label="Aufgabe löschen"
              className="rounded p-1 text-tertiaer transition hover:bg-red-50 hover:text-red-600"
            >
              ×
            </button>
          </form>
        )}
      </div>
    </li>
  )
}

/**
 * Aufgaben eines Projekts, gruppiert nach Zwischenziel (Vorgabe aus dem
 * Auftrag) — plus eine Gruppe "Ohne Zwischenziel" für alles ohne Zuordnung.
 * Anlegen-Formular am Ende, mit optionaler Zuweisung an ein aktives
 * Mitglied (PersonenAuswahl, mehrfach=false).
 */
export function ProjektAufgaben({
  projektId,
  aufgaben,
  zwischenziele,
  mitgliederKandidaten,
  eigenePersonId,
  istLeitung,
  schreibgeschuetzt,
  erstellenAktion,
  annehmenAktion,
  kenntnisnahmeAktion,
  inArbeitAktion,
  statusSetzenAktion,
  loeschenAktion,
}: {
  projektId: string
  aufgaben: ProjektAufgabeAnzeige[]
  zwischenziele: { id: string; titel: string; fristIso: string }[]
  mitgliederKandidaten: { id: string; name: string }[]
  eigenePersonId: string
  istLeitung: boolean
  schreibgeschuetzt: boolean
  erstellenAktion: (projektId: string, formData: FormData) => void
  annehmenAktion: (projektId: string, aufgabeId: string) => void
  kenntnisnahmeAktion: (projektId: string, aufgabeId: string) => void
  inArbeitAktion: (projektId: string, aufgabeId: string) => void
  statusSetzenAktion: (projektId: string, aufgabeId: string, erledigt: boolean) => void
  loeschenAktion: (projektId: string, aufgabeId: string) => void
}) {
  const gruppen: { id: string | null; titel: string; aufgaben: ProjektAufgabeAnzeige[] }[] = [
    ...zwischenziele.map((m) => ({ id: m.id, titel: m.titel, aufgaben: aufgaben.filter((a) => a.zwischenzielId === m.id) })),
    { id: null, titel: "Ohne Zwischenziel", aufgaben: aufgaben.filter((a) => a.zwischenzielId === null) },
  ].filter((gruppe) => gruppe.aufgaben.length > 0)

  const faelligRef = useRef<HTMLInputElement>(null)

  // Erzwingt nach dem Absenden ein Neu-Mounten des gesamten Anlegen-
  // Formulars (key wechselt) — ein einfaches form.reset() würde die
  // native Auswahl (Zwischenziel, Fälligkeit, Priorität, Datei) zwar
  // zurücksetzen, aber NICHT den internen React-Zustand der PersonenAuswahl
  // (die ausgewählte Zuweisung bliebe als Chip stehen). setTimeout(…, 0)
  // verzögert das, bis das Absenden selbst durchgereicht ist — dasselbe
  // Muster wie beim Zurücksetzen des Nachrichtenfelds in ProjektThread.
  const [formVersion, setFormVersion] = useState(0)
  function beiErstellenAbsenden() {
    window.setTimeout(() => setFormVersion((v) => v + 1), 0)
  }

  // Übernimmt beim Auswählen eines Zwischenziels dessen Frist als Vorschlag
  // für "Fällig am" — spart bei Aufgaben, die ohnehin bis zum Zwischenziel
  // fertig sein sollen, das erneute Eintippen desselben Datums. Bleibt
  // danach ein normales Feld: wer eine andere Fälligkeit braucht,
  // überschreibt es einfach wieder (kein erzwungener Wert).
  function beiZwischenzielAendern(ereignis: React.ChangeEvent<HTMLSelectElement>) {
    const zwischenziel = zwischenziele.find((m) => m.id === ereignis.target.value)
    if (zwischenziel && faelligRef.current) {
      faelligRef.current.value = zwischenziel.fristIso
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {gruppen.length === 0 ? (
        <p className="text-sm text-sekundaer">Noch keine Aufgaben.</p>
      ) : (
        gruppen.map((gruppe) => (
          <div key={gruppe.id ?? "ohne"}>
            <h3 className="text-xs font-semibold text-sekundaer">{gruppe.titel}</h3>
            <ul className="mt-1 flex flex-col divide-y divide-flaeche-100">
              {gruppe.aufgaben.map((aufgabe) => (
                <AufgabeZeile
                  key={aufgabe.id}
                  projektId={projektId}
                  aufgabe={aufgabe}
                  eigenePersonId={eigenePersonId}
                  istLeitung={istLeitung}
                  schreibgeschuetzt={schreibgeschuetzt}
                  annehmenAktion={annehmenAktion}
                  kenntnisnahmeAktion={kenntnisnahmeAktion}
                  inArbeitAktion={inArbeitAktion}
                  statusSetzenAktion={statusSetzenAktion}
                  loeschenAktion={loeschenAktion}
                />
              ))}
            </ul>
          </div>
        ))
      )}

      {!schreibgeschuetzt && (
        <form
          key={formVersion}
          action={erstellenAktion.bind(null, projektId)}
          onSubmit={beiErstellenAbsenden}
          className="flex flex-col gap-3 border-t border-flaeche-100 pt-4"
        >
          <div>
            <label className="block text-xs font-medium text-primaer">Titel</label>
            <input
              name="titel"
              type="text"
              required
              placeholder="Neue Aufgabe"
              className="mt-1 h-9 w-full rounded-lg border border-flaeche-300 px-2 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-primaer">Zwischenziel</label>
              <select
                name="zwischenzielId"
                onChange={beiZwischenzielAendern}
                className="mt-1 h-9 rounded-lg border border-flaeche-300 px-2 text-sm"
              >
                <option value="">Ohne Zwischenziel</option>
                {zwischenziele.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.titel}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-primaer">Fällig am</label>
              <input
                name="faelligAm"
                type="date"
                ref={faelligRef}
                className="mt-1 h-9 rounded-lg border border-flaeche-300 px-2 text-sm"
              />
            </div>

            <fieldset>
              <legend className="text-xs font-medium text-primaer">Priorität</legend>
              <div className="mt-1.5 flex gap-2">
                {AUFGABE_PRIORITAETEN.map((prioritaet) => (
                  <label key={prioritaet.wert} className="flex cursor-pointer items-center gap-1.5" title={prioritaet.name}>
                    <input
                      type="radio"
                      name="prioritaet"
                      value={prioritaet.wert}
                      defaultChecked={prioritaet.wert === "MITTEL"}
                      className="peer sr-only"
                    />
                    <span
                      className={
                        "flex h-7 w-7 items-center justify-center rounded-full ring-offset-2 peer-checked:ring-2 peer-checked:ring-marke-grau peer-focus-visible:ring-2 " +
                        prioritaet.klasse
                      }
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <div>
            <label htmlFor="projekt-aufgabe-zuweisen-suche" className="block text-xs font-medium text-primaer">
              Zuweisen
            </label>
            <div className="mt-1">
              <PersonenAuswahl
                personen={mitgliederKandidaten}
                ausgewaehlteIds={[]}
                name="zugewiesenAn"
                mehrfach={false}
                id="projekt-aufgabe-zuweisen"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-primaer">Anhänge (Dokumente/Fotos)</label>
            <input
              type="file"
              name="anhaenge"
              multiple
              accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
              className="mt-1.5 w-full text-sm text-primaer file:mr-3 file:h-8 file:rounded-lg file:border-0 file:bg-flaeche-100 file:px-3 file:text-sm file:font-medium file:text-primaer hover:file:bg-flaeche-200"
            />
          </div>

          <button
            type="submit"
            className="ml-auto h-9 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
          >
            Aufgabe hinzufügen
          </button>
        </form>
      )}
    </div>
  )
}
