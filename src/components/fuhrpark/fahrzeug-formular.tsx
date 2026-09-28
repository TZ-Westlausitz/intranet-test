import { PersonenAuswahl } from "@/components/personen-auswahl"
import { datumIsoAusDate } from "@/lib/datum"

type Optionen = {
  standorte: { id: string; name: string }[]
  personen: { id: string; name: string }[]
}

export type FahrzeugStandardwerte = {
  kennzeichen: string
  bezeichnung: string
  fahrzeugtyp: "PKW" | "TRANSPORTER" | "BUS"
  sitzplaetze: number | null
  merkmale: string | null
  standortId: string | null
  halterId: string | null
  zuordnungHinweis: string | null
  huFaelligAm: Date | null
  serviceFaelligAm: Date | null
  reifenart: "SOMMER" | "WINTER" | "GANZJAHR" | null
  fuerPrivatausleiheFreigegeben: boolean
  bruttolistenpreisCent: number | null
  kraftstoffart: string | null
  tankgroesseLiter: number | null
  aktiv: boolean
}

const KRAFTSTOFFARTEN = ["Super", "Super Plus", "Diesel", "Elektro"]

const FAHRZEUGTYPEN = [
  { value: "PKW", label: "PKW" },
  { value: "TRANSPORTER", label: "Transporter" },
  { value: "BUS", label: "Bus" },
] as const

const FELD = "h-10 w-full rounded-lg border border-flaeche-300 bg-flaeche px-3 text-sm"
const LABEL = "flex flex-col gap-1 text-sm font-medium text-primaer"

/**
 * Formularfelder für ein Fahrzeug — dieselben für "Neues Fahrzeug" und
 * "Fahrzeug bearbeiten" (`standard` gesetzt). Nur die Felder, kein
 * <form>: den Rahmen (Aktion, Absenden-Knopf) liefert die Seite.
 * `mitAktiv`: nur beim Bearbeiten — abgewählt heißt "ausgemustert".
 */
