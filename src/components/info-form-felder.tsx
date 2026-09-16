import { RichTextEditor } from "@/components/rich-text-editor"
import { InfoEmpfaengerAuswahl } from "@/components/info-empfaenger-auswahl"
import { UmfrageFormFelder } from "@/components/umfrage-form-felder"
import { DatumUhrzeitFeld } from "@/components/datum-uhrzeit-feld"
import { datumUhrzeitFuerDatumUhrzeitFeld } from "@/lib/datum"
import type { Person } from "@/components/termin-form-felder"

export type InfoAnhangAnzeige = { id: string; dateiname: string; groesseBytes: number; mimetyp: string }

export type InfoStandardwerte = {
  titel: string
  inhalt: string
  kategorieId: string
  mitBestaetigung: boolean
  kommentareErlaubt: boolean
  alsUnternehmen: boolean
  empfaengerPersonenIds: string[]
  empfaengerGruppenIds: string[]
  empfaengerAbteilungenIds: string[]
  /** datetime-local-formatiert (siehe datumUhrzeitFuerDatumUhrzeitFeld), `null` = kein Termin gesetzt. */
  geplantAm: string | null
  /**
   * Ob das "Geplant für"-Feld überhaupt angezeigt wird — beim Anlegen
   * immer `true`, beim Bearbeiten nur solange die Info noch nicht
   * veröffentlicht ist (siehe newsfeed-liste.tsx). Auf einer bereits
   * veröffentlichten Info wäre das Feld irreführend leer.
   */
  geplantAmBearbeitbar: boolean
}

export const LEERE_INFO_STANDARDWERTE: InfoStandardwerte = {
  titel: "",
  inhalt: "",
  kategorieId: "",
  mitBestaetigung: false,
  kommentareErlaubt: true,
  alsUnternehmen: false,
  empfaengerPersonenIds: [],
  empfaengerGruppenIds: [],
  empfaengerAbteilungenIds: [],
  geplantAm: null,
  geplantAmBearbeitbar: true,
}

/**
 * Wandelt eine geladene Info (Newsfeed-Karte oder Kalendereintrag unter
 * "Geplante Aktionen") in `InfoStandardwerte` für den Bearbeiten-Dialog um
 * — an EINER Stelle statt an jeder aufrufenden Komponente einzeln
 * nachgebaut (siehe newsfeed-liste.tsx, src/app/(mitarbeiter)/geplante-aktionen/page.tsx).
 */
export function infoZuStandardwerte(info: {
  titel: string
  inhalt: string | null
  kategorieId: string | null
  mitBestaetigung: boolean
  kommentareErlaubt: boolean
  alsUnternehmen: boolean
  empfaengerPersonen: { personId: string }[]
  empfaengerGruppen: { gruppeId: string }[]
  empfaengerAbteilungen: { abteilungId: string }[]
  geplantAm: Date | null
  nochNichtVeroeffentlicht: boolean
}): InfoStandardwerte {
  return {
    titel: info.titel,
    inhalt: info.inhalt ?? "",
    kategorieId: info.kategorieId ?? "",
    mitBestaetigung: info.mitBestaetigung,
    kommentareErlaubt: info.kommentareErlaubt,
    alsUnternehmen: info.alsUnternehmen,
    empfaengerPersonenIds: info.empfaengerPersonen.map((e) => e.personId),
    empfaengerGruppenIds: info.empfaengerGruppen.map((e) => e.gruppeId),
    empfaengerAbteilungenIds: info.empfaengerAbteilungen.map((e) => e.abteilungId),
    geplantAm: info.geplantAm ? datumUhrzeitFuerDatumUhrzeitFeld(info.geplantAm) : null,
    geplantAmBearbeitbar: info.nochNichtVeroeffentlicht,
  }
}

/**
 * Optionslisten fürs Formular (Empfänger-Auswahllisten, Kategorien, ob der
 * Unternehmens-Schalter erscheint) — für die aufrufende Person meist
 * einmal ermittelt und sowohl an den Erstellen- als auch an jeden
 * Bearbeiten-Dialog derselben Seite durchgereicht, statt es je Info neu
 * abzufragen.
 */
export type InfoFormularOptionen = {
  personen: Person[]
  gruppen: Person[]
  abteilungen: Person[]
  kategorien: Person[]
  darfAlsUnternehmen: boolean
}

/**
 * Geteilt zwischen InfoErstellenDialog und InfoBearbeitenDialog — dieselben
 * Felder, damit sie nicht zweimal gepflegt werden müssen (genau das Muster
 * von AufgabeFormFelder beim Aufgaben-Baustein). Die Empfänger-Auswahl
 * (Abteilungen/Gruppen/Personen) läuft über EINE gemeinsame Suchzeile
 * (InfoEmpfaengerAuswahl), die beim Aufklappen alle drei Kategorien
 * gruppiert zeigt, statt drei getrennte Zeilen zu brauchen.
 *
 * `bestehendeAnhaenge`/`infoId`/`anhangLoeschenAktion` gibt es nur beim
 * Bearbeiten (beim Anlegen kann es noch keine Anhänge geben).
 */
