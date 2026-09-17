import { berechtigung } from "@/lib/auth/berechtigung"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import { AufgabeFormFelder, LEERE_AUFGABE_STANDARDWERTE, aufgabeZuStandardwerte } from "@/components/aufgabe-form-felder"
import { AufgabeBearbeitenDialog } from "@/components/aufgabe-bearbeiten-dialog"
import { aufgabenFuerPerson } from "@/lib/aufgaben/abfragen"
import {
  aufgabeErstellen,
  aufgabeAktualisieren,
  aufgabeErledigtSetzen,
  aufgabeLoeschen,
  aufgabeAnhangLoeschen,
} from "@/lib/aufgaben/aktionen"
import { AUFGABE_PRIORITAET_KLASSEN, AUFGABE_PRIORITAET_NAMEN } from "@/lib/aufgaben-optionen"
import { richTextZuText } from "@/lib/rich-text"
import { datumIsoAusDate } from "@/lib/datum"
import type { Aufgabe } from "@/generated/prisma/client"

const FEHLER_TEXTE: Record<string, string> = {
  pflichtfeld: "Bitte einen Titel eingeben.",
  zuGross: "Eine Datei ist zu groß (maximal 15 MB je Anhang).",
  typUngueltig: "Nicht unterstützter Dateityp. Erlaubt sind PDF und Fotos (JPG, PNG, WEBP, HEIC).",
}

type AufgabeAnhangAnzeige = { id: string; dateiname: string; groesseBytes: number; mimetyp: string }

/** Für die Anzeige unter dem Titel — undatiert bleibt einfach leer. */
function faelligAnzeige(aufgabe: Aufgabe, heute: Date): { text: string; ueberfaellig: boolean } | null {
  if (!aufgabe.faelligAm) return null
  const ueberfaellig = !aufgabe.erledigtAm && aufgabe.faelligAm < heute
  return {
    text: aufgabe.faelligAm.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin", weekday: "short", day: "2-digit", month: "2-digit" }),
    ueberfaellig,
  }
}

