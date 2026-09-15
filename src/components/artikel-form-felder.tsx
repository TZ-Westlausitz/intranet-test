import { RichTextEditor } from "@/components/rich-text-editor"
import { InfoEmpfaengerAuswahl } from "@/components/info-empfaenger-auswahl"
import type { Person } from "@/components/termin-form-felder"

export type ArtikelAnhangAnzeige = { id: string; dateiname: string; groesseBytes: number; mimetyp: string }

export type ArtikelStandardwerte = {
  titel: string
  inhalt: string
  empfaengerPersonenIds: string[]
  empfaengerGruppenIds: string[]
  empfaengerAbteilungenIds: string[]
}

export const LEERE_ARTIKEL_STANDARDWERTE: ArtikelStandardwerte = {
  titel: "",
  inhalt: "",
  empfaengerPersonenIds: [],
  empfaengerGruppenIds: [],
  empfaengerAbteilungenIds: [],
}

/** Wandelt einen geladenen Artikel in ArtikelStandardwerte für den Bearbeiten-Dialog um (Muster: infoZuStandardwerte). */
export function artikelZuStandardwerte(artikel: {
  titel: string
  inhalt: string | null
  empfaengerPersonen: { personId: string }[]
  empfaengerGruppen: { gruppeId: string }[]
  empfaengerAbteilungen: { abteilungId: string }[]
}): ArtikelStandardwerte {
  return {
    titel: artikel.titel,
    inhalt: artikel.inhalt ?? "",
    empfaengerPersonenIds: artikel.empfaengerPersonen.map((e) => e.personId),
    empfaengerGruppenIds: artikel.empfaengerGruppen.map((e) => e.gruppeId),
    empfaengerAbteilungenIds: artikel.empfaengerAbteilungen.map((e) => e.abteilungId),
  }
}

/** Für die aufrufende Seite meist einmal ermittelt, an Erstellen- und Bearbeiten-Dialog durchgereicht (Muster: InfoFormularOptionen). */
export type ArtikelFormularOptionen = {
  personen: Person[]
  gruppen: Person[]
  abteilungen: Person[]
}

/**
 * Geteilt zwischen ArtikelErstellenDialog und ArtikelBearbeitenDialog —
 * Muster InfoFormFelder, deutlich schlanker (kein Kategorie/Bestätigung/
 * Kommentare/Umfrage/Geplant-für, siehe Kontext im Plan). Kein
 * `bilderErlaubt` am RichTextEditor — reine Textformatierung, Bilder
 * gehören als separater Anhang dazu, nicht inline im Text.
 *
 * `bestehendeAnhaenge`/`artikelId`/`anhangLoeschenAktion` gibt es nur beim
 * Bearbeiten (beim Anlegen kann es noch keine Anhänge geben).
 */
export function ArtikelFormFelder({
  standardwerte,
  optionen: { personen, gruppen, abteilungen },
  bestehendeAnhaenge = [],
  artikelId,
  anhangLoeschenAktion,
}: {
  standardwerte: ArtikelStandardwerte
  optionen: ArtikelFormularOptionen
  bestehendeAnhaenge?: ArtikelAnhangAnzeige[]
  artikelId?: string
  anhangLoeschenAktion?: (anhangId: string) => void
}) {
  return (
    <>
      <div>
        <label htmlFor="artikel-titel" className="block text-xs font-medium text-primaer">
          Titel
        </label>
        <input
          id="artikel-titel"
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
          <RichTextEditor name="inhalt" defaultValue={standardwerte.inhalt} />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-medium text-primaer">Sichtbar für</h3>
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

      {bestehendeAnhaenge.length > 0 && artikelId && (
        <div>
          <label className="block text-xs font-medium text-primaer">Bestehende Anhänge</label>
          <ul className="mt-1.5 flex flex-col gap-1">
            {bestehendeAnhaenge.map((anhang) => (
              <li
                key={anhang.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-rand px-2.5 py-1.5 text-sm"
              >
                <a
                  href={`/api/wissen/${artikelId}/anhaenge/${anhang.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-marke-gruen-dunkel hover:underline"
                >
                  📎 {anhang.dateiname}
                </a>
                {anhangLoeschenAktion && (
                  <form action={anhangLoeschenAktion.bind(null, anhang.id)}>
                    <button
                      type="submit"
                      aria-label={`${anhang.dateiname} entfernen`}
                      className="shrink-0 rounded p-1 text-xs text-tertiaer hover:bg-red-50 hover:text-red-600"
                    >
                      entfernen
                    </button>
                  </form>
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
    </>
  )
}