export function FahrzeugFormularFelder({
  optionen,
  standard,
  mitAktiv,
}: {
  optionen: Optionen
  standard?: FahrzeugStandardwerte
  mitAktiv: boolean
}) {
  const preis =
    standard?.bruttolistenpreisCent != null ? (standard.bruttolistenpreisCent / 100).toFixed(2).replace(".", ",") : ""

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className={LABEL}>
          Kennzeichen
          <input name="kennzeichen" required defaultValue={standard?.kennzeichen} placeholder="z. B. KM-TZ 123" className={FELD} />
        </label>
        <label className={LABEL}>
          Bezeichnung
          <input name="bezeichnung" required defaultValue={standard?.bezeichnung} placeholder="z. B. VW Multivan, 8 Sitze" className={FELD} />
        </label>
        <label className={LABEL}>
          Fahrzeugtyp
          <select name="fahrzeugtyp" defaultValue={standard?.fahrzeugtyp ?? "TRANSPORTER"} className={FELD}>
            {FAHRZEUGTYPEN.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="flex flex-col gap-4 rounded-xl border border-rand p-4">
        <legend className="px-1 text-sm font-semibold text-ueberschrift">Zuordnung</legend>
        <label className={LABEL}>
          Standort
          <select name="standortId" defaultValue={standard?.standortId ?? ""} className={FELD}>
            <option value="">— kein fester Standort —</option>
            {optionen.standorte.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <div className={LABEL}>
          <label htmlFor="halter-auswahl">Halter / verantwortliche Person</label>
          <PersonenAuswahl
            id="halter-auswahl"
            name="halterId"
            mehrfach={false}
            personen={optionen.personen}
            ausgewaehlteIds={standard?.halterId ? [standard.halterId] : []}
          />
          <span className="text-xs font-normal text-tertiaer">
            Bei einem Praxisfahrzeug z. B. die Praxisleitung. Diese Person sieht das Fahrzeug und erhält später die
            Erinnerungen zu TÜV und Service.
          </span>
        </div>
        <label className={LABEL}>
          Hinweis zur Zuordnung
          <input
            name="zuordnungHinweis"
            defaultValue={standard?.zuordnungHinweis ?? ""}
            placeholder="z. B. 1-%-Regelung oder Praxisfahrzeug für alle Therapeuten"
            className={FELD}
          />
          <span className="text-xs font-normal text-tertiaer">Nur für die Werkstatt, Lesende und den Halter sichtbar.</span>
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-xl border border-rand p-4">
        <legend className="px-1 text-sm font-semibold text-ueberschrift">Fristen</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className={LABEL}>
            TÜV fällig am
            <input type="date" name="huFaelligAm" defaultValue={standard?.huFaelligAm ? datumIsoAusDate(standard.huFaelligAm) : ""} className={FELD} />
          </label>
          <label className={LABEL}>
            Service fällig am
            <input
              type="date"
              name="serviceFaelligAm"
              defaultValue={standard?.serviceFaelligAm ? datumIsoAusDate(standard.serviceFaelligAm) : ""}
              className={FELD}
            />
          </label>
          <label className={LABEL}>
            Reifen
            <select name="reifenart" defaultValue={standard?.reifenart ?? ""} className={FELD}>
              <option value="">— nicht angegeben —</option>
              <option value="SOMMER">Sommerreifen</option>
              <option value="WINTER">Winterreifen</option>
              <option value="GANZJAHR">Ganzjahresreifen</option>
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-xl border border-rand p-4">
        <legend className="px-1 text-sm font-semibold text-ueberschrift">Fahrzeugdaten</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className={LABEL}>
            Sitzplätze
            <input type="number" min={1} name="sitzplaetze" defaultValue={standard?.sitzplaetze ?? ""} className={FELD} />
          </label>
          <label className={LABEL}>
            Kraftstoff
            <select name="kraftstoffart" defaultValue={standard?.kraftstoffart ?? ""} className={FELD}>
              <option value="">— nicht angegeben —</option>
              {KRAFTSTOFFARTEN.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <label className={LABEL}>
            Tankgröße (Liter)
            <input type="number" min={1} name="tankgroesseLiter" defaultValue={standard?.tankgroesseLiter ?? ""} className={FELD} />
            <span className="text-xs font-normal text-tertiaer">Bei Elektrofahrzeugen leer lassen.</span>
          </label>
        </div>
        <label className={LABEL}>
          Merkmale
          <input
            name="merkmale"
            defaultValue={standard?.merkmale ?? ""}
            placeholder="z. B. Rollstuhlrampe, Anhängerkupplung"
            className={FELD}
          />
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-xl border border-rand p-4">
        <legend className="px-1 text-sm font-semibold text-ueberschrift">Mietpark (private Ausleihe)</legend>
        <label className="flex items-start gap-2 text-sm text-primaer">
          <input
            type="checkbox"
            name="fuerPrivatausleiheFreigegeben"
            defaultChecked={standard?.fuerPrivatausleiheFreigegeben ?? false}
            className="mt-0.5 h-4 w-4 accent-marke-gruen"
          />
          <span>
            <span className="font-medium">Steht für die private Ausleihe zur Verfügung</span>
            <span className="block text-xs text-tertiaer">Nur dann erscheint das Fahrzeug unter „Fahrzeug mieten“.</span>
          </span>
        </label>
        <label className={LABEL}>
          Bruttolistenpreis (€)
          <input name="bruttolistenpreis" inputMode="decimal" defaultValue={preis} placeholder="z. B. 48.500,00" className={FELD} />
          <span className="text-xs font-normal text-tertiaer">Grundlage für den geldwerten Vorteil bei privater Ausleihe.</span>
        </label>
      </fieldset>

      {mitAktiv && (
        <label className="flex items-start gap-2 text-sm text-primaer">
          <input type="checkbox" name="aktiv" defaultChecked={standard?.aktiv ?? true} className="mt-0.5 h-4 w-4 accent-marke-gruen" />
          <span>
            <span className="font-medium">Fahrzeug ist im Bestand</span>
            <span className="block text-xs text-tertiaer">Abwählen, wenn das Fahrzeug ausgemustert wurde — es verschwindet dann aus allen Listen.</span>
          </span>
        </label>
      )}
    </div>
  )
}