export function InfoFormFelder({
  standardwerte,
  optionen: { personen, gruppen, abteilungen, kategorien, darfAlsUnternehmen },
  bestehendeAnhaenge = [],
  infoId,
  anhangLoeschenAktion,
}: {
  standardwerte: InfoStandardwerte
  optionen: InfoFormularOptionen
  bestehendeAnhaenge?: InfoAnhangAnzeige[]
  infoId?: string
  anhangLoeschenAktion?: (anhangId: string) => void
}) {
  return (
    <>
      <div>
        <label htmlFor="info-titel" className="block text-xs font-medium text-primaer">
          Titel
        </label>
        <input
          id="info-titel"
          name="titel"
          type="text"
          required
          defaultValue={standardwerte.titel}
          className="mt-1 h-9 w-full rounded-lg border border-flaeche-300 px-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-primaer">Inhalt (optional)</label>
        <div className="mt-1">
          <RichTextEditor name="inhalt" defaultValue={standardwerte.inhalt} bilderErlaubt mentionPersonen={personen} />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-medium text-primaer">Empfänger</h3>
        <div className="mt-1.5">
          <InfoEmpfaengerAuswahl
            abteilungen={abteilungen}
            gruppen={gruppen}
            personen={personen}
            ausgewaehlt={{
              abteilungen: standardwerte.empfaengerAbteilungenIds,
              gruppen: standardwerte.empfaengerGruppenIds,
              personen: standardwerte.empfaengerPersonenIds,
            }}
          />
        </div>
        <p className="mt-1.5 text-xs text-sekundaer">
          Mindestens eine Abteilung, Gruppe oder Person ist erforderlich.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="flex items-center gap-2 text-sm text-primaer">
          <input
            type="checkbox"
            name="mitBestaetigung"
            defaultChecked={standardwerte.mitBestaetigung}
            className="h-4 w-4 rounded border-flaeche-300"
          />
          Mit Bestätigung (jeder Empfänger muss ausdrücklich bestätigen)
        </label>
        <label className="flex items-center gap-2 text-sm text-primaer">
          <input
            type="checkbox"
            name="kommentareErlaubt"
            defaultChecked={standardwerte.kommentareErlaubt}
            className="h-4 w-4 rounded border-flaeche-300"
          />
          Kommentare erlauben
        </label>
        {darfAlsUnternehmen && (
          <label className="flex items-center gap-2 text-sm text-primaer">
            <input
              type="checkbox"
              name="alsUnternehmen"
              defaultChecked={standardwerte.alsUnternehmen}
              className="h-4 w-4 rounded border-flaeche-300"
            />
            Im Namen des Unternehmens veröffentlichen
          </label>
        )}
      </div>

      {bestehendeAnhaenge.length > 0 && infoId && (
        <div>
          <label className="block text-xs font-medium text-primaer">Bestehende Anhänge</label>
          <ul className="mt-1.5 flex flex-col gap-1">
            {bestehendeAnhaenge.map((anhang) => (
              <li
                key={anhang.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-rand px-2.5 py-1.5 text-sm"
              >
                <a
                  href={`/api/infos/${infoId}/anhaenge/${anhang.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-marke-gruen-dunkel hover:underline"
                >
                  📎 {anhang.dateiname}
                </a>
                {anhangLoeschenAktion && (
                  <button
                    type="button"
                    onClick={() => anhangLoeschenAktion(anhang.id)}
                    aria-label={`${anhang.dateiname} entfernen`}
                    className="shrink-0 rounded p-1 text-xs text-tertiaer hover:bg-red-50 hover:text-red-600"
                  >
                    entfernen
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-primaer">
          {bestehendeAnhaenge.length > 0 ? "Weitere Anhänge" : "Anhänge (Dokumente/Fotos)"}
        </label>
        <input
          type="file"
          name="anhaenge"
          multiple
          accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
          className="mt-1.5 w-full text-sm text-primaer file:mr-3 file:h-8 file:rounded-lg file:border-0 file:bg-flaeche-100 file:px-3 file:text-sm file:font-medium file:text-primaer hover:file:bg-flaeche-200"
        />
      </div>

      <div>
        <label htmlFor="info-kategorie" className="block text-xs font-medium text-primaer">
          Kategorie (optional)
        </label>
        <select
          id="info-kategorie"
          name="kategorieId"
          defaultValue={standardwerte.kategorieId}
          className="mt-1 h-9 w-full rounded-lg border border-flaeche-300 px-2 text-sm"
        >
          <option value="">Keine</option>
          {kategorien.map((kategorie) => (
            <option key={kategorie.id} value={kategorie.id}>
              {kategorie.name}
            </option>
          ))}
        </select>
      </div>

      {standardwerte.geplantAmBearbeitbar && (
        <div>
          <label className="block text-xs font-medium text-primaer">Geplant für (optional)</label>
          <div className="mt-1">
            <DatumUhrzeitFeld name="geplantAm" defaultValue={standardwerte.geplantAm ?? undefined} />
          </div>
          <p className="mt-1.5 text-xs text-sekundaer">Leer lassen, um sofort zu veröffentlichen.</p>
        </div>
      )}

      {!infoId && <UmfrageFormFelder />}
    </>
  )
}
