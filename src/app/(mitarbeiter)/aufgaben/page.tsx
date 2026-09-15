import Link from "next/link"
import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import { AuftragKommentare, type AuftragKommentarAnzeige } from "@/components/auftrag-kommentare"
import { AuftragErstellenDialog } from "@/components/auftrag-erstellen-dialog"
import { auftragZuStandardwerte } from "@/components/auftrag-form-felder"
import { auftraegeFuerPerson, alleOffenenAuftraege, eigeneAuftragEntwuerfe } from "@/lib/auftraege/abfragen"
import {
  projektAufgabenFuerPerson,
  alleOffenenProjektAufgaben,
  projekteFuerPerson,
  alleProjekte,
} from "@/lib/projekte/abfragen"
import {
  auftragErstellen,
  auftragAlsEntwurfSpeichern,
  auftragEntwurfAktualisieren,
  auftragEntwurfFinalisieren,
  auftragAnnehmen,
  auftragErledigtSetzen,
  auftragLoeschen,
  auftragAnhangLoeschen,
  auftragKommentarErstellen,
} from "@/lib/auftraege/aktionen"
import { AUFGABE_PRIORITAET_KLASSEN, AUFGABE_PRIORITAET_NAMEN } from "@/lib/aufgaben-optionen"
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
          className="flex items-center gap-1 rounded-full bg-flaeche-100 py-0.5 pr-1 pl-2 text-xs text-primaer"
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
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-tertiaer hover:bg-flaeche hover:text-red-600"
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
          <span className={"text-sm text-primaer" + (auftrag.erledigtAm ? " text-tertiaer line-through" : "")}>
            {auftrag.titel}
          </span>
          <span
            className={"shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium " + AUFGABE_STATUS_KLASSEN[auftrag.status]}
          >
            {AUFGABE_STATUS_NAMEN[auftrag.status]}
          </span>
          {name && <span className="text-xs text-tertiaer">({name})</span>}
        </div>
        {auftrag.beschreibung && (
          <p className="mt-0.5 truncate text-xs text-tertiaer">{richTextZuText(auftrag.beschreibung)}</p>
        )}
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
  searchParams: Promise<{ fehler?: string; neu?: string }>
}) {
  const kontext = await berechtigung()
  const { fehler, neu } = await searchParams

  const heute = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())

  const [
    eigeneAuftraege,
    firmenweiteAuftraege,
    entwuerfe,
    personen,
    eigeneProjektAufgabenOffen,
    firmenweiteProjektAufgabenOffen,
    projekte,
  ] = await Promise.all([
    kontext.adminModusAktiv ? Promise.resolve(null) : auftraegeFuerPerson(kontext.personId),
    kontext.adminModusAktiv ? alleOffenenAuftraege() : Promise.resolve(null),
    eigeneAuftragEntwuerfe(kontext.personId),
    prisma.person.findMany({
      where: { aktiv: true, benutzername: { not: kontext.personId } },
      orderBy: [{ nachname: "asc" }, { vorname: "asc" }],
      select: { benutzername: true, vorname: true, nachname: true },
    }),
    kontext.adminModusAktiv ? Promise.resolve(null) : projektAufgabenFuerPerson(kontext.personId),
    kontext.adminModusAktiv ? alleOffenenProjektAufgaben() : Promise.resolve(null),
    kontext.adminModusAktiv ? alleProjekte() : projekteFuerPerson(kontext.personId),
  ])
  const { zugewiesenOffen, zugewiesenErledigt, vergebenOffen, vergebenErledigt } = eigeneAuftraege ?? {
    zugewiesenOffen: [],
    zugewiesenErledigt: [],
    vergebenOffen: [],
    vergebenErledigt: [],
  }
  const projektAufgabenOffen = eigeneProjektAufgabenOffen ?? []
  const personenAnzeige = personen.map((p) => ({ id: p.benutzername, name: `${p.vorname} ${p.nachname}` }))
  const zeigeProjekteKachel = projekte.length > 0 || kontext.berechtigungen.includes("Projektmanager")

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Kopfleiste />
      <h1 className="text-center text-2xl font-semibold text-ueberschrift md:text-left">Aufgaben</h1>

      {zeigeProjekteKachel && (
        <Link
          href="/aufgaben/projekte"
          className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-gruen bg-flaeche p-4 shadow-sm transition hover:border-marke-gruen focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
        >
          <div>
            <h2 className="text-lg font-semibold text-ueberschrift">
              {kontext.adminModusAktiv ? "Alle Projekte (Firma)" : "Meine Projekte"}
            </h2>
            <p className="mt-1 text-sm text-sekundaer">Größere Vorhaben mit mehreren Beteiligten und Zeitstrahl.</p>
          </div>
          {projekte.length > 0 && (
            <span
              aria-label={`${projekte.length} ${kontext.adminModusAktiv ? "Projekte in der Firma" : "eigene Projekte"}`}
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

      {!kontext.adminModusAktiv && (
      <>
      <div className="mt-6 rounded-xl border border-rand bg-flaeche p-4">
        <h2 className="text-sm font-semibold text-ueberschrift">Dir zugewiesen ({zugewiesenOffen.length})</h2>

        {zugewiesenOffen.length === 0 ? (
          <p className="mt-3 text-sm text-sekundaer">Nichts Offenes.</p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-flaeche-100">
            {zugewiesenOffen.map((auftrag) => (
              <li key={auftrag.id} className="flex items-start gap-3 py-2.5">
                {auftrag.status === "OFFEN" ? (
                  <form action={auftragAnnehmen.bind(null, auftrag.id)}>
                    <button
                      type="submit"
                      className="mt-0.5 h-7 shrink-0 rounded-lg bg-marke-orange/15 px-2.5 text-xs font-medium text-ueberschrift transition hover:bg-marke-orange/25"
                    >
                      Annehmen
                    </button>
                  </form>
                ) : (
                  <form action={auftragErledigtSetzen.bind(null, auftrag.id, true)}>
                    <button
                      type="submit"
                      aria-label="Als erledigt markieren"
                      className="mt-0.5 h-5 w-5 shrink-0 rounded border-2 border-flaeche-300 transition hover:border-marke-gruen"
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
        <details className="mt-4 rounded-xl border border-rand bg-flaeche p-4">
          <summary className="cursor-pointer text-sm font-semibold text-ueberschrift">
            Dir zugewiesen, erledigt ({zugewiesenErledigt.length})
          </summary>
          <ul className="mt-3 flex flex-col divide-y divide-flaeche-100">
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
                <span className="mt-0.5 shrink-0 text-xs text-tertiaer">
                  {auftrag.erledigtAm && datumIsoAusDate(auftrag.erledigtAm)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {projektAufgabenOffen.length > 0 && (
        <div className="mt-4 rounded-xl border border-rand bg-flaeche p-4">
          <h2 className="text-sm font-semibold text-ueberschrift">
            Aus Projekten zugewiesen ({projektAufgabenOffen.length})
          </h2>
          <ul className="mt-3 flex flex-col divide-y divide-flaeche-100">
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
                      <span className="text-sm text-primaer">{aufgabe.titel}</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-tertiaer">
                      {aufgabe.projekt?.titel}
                      {aufgabe.zwischenziel && ` · ${aufgabe.zwischenziel.titel}`}
                    </p>
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

      <div className="mt-6 rounded-xl border border-rand bg-flaeche p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-ueberschrift">Von dir vergeben ({vergebenOffen.length})</h2>
          <AuftragErstellenDialog
            personen={personenAnzeige}
            erstellenAktion={auftragErstellen}
            entwurfSpeichernAktion={auftragAlsEntwurfSpeichern}
            autoOeffnen={neu === "1"}
          />
        </div>

        {entwuerfe.length > 0 && (
          <ul className="mt-3 flex flex-col divide-y divide-flaeche-100 rounded-lg bg-marke-orange/5">
            {entwuerfe.map((entwurf) => (
              <li key={entwurf.id} className="flex items-center justify-between gap-3 px-2 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm text-primaer">{entwurf.titel || "Entwurf ohne Titel"}</p>
                  <span className="rounded-full bg-marke-orange/15 px-1.5 py-0.5 text-[11px] font-medium text-marke-orange">
                    Entwurf
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <AuftragErstellenDialog
                    personen={personenAnzeige}
                    erstellenAktion={auftragEntwurfFinalisieren.bind(null, entwurf.id)}
                    entwurfSpeichernAktion={auftragEntwurfAktualisieren.bind(null, entwurf.id)}
                    entwurf={{ id: entwurf.id, standardwerte: auftragZuStandardwerte(entwurf) }}
                  />
                  <form action={auftragLoeschen.bind(null, entwurf.id)}>
                    <button type="submit" className="text-xs text-tertiaer hover:text-red-600">
                      Löschen
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        {vergebenOffen.length === 0 ? (
          <p className="mt-3 text-sm text-sekundaer">Nichts Offenes.</p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-flaeche-100">
            {vergebenOffen.map((auftrag) => (
              <li key={auftrag.id} className="flex items-start gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  {/* auftraegeFuerPerson schließt Entwürfe aus (istEntwurf: false) — zugewiesenAn ist hier immer gesetzt. */}
                  <AuftragInhalt
                    auftrag={auftrag}
                    heute={heute}
                    name={`an ${auftrag.zugewiesenAn!.vorname} ${auftrag.zugewiesenAn!.nachname}`}
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
                    className="mt-0.5 shrink-0 rounded p-1 text-tertiaer transition hover:bg-red-50 hover:text-red-600"
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
        <details className="mt-4 rounded-xl border border-rand bg-flaeche p-4">
          <summary className="cursor-pointer text-sm font-semibold text-ueberschrift">
            Von dir vergeben, erledigt ({vergebenErledigt.length})
          </summary>
          <ul className="mt-3 flex flex-col divide-y divide-flaeche-100">
            {vergebenErledigt.map((auftrag) => (
              <li key={auftrag.id} className="flex items-start gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <AuftragInhalt
                    auftrag={auftrag}
                    heute={heute}
                    name={`an ${auftrag.zugewiesenAn!.vorname} ${auftrag.zugewiesenAn!.nachname}`}
                  />
                  <AnhaengeAnzeige auftragId={auftrag.id} anhaenge={auftrag.anhaenge} loeschbar />
                  <AuftragKommentare
                    auftragId={auftrag.id}
                    kommentare={auftrag.kommentare}
                    kommentarAktion={auftragKommentarErstellen}
                  />
                </div>
                <span className="mt-0.5 shrink-0 text-xs text-tertiaer">
                  {auftrag.erledigtAm && datumIsoAusDate(auftrag.erledigtAm)}
                </span>
                <form action={auftragLoeschen.bind(null, auftrag.id)}>
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
      </>
      )}

      {kontext.adminModusAktiv && (
        <>
          <div className="mt-6 rounded-xl border border-rand bg-flaeche p-4">
            <h2 className="text-sm font-semibold text-ueberschrift">
              Alle offenen Aufgaben (Firma) ({firmenweiteAuftraege?.length ?? 0})
            </h2>
            {!firmenweiteAuftraege || firmenweiteAuftraege.length === 0 ? (
              <p className="mt-3 text-sm text-sekundaer">Aktuell keine offenen Aufgaben.</p>
            ) : (
              <ul className="mt-3 flex flex-col divide-y divide-flaeche-100">
                {firmenweiteAuftraege.map((auftrag) => (
                  <li key={auftrag.id} className="flex items-start gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <AuftragInhalt
                        auftrag={auftrag}
                        heute={heute}
                        name={`${auftrag.erstelltVon.vorname} ${auftrag.erstelltVon.nachname} → ${auftrag.zugewiesenAn!.vorname} ${auftrag.zugewiesenAn!.nachname}`}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {firmenweiteProjektAufgabenOffen && firmenweiteProjektAufgabenOffen.length > 0 && (
            <div className="mt-4 rounded-xl border border-rand bg-flaeche p-4">
              <h2 className="text-sm font-semibold text-ueberschrift">
                Alle offenen Projekt-Aufgaben (Firma) ({firmenweiteProjektAufgabenOffen.length})
              </h2>
              <ul className="mt-3 flex flex-col divide-y divide-flaeche-100">
                {firmenweiteProjektAufgabenOffen.map((aufgabe) => {
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
                          <span className="text-sm text-primaer">{aufgabe.titel}</span>
                          <span className="text-xs text-tertiaer">
                            ({aufgabe.zugewiesenAn ? `${aufgabe.zugewiesenAn.vorname} ${aufgabe.zugewiesenAn.nachname}` : "niemand zugewiesen"})
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-tertiaer">
                          {aufgabe.projekt?.titel}
                          {aufgabe.zwischenziel && ` · ${aufgabe.zwischenziel.titel}`}
                        </p>
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
        </>
      )}

      <ZurueckButton />
    </main>
  )
}
