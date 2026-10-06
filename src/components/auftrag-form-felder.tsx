"use client"

import { useState } from "react"

import { AuftragEmpfaengerFeld } from "@/components/auftrag-empfaenger-feld"
import { CheckpunkteEditor } from "@/components/checkpunkte-editor"
import { RICH_TEXT_ANZEIGE_KLASSE } from "@/components/formular-feld"
import { InfoHinweis } from "@/components/info-hinweis"
import { RichTextEditor } from "@/components/rich-text-editor"
import type { Person } from "@/components/termin-form-felder"
import { AUFGABE_PRIORITAETEN, AUFGABE_PRIORITAET_KLASSEN, AUFGABE_PRIORITAET_NAMEN } from "@/lib/aufgaben-optionen"
import { formatiereDatum } from "@/lib/datum"
import type { AuftragStandardwerte } from "@/lib/auftraege/standardwerte"

/**
 * Titel, Zuweisen, Beschreibung, Checkliste, Fällig/Priorität/Geplant und
 * Anhänge — extrahiert aus der vormals inline auf `/aufgaben` liegenden
 * Auftrag-Anlegen-Sektion (Rückmeldung 2026-09-09: Umbau zu einem Dialog,
 * damit "schließen ohne zu speichern" eine Entwurf-Nachfrage auslösen kann),
 * Muster InfoFormFelder — dieselben Felder werden sowohl für "Neue Aufgabe"
 * als auch "Entwurf weiter bearbeiten" und das Bearbeiten gebraucht (siehe
 * AuftragErstellenDialog; UI-Text "Aufgabe" statt "Auftrag" seit
 * Rückmeldung 2026-09-15, Komponenten-/Modellname Auftrag intern
 * unverändert). Die Datenhelfer (Typ, Standardwerte) stehen in
 * src/lib/auftraege/standardwerte.ts, weil diese Datei eine Client Component
 * ist und die Server-Seite sie nicht aufrufen könnte.
 *
 * `mitVorschau` (Rückmeldung 2026-10-05, Vorbild Formular-Baukasten): rechts
 * neben den Feldern steht eine Live-Vorschau, wie die Aufgabe bei den
 * Empfängern aussieht. Am Handy bleibt sie weg, dort soll das Formular kurz
 * sein.
 */