/** Anhänge einer Zeile — nur Ansehen hier, Hinzufügen/Löschen läuft über das Bearbeiten-Pop-Up. */
function AnhaengeAnzeige({ aufgabeId, anhaenge }: { aufgabeId: string; anhaenge: AufgabeAnhangAnzeige[] }) {
  if (anhaenge.length === 0) return null
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {anhaenge.map((anhang) => (
        <a
          key={anhang.id}
          href={`/api/aufgaben/${aufgabeId}/anhaenge/${anhang.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex max-w-[10rem] items-center gap-1 truncate rounded-full bg-flaeche-100 px-2 py-0.5 text-xs text-primaer hover:underline"
        >
          📎 {anhang.dateiname}
        </a>
      ))}
    </div>
  )
}

/**
 * Persönliche To-do-Liste — jede Person sieht ausschließlich ihre eigenen
 * Aufgaben, keine Rollenprüfung nötig (siehe Kommentar am Model Aufgabe).
 * Anlegen/Abhaken/Löschen direkt in der Liste, Bearbeiten (Titel, Notizen,
 * Fälligkeit, Priorität, weitere Anhänge) über das Stift-Symbol —
 * denselben Feldsatz wie beim Anlegen, nur schon ausgefüllt
 * (AufgabeFormFelder, geteilt zwischen beiden).
 *
 * Priorität sortiert innerhalb desselben Fälligkeitsdatums (höchste
 * zuerst) — siehe aufgabenFuerPerson.
 *
 * "Weitere Optionen" (Notizen/Fälligkeit/Priorität/Anhänge) steckt beim
 * Anlegen hinter einem <details>, damit das Formular im Alltag nicht mehr
 * Platz braucht als ein einzeiliges "Titel eintippen, Enter" — beim
 * Bearbeiten ist es von Anfang an ausgeklappt.
 *
 * Bewusst NUR persönliche Notizen/Erinnerungen — Aufträge von/an andere
 * Personen sowie die "Aus Projekten zugewiesen"-Übersicht laufen über
 * /aufgaben (siehe Rückmeldung dazu: die To-Do-Liste soll klein und
 * persönlich bleiben, nicht mit fremdzugewiesenen Aufgaben vermischt sein).
 */
export default async function ToDosSeite({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string }>
}) {
  const kontext = await berechtigung()
  const { fehler } = await searchParams

  const heute = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
  const { offen, erledigt } = await aufgabenFuerPerson(kontext.personId)

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Kopfleiste />
      <h1 className="text-center text-2xl font-semibold text-ueberschrift md:text-left">To-Do-Liste</h1>

      {fehler && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700 md:text-left">
          {FEHLER_TEXTE[fehler] ?? "Das hat nicht geklappt."}
        </p>
      )}

      <form action={aufgabeErstellen} className="mt-6 flex flex-col gap-3 rounded-xl border border-rand bg-flaeche p-4">
        <AufgabeFormFelder standardwerte={LEERE_AUFGABE_STANDARDWERTE} />
        <button
          type="submit"
          className="ml-auto h-9 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
        >
          Hinzufügen
        </button>
      </form>

      <div className="mt-6 rounded-xl border border-rand bg-flaeche p-4">
        <h2 className="text-sm font-semibold text-ueberschrift">Offen ({offen.length})</h2>

        {offen.length === 0 ? (
          <p className="mt-3 text-sm text-sekundaer">Keine offenen Aufgaben.</p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-flaeche-100">
            {offen.map((aufgabe) => {
              const faellig = faelligAnzeige(aufgabe, heute)
              const standardwerte = aufgabeZuStandardwerte(aufgabe)
              return (
                <li key={aufgabe.id} className="flex items-start gap-3 py-2.5">
                  <form action={aufgabeErledigtSetzen.bind(null, aufgabe.id, true)}>
                    <button
                      type="submit"
                      aria-label="Als erledigt markieren"
                      className="mt-0.5 h-5 w-5 shrink-0 rounded border-2 border-flaeche-300 transition hover:border-marke-gruen"
                    />
                  </form>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        aria-label={`Priorität: ${AUFGABE_PRIORITAET_NAMEN[aufgabe.prioritaet]}`}
                        title={AUFGABE_PRIORITAET_NAMEN[aufgabe.prioritaet]}
                        className={"h-2 w-2 shrink-0 rounded-full " + AUFGABE_PRIORITAET_KLASSEN[aufgabe.prioritaet]}
                      />
                      <span className="text-sm text-primaer">{aufgabe.titel}</span>
                    </div>
                    {aufgabe.beschreibung && (
                      <p className="mt-0.5 truncate text-xs text-tertiaer">
                        {richTextZuText(aufgabe.beschreibung)}
                      </p>
                    )}
                    <AnhaengeAnzeige aufgabeId={aufgabe.id} anhaenge={aufgabe.anhaenge} />
                  </div>

                  {faellig && (
                    <span
                      className={
                        "mt-0.5 flex shrink-0 items-center gap-1 text-xs font-medium " +
                        (faellig.ueberfaellig ? "text-red-600" : "text-tertiaer")
                      }
                    >
                      {faellig.ueberfaellig && <span aria-hidden>⚠</span>}
                      {faellig.text}
                      {faellig.ueberfaellig && <span className="sr-only"> (überfällig)</span>}
                    </span>
                  )}

                  <AufgabeBearbeitenDialog
                    aufgabeId={aufgabe.id}
                    standardwerte={standardwerte}
                    bestehendeAnhaenge={aufgabe.anhaenge}
                    aktualisierenAktion={aufgabeAktualisieren}
                    anhangLoeschenAktion={aufgabeAnhangLoeschen}
                  />

                  <form action={aufgabeLoeschen.bind(null, aufgabe.id)}>
                    <button
                      type="submit"
                      aria-label="Aufgabe löschen"
                      className="mt-0.5 shrink-0 rounded p-1 text-tertiaer transition hover:bg-red-50 hover:text-red-600"
                    >
                      ×
                    </button>
                  </form>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {erledigt.length > 0 && (
        <details className="mt-4 rounded-xl border border-rand bg-flaeche p-4">
          <summary className="cursor-pointer text-sm font-semibold text-ueberschrift">
            Erledigt ({erledigt.length})
          </summary>

          <ul className="mt-3 flex flex-col divide-y divide-flaeche-100">
            {erledigt.map((aufgabe) => (
              <li key={aufgabe.id} className="flex items-start gap-3 py-2.5">
                <form action={aufgabeErledigtSetzen.bind(null, aufgabe.id, false)}>
                  <button
                    type="submit"
                    aria-label="Als offen markieren"
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-marke-gruen text-xs font-bold text-neutral-900"
                  >
                    ✓
                  </button>
                </form>

                <div className="min-w-0 flex-1">
                  <span className="text-sm text-tertiaer line-through">{aufgabe.titel}</span>
                  {aufgabe.beschreibung && (
                    <p className="mt-0.5 truncate text-xs text-neutral-300 line-through">
                      {richTextZuText(aufgabe.beschreibung)}
                    </p>
                  )}
                  <AnhaengeAnzeige aufgabeId={aufgabe.id} anhaenge={aufgabe.anhaenge} />
                </div>

                <span className="mt-0.5 shrink-0 text-xs text-tertiaer">
                  {aufgabe.erledigtAm && datumIsoAusDate(aufgabe.erledigtAm)}
                </span>

                <form action={aufgabeLoeschen.bind(null, aufgabe.id)}>
                  <button
                    type="submit"
                    aria-label="Aufgabe löschen"
                    className="mt-0.5 shrink-0 rounded p-1 text-tertiaer transition hover:bg-red-50 hover:text-red-600"
                  >
                    ×
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </details>
      )}

      <ZurueckButton />
    </main>
  )
}
