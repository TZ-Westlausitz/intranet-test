import { RichTextEditor } from "@/components/rich-text-editor"
import { PersonenAuswahl } from "@/components/personen-auswahl"
import type { Person } from "@/components/termin-form-felder"
import { AUFGABE_PRIORITAETEN } from "@/lib/aufgaben-optionen"
import { datumIsoAusDate } from "@/lib/datum"

export type AuftragStandardwerte = {
  titel: string
  beschreibung: string
  zugewiesenAnId: string | null
  faelligAm: string | null
  prioritaet: string
  geplantAm: string | null
}

export const LEERER_AUFTRAG_STANDARDWERTE: AuftragStandardwerte = {
  titel: "",
  beschreibung: "",
  zugewiesenAnId: null,
  faelligAm: null,
  prioritaet: "MITTEL",
  geplantAm: null,
}

/** Wandelt einen geladenen Entwurf (siehe eigeneAuftragEntwuerfe) in AuftragStandardwerte — Muster infoZuStandardwerte. */
export function auftragZuStandardwerte(entwurf: {
  titel: string
  beschreibung: string | null
  zugewiesenAnId: string | null
  faelligAm: Date | null
  prioritaet: string
  geplantAm: Date | null
}): AuftragStandardwerte {
  return {
    titel: entwurf.titel,
    beschreibung: entwurf.beschreibung ?? "",
    zugewiesenAnId: entwurf.zugewiesenAnId,
    faelligAm: entwurf.faelligAm ? datumIsoAusDate(entwurf.faelligAm) : null,
    prioritaet: entwurf.prioritaet,
    geplantAm: entwurf.geplantAm ? datumIsoAusDate(entwurf.geplantAm) : null,
  }
}

/**
 * Titel/Zuweisen/Notizen/Fälligkeit/Priorität/Geplant/Anhänge — extrahiert
 * aus der vormals inline auf `/aufgaben` liegenden Auftrag-Anlegen-Sektion
 * (Rückmeldung 2026-09-09: Umbau zu einem Dialog, damit "schließen ohne zu
 * speichern" eine Entwurf-Nachfrage auslösen kann), Muster InfoFormFelder
 * — dieselben Felder werden sowohl für "neuer Auftrag" als auch "Entwurf
 * weiter bearbeiten" gebraucht (siehe AuftragErstellenDialog).
 */
export function AuftragFormFelder({ standardwerte, personen }: { standardwerte: AuftragStandardwerte; personen: Person[] }) {
  return (
    <>
      <div>
        <label htmlFor="titel" className="block text-xs font-medium text-primaer">
          Titel
        </label>
        <input
          id="titel"
          name="titel"
          type="text"
          defaultValue={standardwerte.titel}
          className="mt-1 h-9 w-full rounded-lg border border-flaeche-300 px-2 text-sm"
        />
      </div>

      <div>
        <label htmlFor="auftrag-zuweisen-suche" className="block text-xs font-medium text-primaer">
          Zuweisen an
        </label>
        <div className="mt-1.5">
          <PersonenAuswahl
            personen={personen}
            ausgewaehlteIds={standardwerte.zugewiesenAnId ? [standardwerte.zugewiesenAnId] : []}
            name="zugewiesenAn"
            mehrfach={false}
            id="auftrag-zuweisen"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-primaer">Notizen (optional)</label>
        <div className="mt-1">
          <RichTextEditor name="beschreibung" defaultValue={standardwerte.beschreibung} />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="faelligAm" className="block text-xs font-medium text-primaer">
            Fällig am
          </label>
          <input
            id="faelligAm"
            name="faelligAm"
            type="date"
            defaultValue={standardwerte.faelligAm ?? ""}
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
                  defaultChecked={prioritaet.wert === standardwerte.prioritaet}
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
        <label htmlFor="geplantAm" className="block text-xs font-medium text-primaer">
          Geplant für (optional)
        </label>
        <input
          id="geplantAm"
          name="geplantAm"
          type="date"
          defaultValue={standardwerte.geplantAm ?? ""}
          className="mt-1 h-9 rounded-lg border border-flaeche-300 px-2 text-sm"
        />
        <p className="mt-1.5 text-xs text-sekundaer">Die zugewiesene Person sieht den Auftrag erst ab diesem Datum.</p>
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
    </>
  )
}
