import Link from "next/link"
import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import { RichTextEditor } from "@/components/rich-text-editor"
import { PersonenAuswahl } from "@/components/personen-auswahl"
import { AuftragKommentare, type AuftragKommentarAnzeige } from "@/components/auftrag-kommentare"
import { auftraegeFuerPerson } from "@/lib/auftraege/abfragen"
import { projektAufgabenFuerPerson, projekteFuerPerson } from "@/lib/projekte/abfragen"
import {
  auftragErstellen,
  auftragAnnehmen,
  auftragErledigtSetzen,
  auftragLoeschen,
  auftragAnhangLoeschen,
  auftragKommentarErstellen,
} from "@/lib/auftraege/aktionen"
import { AUFGABE_PRIORITAETEN, AUFGABE_PRIORITAET_KLASSEN, AUFGABE_PRIORITAET_NAMEN } from "@/lib/aufgaben-optionen"
import { AUFGABE_STATUS_KLASSEN, AUFGABE_STATUS_NAMEN } from "@/lib/projekte-optionen"
import { richTextZuText } from "@/lib/rich-text"
import { datumIsoAusDate } from "@/lib/datum"

const FEHLER_TEXTE: Record<string, string> = {
  pflichtfeld: "Bitte einen Titel eintragen und eine Person auswählen.",
  selbstauftrag: "An dich selbst geht das nicht — dafür gibt es die To-Do-Liste.",
  zuGross: "Eine Datei ist zu groß (maximal 15 MB je Anhang).",
  typUngueltig: "Nicht unterstützter Dateityp. Erlaubt sind PDF und Fotos (JPG, PNG, WEBP, HEIC).",
}

type AnhangAnzeige = { id: string; dateiname: string; groesseBytes: number; mimetyp: string }

type AuftragMitBeziehung = {
  id: string
  titel: string
  beschreibung: string | null
  prioritaet: string
  status: string
  faelligAm: Date | null
  erledigtAm: Date | null
  anhaenge: AnhangAnzeige[]
  kommentare: AuftragKommentarAnzeige[]
}

function faelligAnzeige(auftrag: { faelligAm: Date | null; erledigtAm: Date | null }, heute: Date) {
  if (!auftrag.faelligAm) return null
  const ueberfaellig = !auftrag.erledigtAm && auftrag.faelligAm < heute
  return {
    text: auftrag.faelligAm.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" }),
    ueberfaellig,
  }
}