export function AuftragFormFelder({
  standardwerte,
  personen,
  nurInhalt = false,
  idPrefix = "",
  mitVorschau = false,
}: {
  standardwerte: AuftragStandardwerte
  personen: Person[]
  /** Bearbeiten eines bereits zugewiesenen Auftrags: ohne "Zuweisen an" und "Geplant für" (siehe auftragAktualisieren). */
  nurInhalt?: boolean
  /** Macht die Feld-IDs eindeutig, wenn mehrere Formulare gleichzeitig auf der Seite stehen (ein Pop-Up je Aufgabe). */
  idPrefix?: string
  mitVorschau?: boolean
}) {
  // Spiegel der Eingaben für die Vorschau; die Felder selbst bleiben
  // unkontrolliert (defaultValue), damit das normale Formular-Absenden wie
  // bisher funktioniert.
  const [titel, setTitel] = useState(standardwerte.titel)
  const [beschreibung, setBeschreibung] = useState(standardwerte.beschreibung)
  const [empfaengerIds, setEmpfaengerIds] = useState(standardwerte.zugewiesenAnIds)
  const [einzeln, setEinzeln] = useState(false)
  const [checklisteAn, setChecklisteAn] = useState(standardwerte.checkpunkte.length > 0)
  const [checkTexte, setCheckTexte] = useState(standardwerte.checkpunkte.map((punkt) => punkt.text))
  const [faelligAm, setFaelligAm] = useState(standardwerte.faelligAm ?? "")
  const [prioritaet, setPrioritaet] = useState(standardwerte.prioritaet)
  const [geplantAm, setGeplantAm] = useState(standardwerte.geplantAm ?? "")

  const felder = (
    <div className="flex min-w-0 flex-col gap-3">
      <div>
        <label htmlFor={`${idPrefix}titel`} className="block text-xs font-medium text-primaer">
          Titel
        </label>
        <input
          id={`${idPrefix}titel`}
          name="titel"
          type="text"
          defaultValue={standardwerte.titel}
          onChange={(ereignis) => setTitel(ereignis.target.value)}
          className="mt-1 h-9 w-full rounded-lg border border-flaeche-300 px-2 text-sm"
        />
      </div>

      {!nurInhalt && (
        <AuftragEmpfaengerFeld
          personen={personen}
          ausgewaehlteIds={standardwerte.zugewiesenAnIds}
          onAenderung={(stand) => {
            setEmpfaengerIds(stand.ids)
            setEinzeln(stand.einzeln)
          }}
        />
      )}

      <div>
        <label className="block text-xs font-medium text-primaer">Beschreibung (optional)</label>
        <div className="mt-1">
          <RichTextEditor name="beschreibung" defaultValue={standardwerte.beschreibung} onChange={setBeschreibung} />
        </div>
      </div>

      <div>
        <div className="flex items-center gap-1.5">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-primaer">
            <input
              type="checkbox"
              checked={checklisteAn}
              onChange={(ereignis) => {
                setChecklisteAn(ereignis.target.checked)
                // Ausgeschaltet: keine Punkte werden mitgeschickt (beim Bearbeiten löscht das die Checkliste).
                if (!ereignis.target.checked) setCheckTexte([])
              }}
              className="h-3.5 w-3.5 shrink-0"
            />
            Checkliste
          </label>
          <InfoHinweis text="Unterpunkte, die die zugewiesene Person einzeln abhaken kann. Die Aufgabe selbst erledigt sie danach getrennt davon." />
        </div>
        {checklisteAn && (
          <CheckpunkteEditor
            startwerte={standardwerte.checkpunkte}
            autoFokus={standardwerte.checkpunkte.length === 0}
            onAenderung={setCheckTexte}
          />
        )}
      </div>

      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <div>
          <label htmlFor={`${idPrefix}faelligAm`} className="block text-xs font-medium text-primaer">
            Fällig am
          </label>
          <input
            id={`${idPrefix}faelligAm`}
            name="faelligAm"
            type="date"
            defaultValue={standardwerte.faelligAm ?? ""}
            onChange={(ereignis) => setFaelligAm(ereignis.target.value)}
            className="mt-1 h-9 rounded-lg border border-flaeche-300 px-2 text-sm"
          />
        </div>

        <fieldset>
          <legend className="text-xs font-medium text-primaer">Priorität</legend>
          <div className="mt-1.5 flex h-9 items-center gap-2">
            {AUFGABE_PRIORITAETEN.map((eintrag) => (
              <label key={eintrag.wert} className="flex cursor-pointer items-center gap-1.5" title={eintrag.name}>
                <input
                  type="radio"
                  name="prioritaet"
                  value={eintrag.wert}
                  defaultChecked={eintrag.wert === standardwerte.prioritaet}
                  onChange={() => setPrioritaet(eintrag.wert)}
                  className="peer sr-only"
                />
                <span
                  className={
                    "flex h-7 w-7 items-center justify-center rounded-full ring-offset-2 peer-checked:ring-2 peer-checked:ring-marke-grau peer-focus-visible:ring-2 " +
                    eintrag.klasse
                  }
                />
              </label>
            ))}
          </div>
        </fieldset>

        {!nurInhalt && (
          <div>
            <div className="flex items-center gap-1">
              <label htmlFor={`${idPrefix}geplantAm`} className="block text-xs font-medium text-primaer">
                Geplant für (optional)
              </label>
              <InfoHinweis text="Die zugewiesene Person sieht die Aufgabe erst ab diesem Datum." />
            </div>
            <input
              id={`${idPrefix}geplantAm`}
              name="geplantAm"
              type="date"
              defaultValue={standardwerte.geplantAm ?? ""}
              onChange={(ereignis) => setGeplantAm(ereignis.target.value)}
              className="mt-1 h-9 rounded-lg border border-flaeche-300 px-2 text-sm"
            />
          </div>
        )}
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
    </div>
  )

  if (!mitVorschau) return felder

  const empfaengerNamen = empfaengerIds
    .map((id) => personen.find((person) => person.id === id)?.name)
    .filter((name): name is string => Boolean(name))
  const punkte = checkTexte.map((text) => text.trim()).filter(Boolean)

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      {felder}

      {/* Nur auf breiten Bildschirmen — am Handy bleibt das Formular kurz. */}
      <aside className="hidden lg:block lg:self-start" aria-label="Vorschau">
        <p className="mb-2 text-xs font-semibold tracking-wide text-tertiaer uppercase">Vorschau</p>
        <div className="rounded-xl border border-rand bg-flaeche p-4 shadow-sm">
          <div className="flex items-start gap-2">
            <span
              aria-label={`Priorität: ${AUFGABE_PRIORITAET_NAMEN[prioritaet]}`}
              title={AUFGABE_PRIORITAET_NAMEN[prioritaet]}
              className={"mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full " + AUFGABE_PRIORITAET_KLASSEN[prioritaet]}
            />
            <h3 className="text-base font-semibold break-words text-ueberschrift">{titel.trim() || "(Titel)"}</h3>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-sekundaer">
            <span className="rounded-full bg-marke-orange/15 px-2 py-0.5 text-[11px] font-medium text-ueberschrift">Offen</span>
            {faelligAm && <span>Fällig: {formatiereDatum(faelligAm)}</span>}
          </div>

          {!nurInhalt && (
            <p className="mt-2 text-xs text-sekundaer">
              {empfaengerNamen.length === 0
                ? "An: (noch niemand ausgewählt)"
                : `An: ${empfaengerNamen.join(", ")}`}
              {empfaengerNamen.length > 1 && (einzeln ? " · jede Person bekommt ihre eigene Aufgabe" : " · gemeinsame Aufgabe")}
            </p>
          )}
          {!nurInhalt && geplantAm && (
            <p className="mt-1 text-xs text-tertiaer">Sichtbar ab {formatiereDatum(geplantAm)}</p>
          )}

          {beschreibung.replace(/<[^>]*>/g, "").trim() !== "" && (
            <div className={RICH_TEXT_ANZEIGE_KLASSE + " mt-3 text-sm text-primaer"} dangerouslySetInnerHTML={{ __html: beschreibung }} />
          )}

          {checklisteAn && punkte.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-ueberschrift">Checkliste · 0 von {punkte.length} erledigt</p>
              <ul className="mt-1.5 flex flex-col gap-1.5">
                {punkte.map((punkt, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span aria-hidden className="mt-0.5 h-4 w-4 shrink-0 rounded border-2 border-flaeche-300" />
                    <span className="text-sm break-words text-primaer">{punkt}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