function AnhaengeAnzeige({
  auftragId,
  anhaenge,
  loeschbar,
}: {
  auftragId: string
  anhaenge: AnhangAnzeige[]
  loeschbar: boolean
}) {
  if (anhaenge.length === 0) return null
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {anhaenge.map((anhang) => (
        <span
          key={anhang.id}
          className="flex items-center gap-1 rounded-full bg-neutral-100 py-0.5 pr-1 pl-2 text-xs text-neutral-600"
        >
          <a
            href={`/api/auftraege/${auftragId}/anhaenge/${anhang.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="max-w-[10rem] truncate hover:underline"
          >
            📎 {anhang.dateiname}
          </a>
          {loeschbar && (
            <form action={auftragAnhangLoeschen.bind(null, anhang.id)}>
              <button
                type="submit"
                aria-label={`${anhang.dateiname} entfernen`}
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:bg-white hover:text-red-600"
              >
                ×
              </button>
            </form>
          )}
        </span>
      ))}
    </div>
  )
}

/** Titel/Priorität/Notiz/Anhänge-Anzeige — geteilt zwischen "Dir zugewiesen" und "Von dir vergeben". */
function AuftragInhalt({ auftrag, heute, name }: { auftrag: AuftragMitBeziehung; heute: Date; name: string | null }) {
  const faellig = faelligAnzeige(auftrag, heute)
  return (
    <>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            aria-label={`Priorität: ${AUFGABE_PRIORITAET_NAMEN[auftrag.prioritaet]}`}
            title={AUFGABE_PRIORITAET_NAMEN[auftrag.prioritaet]}
            className={"h-2 w-2 shrink-0 rounded-full " + AUFGABE_PRIORITAET_KLASSEN[auftrag.prioritaet]}
          />
          <span className={"text-sm text-neutral-800" + (auftrag.erledigtAm ? " text-neutral-400 line-through" : "")}>
            {auftrag.titel}
          </span>
          <span
            className={"shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium " + AUFGABE_STATUS_KLASSEN[auftrag.status]}
          >
            {AUFGABE_STATUS_NAMEN[auftrag.status]}
          </span>
          {name && <span className="text-xs text-neutral-400">({name})</span>}
        </div>
        {auftrag.beschreibung && (
          <p className="mt-0.5 truncate text-xs text-neutral-400">{richTextZuText(auftrag.beschreibung)}</p>
        )}
      </div>

      {faellig && (
        <span
          className={
            "mt-0.5 flex shrink-0 items-center gap-1 text-xs font-medium " +
            (faellig.ueberfaellig ? "text-red-600" : "text-neutral-400")
          }
        >
          {faellig.ueberfaellig && <span aria-hidden>⚠</span>}
          {faellig.text}
          {faellig.ueberfaellig && <span className="sr-only"> (überfällig)</span>}
        </span>
      )}
    </>
  )
}

/**
 * Einstieg in den Aufgaben-Baustein — bewusst NICHT mehr nur zwei
 * Verweis-Kacheln ohne eigenen Inhalt (das frühere "Klick auf Aufgaben im
 * Menü, dann noch mal klicken, um überhaupt etwas zu sehen" störte in der
 * Rückmeldung dazu). Der komplette Auftrags-Inhalt (Anlegen, "Dir
 * zugewiesen", "Aus Projekten zugewiesen", "Von dir vergeben") steht daher
 * direkt hier auf der Seite, die vom Kopfzeilenpunkt "Aufgaben" aus
 * erreicht wird (siehe src/lib/bausteine.ts) — es gibt keine eigene
 * /aufgaben/auftraege-Unterseite mehr dafür.
 *
 * Projekte (mehrere Beteiligte, Zeitstrahl) bleiben ein eigener Bereich
 * mit eigener Unterseite, weil sie fachlich klar getrennt sind, aber sie
 * bekommen dafür nur noch EINE schmale Verweis-Kachel "Meine Projekte" statt
 * einer gleichwertigen zweiten Kachel wie vorher — und die auch nur, wenn
 * die Person überhaupt etwas damit zu tun hat: schon Mitglied in einem
 * Projekt ist, oder mit der Berechtigung "Projektmanager" eins anlegen
 * darf. Die To-Do-Liste (rein persönlich) bleibt unverändert eine eigene
 * Kachel auf der Startseite und ein eigener Punkt im "Weiteres"-Menü.
 */
export default async function AufgabenSeite({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string }>
}) {
  const kontext = await berechtigung()
  const { fehler } = await searchParams

  const heute = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())

  const [
    { zugewiesenOffen, zugewiesenErledigt, vergebenOffen, vergebenErledigt },
    personen,
    projektAufgabenOffen,
    projekte,
  ] = await Promise.all([
    auftraegeFuerPerson(kontext.personId),
    prisma.person.findMany({
      where: { aktiv: true, benutzername: { not: kontext.personId } },
      orderBy: [{ nachname: "asc" }, { vorname: "asc" }],
      select: { benutzername: true, vorname: true, nachname: true },
    }),
    projektAufgabenFuerPerson(kontext.personId),
    projekteFuerPerson(kontext.personId),
  ])
  const personenAnzeige = personen.map((p) => ({ id: p.benutzername, name: `${p.vorname} ${p.nachname}` }))
  const zeigeProjekteKachel = projekte.length > 0 || kontext.berechtigungen.includes("Projektmanager")

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Kopfleiste name={kontext.name} />
      <h1 className="text-center text-2xl font-semibold text-marke-grau md:text-left">Aufgaben</h1>

      {zeigeProjekteKachel && (
        <Link
          href="/aufgaben/projekte"
          className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-x-neutral-200 border-b-neutral-200 border-t-4 border-t-marke-gruen bg-white p-4 shadow-sm transition hover:border-marke-gruen focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
        >
          <div>
            <h2 className="text-lg font-semibold text-marke-grau">Meine Projekte</h2>
            <p className="mt-1 text-sm text-neutral-500">Größere Vorhaben mit mehreren Beteiligten und Zeitstrahl.</p>
          </div>
          {projekte.length > 0 && (
            <span
              aria-label={`${projekte.length} eigene Projekte`}
              className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-marke-orange px-1 text-xs font-bold text-neutral-900"
            >
              {projekte.length}
            </span>
          )}
        </Link>
      )}

      {fehler && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700 md:text-left">
          {FEHLER_TEXTE[fehler] ?? "Das hat nicht geklappt."}
        </p>
      )}

      <form action={auftragErstellen} className="mt-6 flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <div>
          <label htmlFor="titel" className="block text-xs font-medium text-neutral-600">
            Neue Aufgabe
          </label>
          <input
            id="titel"
            name="titel"
            type="text"
            required
            className="mt-1 h-9 w-full rounded-lg border border-neutral-300 px-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="auftrag-zuweisen-suche" className="block text-xs font-medium text-neutral-600">
            Zuweisen an
          </label>
          <div className="mt-1.5">
            <PersonenAuswahl
              personen={personenAnzeige}
              ausgewaehlteIds={[]}
              name="zugewiesenAn"
              mehrfach={false}
              id="auftrag-zuweisen"
            />
          </div>
        </div>

        <details>
          <summary className="cursor-pointer text-xs font-medium text-marke-gruen-dunkel">
            + Weitere Optionen (Notizen, Fälligkeit, Priorität, Anhänge)
          </summary>

          <div className="mt-3 flex flex-col gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-600">Notizen (optional)</label>
              <div className="mt-1">
                <RichTextEditor name="beschreibung" defaultValue="" />
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="faelligAm" className="block text-xs font-medium text-neutral-600">
                  Fällig am
                </label>
                <input
                  id="faelligAm"
                  name="faelligAm"
                  type="date"
                  className="mt-1 h-9 rounded-lg border border-neutral-300 px-2 text-sm"
                />
              </div>

              <fieldset>
                <legend className="text-xs font-medium text-neutral-600">Priorität</legend>
                <div className="mt-1.5 flex gap-2">
                  {AUFGABE_PRIORITAETEN.map((prioritaet) => (
                    <label
                      key={prioritaet.wert}
                      className="flex cursor-pointer items-center gap-1.5"
                      title={prioritaet.name}
                    >
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
              <label htmlFor="geplantAm" className="block text-xs font-medium text-neutral-600">
                Geplant für (optional)
              </label>
              <input
                id="geplantAm"
                name="geplantAm"
                type="date"
                className="mt-1 h-9 rounded-lg border border-neutral-300 px-2 text-sm"
              />
              <p className="mt-1.5 text-xs text-neutral-500">Die zugewiesene Person sieht den Auftrag erst ab diesem Datum.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-600">Anhänge (Dokumente/Fotos)</label>
              <input
                type="file"
                name="anhaenge"
                multiple
                accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
                className="mt-1.5 w-full text-sm text-neutral-600 file:mr-3 file:h-8 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:text-sm file:font-medium file:text-neutral-700 hover:file:bg-neutral-200"
              />
            </div>
          </div>
        </details>

        <button
          type="submit"
          className="ml-auto h-9 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
        >
          Zuweisen
        </button>
      </form>

      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-marke-grau">Dir zugewiesen ({zugewiesenOffen.length})</h2>

        {zugewiesenOffen.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">Nichts Offenes.</p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-neutral-100">
            {zugewiesenOffen.map((auftrag) => (
              <li key={auftrag.id} className="flex items-start gap-3 py-2.5">
                {auftrag.status === "OFFEN" ? (
                  <form action={auftragAnnehmen.bind(null, auftrag.id)}>
                    <button
                      type="submit"
                      className="mt-0.5 h-7 shrink-0 rounded-lg bg-marke-orange/15 px-2.5 text-xs font-medium text-marke-grau transition hover:bg-marke-orange/25"
                    >
                      Annehmen
                    </button>
                  </form>
                ) : (
                  <form action={auftragErledigtSetzen.bind(null, auftrag.id, true)}>
                    <button
                      type="submit"
                      aria-label="Als erledigt markieren"
                      className="mt-0.5 h-5 w-5 shrink-0 rounded border-2 border-neutral-300 transition hover:border-marke-gruen"
                    />
                  </form>
                )}
                <div className="min-w-0 flex-1">
                  <AuftragInhalt
                    auftrag={auftrag}
                    heute={heute}
                    name={`von ${auftrag.erstelltVon.vorname} ${auftrag.erstelltVon.nachname}`}
                  />
                  <AnhaengeAnzeige auftragId={auftrag.id} anhaenge={auftrag.anhaenge} loeschbar={false} />
                  <AuftragKommentare
                    auftragId={auftrag.id}
                    kommentare={auftrag.kommentare}
                    kommentarAktion={auftragKommentarErstellen}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {zugewiesenErledigt.length > 0 && (
        <details className="mt-4 rounded-xl border border-neutral-200 bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold text-marke-grau">
            Dir zugewiesen, erledigt ({zugewiesenErledigt.length})
          </summary>
          <ul className="mt-3 flex flex-col divide-y divide-neutral-100">
            {zugewiesenErledigt.map((auftrag) => (
              <li key={auftrag.id} className="flex items-start gap-3 py-2.5">
                <form action={auftragErledigtSetzen.bind(null, auftrag.id, false)}>
                  <button
                    type="submit"
                    aria-label="Als offen markieren"
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-marke-gruen text-xs font-bold text-neutral-900"
                  >
                    ✓
                  </button>
                </form>
                <div className="min-w-0 flex-1">
                  <AuftragInhalt
                    auftrag={auftrag}
                    heute={heute}
                    name={`von ${auftrag.erstelltVon.vorname} ${auftrag.erstelltVon.nachname}`}
                  />
                  <AnhaengeAnzeige auftragId={auftrag.id} anhaenge={auftrag.anhaenge} loeschbar={false} />
                  <AuftragKommentare
                    auftragId={auftrag.id}
                    kommentare={auftrag.kommentare}
                    kommentarAktion={auftragKommentarErstellen}
                  />
                </div>
                <span className="mt-0.5 shrink-0 text-xs text-neutral-400">
                  {auftrag.erledigtAm && datumIsoAusDate(auftrag.erledigtAm)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {projektAufgabenOffen.length > 0 && (
        <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-marke-grau">
            Aus Projekten zugewiesen ({projektAufgabenOffen.length})
          </h2>
          <ul className="mt-3 flex flex-col divide-y divide-neutral-100">
            {projektAufgabenOffen.map((aufgabe) => {
              const faellig = faelligAnzeige(aufgabe, heute)
              return (
                <li key={aufgabe.id} className="flex items-start gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={
                          "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium " +
                          AUFGABE_STATUS_KLASSEN[aufgabe.status ?? "OFFEN"]
                        }
                      >
                        {AUFGABE_STATUS_NAMEN[aufgabe.status ?? "OFFEN"]}
                      </span>
                      <span className="text-sm text-neutral-800">{aufgabe.titel}</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-neutral-400">
                      {aufgabe.projekt?.titel}
                      {aufgabe.zwischenziel && ` · ${aufgabe.zwischenziel.titel}`}
                    </p>
                  </div>

                  {faellig && (
                    <span
                      className={
                        "mt-0.5 flex shrink-0 items-center gap-1 text-xs font-medium " +
                        (faellig.ueberfaellig ? "text-red-600" : "text-neutral-400")
                      }
                    >
                      {faellig.ueberfaellig && <span aria-hidden>⚠</span>}
                      {faellig.text}
                      {faellig.ueberfaellig && <span className="sr-only"> (überfällig)</span>}
                    </span>
                  )}

                  <Link
                    href={`/aufgaben/projekte/${aufgabe.projektId}`}
                    className="mt-0.5 shrink-0 text-xs font-medium text-marke-gruen-dunkel hover:underline"
                  >
                    Zum Projekt →
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-marke-grau">Von dir vergeben ({vergebenOffen.length})</h2>

        {vergebenOffen.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">Nichts Offenes.</p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-neutral-100">
            {vergebenOffen.map((auftrag) => (
              <li key={auftrag.id} className="flex items-start gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <AuftragInhalt
                    auftrag={auftrag}
                    heute={heute}
                    name={`an ${auftrag.zugewiesenAn.vorname} ${auftrag.zugewiesenAn.nachname}`}
                  />
                  <AnhaengeAnzeige auftragId={auftrag.id} anhaenge={auftrag.anhaenge} loeschbar />
                  <AuftragKommentare
                    auftragId={auftrag.id}
                    kommentare={auftrag.kommentare}
                    kommentarAktion={auftragKommentarErstellen}
                  />
                </div>
                <form action={auftragLoeschen.bind(null, auftrag.id)}>
                  <button
                    type="submit"
                    aria-label="Aufgabe zurückziehen"
                    className="mt-0.5 shrink-0 rounded p-1 text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    ×
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>

      {vergebenErledigt.length > 0 && (
        <details className="mt-4 rounded-xl border border-neutral-200 bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold text-marke-grau">
            Von dir vergeben, erledigt ({vergebenErledigt.length})
          </summary>
          <ul className="mt-3 flex flex-col divide-y divide-neutral-100">
            {vergebenErledigt.map((auftrag) => (
              <li key={auftrag.id} className="flex items-start gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <AuftragInhalt
                    auftrag={auftrag}
                    heute={heute}
                    name={`an ${auftrag.zugewiesenAn.vorname} ${auftrag.zugewiesenAn.nachname}`}
                  />
                  <AnhaengeAnzeige auftragId={auftrag.id} anhaenge={auftrag.anhaenge} loeschbar />
                  <AuftragKommentare
                    auftragId={auftrag.id}
                    kommentare={auftrag.kommentare}
                    kommentarAktion={auftragKommentarErstellen}
                  />
                </div>
                <span className="mt-0.5 shrink-0 text-xs text-neutral-400">
                  {auftrag.erledigtAm && datumIsoAusDate(auftrag.erledigtAm)}
                </span>
                <form action={auftragLoeschen.bind(null, auftrag.id)}>
                  <button
                    type="submit"
                    aria-label="Aufgabe löschen"
                    className="mt-0.5 shrink-0 rounded p-1 text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
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
