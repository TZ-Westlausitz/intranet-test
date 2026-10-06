import Link from "next/link"
import { AlertTriangle, Check, ListChecks, MessageCircle, Paperclip } from "lucide-react"
import { berechtigung } from "@/lib/auth/berechtigung"
import { FormularAenderungenSchutz } from "@/components/formular-aenderungen-schutz"
import { prisma } from "@/lib/db"
import { ZurueckButton } from "@/components/zurueck-button"
import type { AuftragKommentarAnzeige } from "@/components/auftrag-kommentare"
import { AuftragDialog } from "@/components/auftrag-dialog"
import { empfaengerNamen, type EmpfaengerZeile } from "@/lib/auftraege/empfaenger"
import { AuftragErstellenDialog } from "@/components/auftrag-erstellen-dialog"
import { ZielHervorheben } from "@/components/ziel-hervorheben"
import { auftragZuStandardwerte } from "@/lib/auftraege/standardwerte"
import { AufgabeFormFelder, LEERE_AUFGABE_STANDARDWERTE, aufgabeZuStandardwerte } from "@/components/aufgabe-form-felder"
import { AufgabeBearbeitenDialog } from "@/components/aufgabe-bearbeiten-dialog"
import { auftraegeFuerPerson, alleOffenenAuftraege, eigeneAuftragEntwuerfe } from "@/lib/auftraege/abfragen"
import { aufgabenFuerPerson } from "@/lib/aufgaben/abfragen"
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
  auftragAktualisieren,
  auftragKommentarErstellen,
  auftragCheckpunktSetzen,
} from "@/lib/auftraege/aktionen"
import {
  aufgabeErstellen,
  aufgabeAktualisieren,
  aufgabeErledigtSetzen,
  aufgabeLoeschen,
  aufgabeAnhangLoeschen,
} from "@/lib/aufgaben/aktionen"
import { AUFGABE_PRIORITAET_KLASSEN, AUFGABE_PRIORITAET_NAMEN } from "@/lib/aufgaben-optionen"
import { AUFGABE_STATUS_KLASSEN, AUFGABE_STATUS_NAMEN } from "@/lib/projekte-optionen"
import { richTextZuText } from "@/lib/rich-text"
import { datumIsoAusDate, formatiereDatumAusDate, berlinerTagesbeginn } from "@/lib/datum"
import { verwendbareAufgabenVorlagen } from "@/lib/aufgaben-vorlagen/abfragen"
import { darfAufgabenVorlagenVerwalten } from "@/lib/aufgaben-vorlagen/sichtbarkeit"
import { AufgabenVorlageAuswahlFeld } from "@/components/aufgaben-vorlage-auswahl-feld"

type Ansicht = "aufgaben" | "todos"

const FEHLER_TEXTE: Record<string, string> = {
  pflichtfeld: "Bitte einen Titel eintragen und eine Person auswählen.",
  todoPflichtfeld: "Bitte einen Titel eingeben.",
  selbstauftrag: "An dich selbst geht das nicht — dafür gibt es die To-Do-Liste.",
  zuGross: "Eine Datei ist zu groß (maximal 15 MB je Anhang).",
  typUngueltig: "Nicht unterstützter Dateityp. Erlaubt sind PDF und Fotos (JPG, PNG, WEBP, HEIC).",
}

type AnhangAnzeige = { id: string; dateiname: string; groesseBytes: number; mimetyp: string }

/** Anhänge einer To-Do-Zeile — nur Ansehen, Hinzufügen/Löschen läuft über das Bearbeiten-Pop-Up (siehe AnhaengeAnzeige für Aufträge, eigene Variante wegen anderer API-Route). */
function AufgabeAnhaengeAnzeige({ aufgabeId, anhaenge }: { aufgabeId: string; anhaenge: AnhangAnzeige[] }) {
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
          <Paperclip className="h-3.5 w-3.5 shrink-0" aria-hidden /> {anhang.dateiname}
        </a>
      ))}
    </div>
  )
}

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
  checkpunkte: { id: string; text: string; erledigtAm: Date | null }[]
  empfaenger: EmpfaengerZeile[]
}

function faelligAnzeige(auftrag: { faelligAm: Date | null; erledigtAm: Date | null }, heute: Date) {
  if (!auftrag.faelligAm) return null
  const ueberfaellig = !auftrag.erledigtAm && auftrag.faelligAm < heute
  return {
    text: auftrag.faelligAm.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin", weekday: "short", day: "2-digit", month: "2-digit" }),
    ueberfaellig,
  }
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
        {(auftrag.anhaenge.length > 0 || auftrag.kommentare.length > 0 || auftrag.checkpunkte.length > 0) && (
          <div className="mt-1 flex items-center gap-3 text-[11px] text-tertiaer">
            {auftrag.checkpunkte.length > 0 && (
              <span className="flex items-center gap-0.5" title="Checkliste">
                <ListChecks className="h-3 w-3" aria-hidden /> {auftrag.checkpunkte.filter((punkt) => punkt.erledigtAm).length}/
                {auftrag.checkpunkte.length}
              </span>
            )}
            {auftrag.anhaenge.length > 0 && (
              <span className="flex items-center gap-0.5" title="Anhänge">
                <Paperclip className="h-3 w-3" aria-hidden /> {auftrag.anhaenge.length}
              </span>
            )}
            {auftrag.kommentare.length > 0 && (
              <span className="flex items-center gap-0.5" title="Kommentare">
                <MessageCircle className="h-3 w-3" aria-hidden /> {auftrag.kommentare.length}
              </span>
            )}
          </div>
        )}
      </div>

      {faellig && (
        <span
          className={
            "mt-0.5 flex shrink-0 items-center gap-1 text-xs font-medium " +
            (faellig.ueberfaellig ? "text-red-600" : "text-tertiaer")
          }
        >
          {faellig.ueberfaellig && <AlertTriangle className="h-3.5 w-3.5" aria-hidden />}
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
 * darf.
 *
 * Die persönliche To-Do-Liste (Model Aufgabe, `personId` gesetzt statt
 * Projekt-Bezug) ist seit 2026-09-23 ebenfalls direkt hier als eigene
 * Sektion eingebunden (vorher eigene Unterseite `/aufgaben/todos`,
 * inzwischen nur noch ein Redirect dorthin) — Rückmeldung: ohne die
 * Berechtigung "Aufgaben", ohne Projekt und ohne zugewiesenen Auftrag war
 * die Seite sonst fast leer. Startseiten-Kachel und "Weiteres"-Menüpunkt
 * "To-Do-Liste" zeigen jetzt ebenfalls hierher statt auf die alte
 * Unterseite.
 *
 * Zwei- ODER Drei-Spalten-Layout ab `md:` (Rückmeldung 2026-09-23: vier
 * gestapelte Karten auf einer Seite wirkten unübersichtlich), je nachdem,
 * ob die Person selbst Aufträge vergeben darf (`darfAuftraegeZuweisen`,
 * Berechtigung "Aufgaben") — Rückmeldung 2026-09-29:
 *
 * - Mit der Berechtigung DREI Spalten: 1. "Von dir vergeben" (Delegation),
 *   2. "Dir zugewiesen" + "Aus Projekten zugewiesen" (was die Person
 *   bekommt), 3. "Meine To-Dos" (rein persönlich) — jedes Thema eine
 *   eigene Spalte, `md:max-w-6xl` breit für den zusätzlichen Platz.
 * - Ohne die Berechtigung bleibt es bei ZWEI Spalten wie zuvor: links
 *   "Dir zugewiesen" + "Aus Projekten zugewiesen", rechts "Meine To-Dos"
 *   (+ "Von dir vergeben", falls trotz fehlender Berechtigung noch alte
 *   vergebene Aufträge/Entwürfe existieren — siehe blockVonDirVergeben),
 *   `md:max-w-4xl` breit.
 *
 * Die einzelnen Karten stehen dafür als JSX-Bausteine (blockDirZugewiesen
 * usw.) VOR dem return und werden je nach Spaltenzahl nur unterschiedlich
 * auf die Spalten verteilt, nicht dupliziert — bewusst EIN Grid mit
 * CSS-Breakpoints statt mehrerer komplett getrennter `<main>`-Bäume wie
 * bei /formulare: Diese Seite hat ein `autoOeffnen`-Dialog
 * (AuftragErstellenDialog), und mehrere parallel im DOM stehende Kopien
 * davon hätten dasselbe Doppel-Dialog-Problem wie seinerzeit bei der
 * Kontaktstelle (siehe Memory kontaktstelle-meldestelle-baustein) — ein
 * einziger Baum mit reinem CSS-Umbruch vermeidet das von vornherein.
 *
 * Auf dem Handy (Rückmeldung 2026-10-01, dasselbe Vorbild wie bei
 * /formulare) deshalb KEIN zweiter Baum, sondern ein Tab-Umschalter
 * (Aufgaben/To-Dos/Meine Projekte) über `?ansicht=`, der die ohnehin
 * vorhandenen Spalten-Bausteine innerhalb des einen Grids per
 * `hidden md:flex` (ganze Spalte) bzw. `md:contents` (einzelner Block
 * innerhalb einer gemischten Spalte wie "Meine To-Dos" + "Von dir
 * vergeben" im Zweispalten-Fall) ein-/ausblendet. Jeder Block bleibt
 * dabei exakt einmal im DOM, nur seine CSS-Sichtbarkeit ändert sich nach
 * Breakpoint und `ansicht`. Ab `md:` ignorieren alle diese Klassen
 * `ansicht` und zeigen wieder alles gleichzeitig — die Spalten-Aufteilung
 * selbst bleibt unverändert.
 *
 * Der Admin-Modus (eigene, firmenweite Übersicht statt der persönlichen
 * Spalten) ist davon unabhängig, bekommt keine Tabs und bleibt bei seiner
 * eigenen Zweispalten-Logik (`seiteZweispaltig`, prüft nur, ob die zweite
 * Firmenkarte etwas zu zeigen hat).
 */
export default async function AufgabenSeite({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string; neu?: string; auftrag?: string; ansicht?: string; vorlage?: string }>
}) {
  const kontext = await berechtigung()
  const { fehler, neu, auftrag: zielAuftragId, ansicht: ansichtParam, vorlage: vorlageParam } = await searchParams
  const darfAuftraegeZuweisenVorab = kontext.berechtigungen.includes("Aufgaben")

  const heute = berlinerTagesbeginn()

  const [
    eigeneAuftraege,
    firmenweiteAuftraege,
    entwuerfe,
    personen,
    eigeneProjektAufgabenOffen,
    firmenweiteProjektAufgabenOffen,
    projekte,
    eigeneAufgaben,
    aufgabenVorlagen,
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
    kontext.adminModusAktiv ? Promise.resolve(null) : aufgabenFuerPerson(kontext.personId),
    darfAuftraegeZuweisenVorab ? verwendbareAufgabenVorlagen(kontext) : Promise.resolve([]),
  ])
  const { zugewiesenOffen, zugewiesenErledigt, vergebenOffen, vergebenErledigt } = eigeneAuftraege ?? {
    zugewiesenOffen: [],
    zugewiesenErledigt: [],
    vergebenOffen: [],
    vergebenErledigt: [],
  }
  const projektAufgabenOffen = eigeneProjektAufgabenOffen ?? []
  const { offen: todosOffen, erledigt: todosErledigt } = eigeneAufgaben ?? { offen: [], erledigt: [] }
  const personenAnzeige = personen.map((p) => ({ id: p.benutzername, name: `${p.vorname} ${p.nachname}` }))
  const zeigeProjekteKachel = projekte.length > 0 || kontext.berechtigungen.includes("Projektmanager")
  const darfAuftraegeZuweisen = darfAuftraegeZuweisenVorab
  const darfVorlagenVerwalten = darfAufgabenVorlagenVerwalten(kontext)
  // Vorlagen-Auswahl im To-do-Formular (Rückmeldung 2026-10-01: dort NUR
  // mit der Berechtigung "Aufgaben", obwohl das Anlegen eines To-dos
  // selbst für alle offen ist — Vorlagen bleiben bewusst an dieselbe
  // Berechtigung gekoppelt wie beim Auftrag-Zuweisen, keine zweite,
  // laxere Schwelle). `vorlage`-Query-Parameter statt Dialog-State: das
  // To-do-Formular ist inline auf der Seite, kein Pop-up wie bei
  // AuftragErstellenDialog — derselbe Mechanismus wie `?ansicht=` oben.
  const gewaehlteAufgabenVorlage = darfAuftraegeZuweisenVorab
    ? (aufgabenVorlagen.find((v) => v.id === vorlageParam) ?? null)
    : null
  // Für die Admin-Modus-Übersicht (zwei firmenweite Karten statt zwei
  // persönlicher Spalten) bestimmt das weiterhin, ob die zweite Karte
  // überhaupt etwas zu zeigen hat — die persönliche Ansicht ist dagegen
  // immer zweispaltig, siehe Doku-Kommentar oben.
  const zweiteFirmenkarteHatInhalt = (firmenweiteProjektAufgabenOffen?.length ?? 0) > 0
  const seiteZweispaltig = kontext.adminModusAktiv ? zweiteFirmenkarteHatInhalt : true
  // Persönliche Ansicht: drei Spalten, sobald die Person selbst Aufträge
  // vergeben darf (eigene Spalte "Von dir vergeben" statt in "Meine
  // To-Dos" mit eingesammelt), sonst wie bisher zwei — siehe Doku-Kommentar
  // oben.
  const persoenlicheMaxBreite = darfAuftraegeZuweisen ? " md:max-w-6xl" : " md:max-w-4xl"

  // Tab-Umschalter auf dem Handy (Rückmeldung 2026-10-01, dasselbe Muster
  // wie /formulare) — NUR für die persönliche Ansicht, der Admin-Modus
  // bleibt bei seiner eigenen, einfachen Firmenweite-Übersicht. Wichtig:
  // anders als bei /formulare gibt es hier NICHT zwei getrennte
  // Mobile/Desktop-Bäume (siehe Doku-Kommentar oben,
  // AuftragErstellenDialog-Problem) — die Tabs blenden stattdessen
  // Abschnitte INNERHALB des einen Grids per CSS aus (`hidden md:flex`
  // bzw. `md:contents`), jeder Block bleibt genau einmal im DOM.
  //
  // "Meine Projekte" ist bewusst KEIN dritter Reiter mit eigenem
  // `ansicht`-Zustand (Rückmeldung 2026-10-01: "gleich auf die
  // Projektseite weiterleiten, die Seite dazwischen rausnehmen") —
  // Projekte sind ein eigener Bereich mit eigener Unterseite, kein
  // Abschnitt dieser Seite. Der dritte Tab ist deshalb ein normaler Link
  // auf /aufgaben/projekte, kein `?ansicht=`-Link (siehe JSX unten).
  const ansichten: { key: Ansicht; label: string }[] = [
    { key: "aufgaben", label: "Aufgaben" },
    { key: "todos", label: "To-Dos" },
  ]
  const ansicht: Ansicht = ansichten.some((tab) => tab.key === ansichtParam) ? (ansichtParam as Ansicht) : "aufgaben"

  // Die drei/zwei Spalten-Bausteine der persönlichen Ansicht als JSX-Werte
  // statt inline im Grid — so werden sie je nach darfAuftraegeZuweisen nur
  // unterschiedlich auf die Spalten verteilt (siehe Doku-Kommentar oben),
  // ohne dass die Karten selbst dupliziert werden müssten.
  // Eine Aufgaben-Zeile als Pop-Up-Auslöser (siehe AuftragDialog): Klick auf
  // die Zeile öffnet alle Details, Kommentare und — für die erstellende
  // Person — das Bearbeiten. `?auftrag=<id>` (Benachrichtigung, Startseiten-
  // Kachel) öffnet das Pop-Up gleich beim Laden der Seite.
  const auftragZeile = (
    auftrag: AuftragMitBeziehung,
    art: "zugewiesen" | "vergeben",
    vonName: string,
    anName: string,
    anzeigeName: string,
  ) => {
    const faellig = faelligAnzeige(auftrag, heute)
    return (
      <AuftragDialog
        daten={{
          id: auftrag.id,
          titel: auftrag.titel,
          beschreibung: auftrag.beschreibung,
          prioritaet: auftrag.prioritaet,
          status: auftrag.status,
          faelligAm: auftrag.faelligAm ? datumIsoAusDate(auftrag.faelligAm) : null,
          faelligText: faellig?.text ?? null,
          ueberfaellig: faellig?.ueberfaellig ?? false,
          erledigtText: auftrag.erledigtAm ? formatiereDatumAusDate(auftrag.erledigtAm) : null,
          vonName,
          anName,
          gemeinsam: auftrag.empfaenger.length > 1,
          anhaenge: auftrag.anhaenge,
          checkpunkte: auftrag.checkpunkte.map((punkt) => ({ id: punkt.id, text: punkt.text, erledigt: punkt.erledigtAm !== null })),
          kommentare: auftrag.kommentare,
        }}
        alsErsteller={art === "vergeben"}
        alsZugewiesener={art === "zugewiesen"}
        autoOeffnen={zielAuftragId === auftrag.id}
        annehmenAktion={auftragAnnehmen}
        erledigtAktion={auftragErledigtSetzen}
        loeschenAktion={auftragLoeschen}
        aktualisierenAktion={auftragAktualisieren}
        anhangLoeschenAktion={auftragAnhangLoeschen}
        kommentarAktion={auftragKommentarErstellen}
        checkpunktAktion={auftragCheckpunktSetzen}
      >
        <AuftragInhalt auftrag={auftrag} heute={heute} name={anzeigeName} />
      </AuftragDialog>
    )
  }

  const blockDirZugewiesen = (
    <>
      <div className="rounded-xl border border-rand bg-flaeche p-4">
        <div className="flex items-center justify-between gap-1.5">
          <h2 className="text-sm font-semibold text-ueberschrift">Dir zugewiesen</h2>
          {zugewiesenOffen.length > 0 && (
            <span
              aria-label={`${zugewiesenOffen.length} dir zugewiesen`}
              className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-marke-orange px-1 text-xs font-bold text-neutral-900"
            >
              {zugewiesenOffen.length}
            </span>
          )}
        </div>

        {zugewiesenOffen.length === 0 ? (
          <p className="mt-3 text-sm text-sekundaer">Nichts Offenes.</p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-flaeche-100">
            {zugewiesenOffen.map((auftrag) => (
              <li key={auftrag.id} data-ziel={auftrag.id} className="flex items-start gap-3 py-2.5">
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
                {auftragZeile(auftrag, "zugewiesen", `${auftrag.erstelltVon.vorname} ${auftrag.erstelltVon.nachname}`, empfaengerNamen(auftrag.empfaenger, kontext.personId), `von ${auftrag.erstelltVon.vorname} ${auftrag.erstelltVon.nachname}`)}
              </li>
            ))}
          </ul>
        )}
      </div>

      {zugewiesenErledigt.length > 0 && (
        <details className="rounded-xl border border-rand bg-flaeche p-4">
          <summary className="cursor-pointer text-sm font-semibold text-ueberschrift">
            Dir zugewiesen, erledigt ({zugewiesenErledigt.length})
          </summary>
          <ul className="mt-3 flex flex-col divide-y divide-flaeche-100">
            {zugewiesenErledigt.map((auftrag) => (
              <li key={auftrag.id} data-ziel={auftrag.id} className="flex items-start gap-3 py-2.5">
                <form action={auftragErledigtSetzen.bind(null, auftrag.id, false)}>
                  <button
                    type="submit"
                    aria-label="Als offen markieren"
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-marke-gruen text-neutral-900"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                </form>
                {auftragZeile(auftrag, "zugewiesen", `${auftrag.erstelltVon.vorname} ${auftrag.erstelltVon.nachname}`, empfaengerNamen(auftrag.empfaenger, kontext.personId), `von ${auftrag.erstelltVon.vorname} ${auftrag.erstelltVon.nachname}`)}
                <span className="mt-0.5 shrink-0 text-xs text-tertiaer">
                  {auftrag.erledigtAm && datumIsoAusDate(auftrag.erledigtAm)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  )

  const blockAusProjekten = projektAufgabenOffen.length > 0 && (
    <div className="rounded-xl border border-rand bg-flaeche p-4">
      <div className="flex items-center justify-between gap-1.5">
        <h2 className="text-sm font-semibold text-ueberschrift">Aus Projekten zugewiesen</h2>
        <span
          aria-label={`${projektAufgabenOffen.length} aus Projekten zugewiesen`}
          className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-marke-orange px-1 text-xs font-bold text-neutral-900"
        >
          {projektAufgabenOffen.length}
        </span>
      </div>
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
                  {faellig.ueberfaellig && <AlertTriangle className="h-3.5 w-3.5" aria-hidden />}
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
  )

  const blockMeineTodos = (
    <>
      <div className="rounded-xl border border-rand bg-flaeche p-4">
        <div className="flex items-center justify-between gap-1.5">
          <h2 className="text-sm font-semibold text-ueberschrift">Meine To-Dos</h2>
          {todosOffen.length > 0 && (
            <span
              aria-label={`${todosOffen.length} offene To-Dos`}
              className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-marke-orange px-1 text-xs font-bold text-neutral-900"
            >
              {todosOffen.length}
            </span>
          )}
        </div>

        {darfAuftraegeZuweisenVorab && aufgabenVorlagen.length > 0 && (
          <div className="mt-3">
            <AufgabenVorlageAuswahlFeld
              vorlagen={aufgabenVorlagen}
              ausgewaehlteVorlageId={vorlageParam ?? ""}
              ansicht={ansicht}
            />
          </div>
        )}
        <form
          action={aufgabeErstellen}
          className="mt-3 flex flex-col gap-3 rounded-lg border border-flaeche-100 bg-flaeche-schwach p-3"
        >
          <AufgabeFormFelder
            key={vorlageParam ?? ""}
            standardwerte={
              gewaehlteAufgabenVorlage
                ? {
                    ...LEERE_AUFGABE_STANDARDWERTE,
                    titel: gewaehlteAufgabenVorlage.titel,
                    beschreibung: gewaehlteAufgabenVorlage.beschreibung ?? "",
                    prioritaet: gewaehlteAufgabenVorlage.prioritaet,
                    faelligAm: gewaehlteAufgabenVorlage.faelligAm ?? "",
                  }
                : LEERE_AUFGABE_STANDARDWERTE
            }
          />
          <button
            type="submit"
            className="ml-auto h-9 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
          >
            Hinzufügen
          </button>
          <FormularAenderungenSchutz />
        </form>

        {todosOffen.length === 0 ? (
          <p className="mt-3 text-sm text-sekundaer">Keine offenen To-Dos.</p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-flaeche-100">
            {todosOffen.map((aufgabe) => {
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

                  <AufgabeBearbeitenDialog
                    aufgabeId={aufgabe.id}
                    standardwerte={standardwerte}
                    bestehendeAnhaenge={aufgabe.anhaenge}
                    aktualisierenAktion={aufgabeAktualisieren}
                    anhangLoeschenAktion={aufgabeAnhangLoeschen}
                  >
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
                          <p className="mt-0.5 truncate text-xs text-tertiaer">{richTextZuText(aufgabe.beschreibung)}</p>
                        )}
                        {aufgabe.anhaenge.length > 0 && (
                          <span className="mt-1 flex items-center gap-0.5 text-[11px] text-tertiaer" title="Anhänge">
                            <Paperclip className="h-3 w-3" aria-hidden /> {aufgabe.anhaenge.length}
                          </span>
                        )}
                      </div>

                      {faellig && (
                        <span
                          className={
                            "mt-0.5 flex shrink-0 items-center gap-1 text-xs font-medium " +
                            (faellig.ueberfaellig ? "text-red-600" : "text-tertiaer")
                          }
                        >
                          {faellig.ueberfaellig && <AlertTriangle className="h-3.5 w-3.5" aria-hidden />}
                          {faellig.text}
                          {faellig.ueberfaellig && <span className="sr-only"> (überfällig)</span>}
                        </span>
                      )}
                  </AufgabeBearbeitenDialog>

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

      {todosErledigt.length > 0 && (
        <details className="rounded-xl border border-rand bg-flaeche p-4">
          <summary className="cursor-pointer text-sm font-semibold text-ueberschrift">Meine To-Dos, erledigt</summary>

          <ul className="mt-3 flex flex-col divide-y divide-flaeche-100">
            {todosErledigt.map((aufgabe) => (
              <li key={aufgabe.id} className="flex items-start gap-3 py-2.5">
                <form action={aufgabeErledigtSetzen.bind(null, aufgabe.id, false)}>
                  <button
                    type="submit"
                    aria-label="Als offen markieren"
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-marke-gruen text-neutral-900"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                </form>

                <div className="min-w-0 flex-1">
                  <span className="text-sm text-tertiaer line-through">{aufgabe.titel}</span>
                  {aufgabe.beschreibung && (
                    <p className="mt-0.5 truncate text-xs text-neutral-300 line-through">
                      {richTextZuText(aufgabe.beschreibung)}
                    </p>
                  )}
                  <AufgabeAnhaengeAnzeige aufgabeId={aufgabe.id} anhaenge={aufgabe.anhaenge} />
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
    </>
  )

  // Zähler jetzt als Badge (Rückmeldung 2026-09-29, wie bei den übrigen
  // Karten) statt als Zahl in Klammern im Überschriftstext.
  const blockVonDirVergeben = (
    <>
      {(darfAuftraegeZuweisen || vergebenOffen.length > 0 || entwuerfe.length > 0) && (
        <div className="rounded-xl border border-rand bg-flaeche p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-ueberschrift">Von dir vergeben</h2>
              {vergebenOffen.length > 0 && (
                <span
                  aria-label={`${vergebenOffen.length} von dir vergeben`}
                  className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-marke-orange px-1 text-xs font-bold text-neutral-900"
                >
                  {vergebenOffen.length}
                </span>
              )}
            </div>
            {darfAuftraegeZuweisen && (
              <AuftragErstellenDialog
                personen={personenAnzeige}
                erstellenAktion={auftragErstellen}
                entwurfSpeichernAktion={auftragAlsEntwurfSpeichern}
                vorlagen={aufgabenVorlagen}
                autoOeffnen={neu === "1"}
              />
            )}
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
                    {darfAuftraegeZuweisen && (
                      <AuftragErstellenDialog
                        personen={personenAnzeige}
                        erstellenAktion={auftragEntwurfFinalisieren.bind(null, entwurf.id)}
                        entwurfSpeichernAktion={auftragEntwurfAktualisieren.bind(null, entwurf.id)}
                        entwurf={{ id: entwurf.id, standardwerte: auftragZuStandardwerte(entwurf) }}
                      />
                    )}
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
                <li key={auftrag.id} data-ziel={auftrag.id} className="flex items-start gap-3 py-2.5">
                  {auftragZeile(auftrag, "vergeben", "dir", empfaengerNamen(auftrag.empfaenger), `an ${empfaengerNamen(auftrag.empfaenger)}`)}
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
      )}

      {vergebenErledigt.length > 0 && (
        <details className="rounded-xl border border-rand bg-flaeche p-4">
          <summary className="cursor-pointer text-sm font-semibold text-ueberschrift">
            Von dir vergeben, erledigt ({vergebenErledigt.length})
          </summary>
          <ul className="mt-3 flex flex-col divide-y divide-flaeche-100">
            {vergebenErledigt.map((auftrag) => (
              <li key={auftrag.id} data-ziel={auftrag.id} className="flex items-start gap-3 py-2.5">
                {auftragZeile(auftrag, "vergeben", "dir", empfaengerNamen(auftrag.empfaenger), `an ${empfaengerNamen(auftrag.empfaenger)}`)}
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
  )

  return (
    <main
      className={
        "mx-auto max-w-2xl px-5 py-10" +
        (kontext.adminModusAktiv ? (seiteZweispaltig ? " md:max-w-4xl" : "") : persoenlicheMaxBreite)
      }
    >
      <ZielHervorheben zielId={zielAuftragId} />
      <div className="flex items-center justify-center gap-3 md:justify-between">
        <h1 className="text-2xl font-semibold text-ueberschrift">Aufgaben</h1>
        {darfVorlagenVerwalten && (
          <Link
            href="/aufgaben/vorlagen"
            className="hidden h-9 shrink-0 items-center rounded-lg px-3 text-sm font-medium text-primaer transition hover:bg-flaeche-100 md:flex"
          >
            Vorlagen verwalten
          </Link>
        )}
      </div>

      {!kontext.adminModusAktiv && (
        <nav aria-label="Ansicht wählen" className="mt-6 flex border-b border-rand text-sm font-medium md:hidden">
          {ansichten.map((tab) => (
            <Link
              key={tab.key}
              href={`/aufgaben?ansicht=${tab.key}`}
              aria-current={ansicht === tab.key ? "page" : undefined}
              className={
                "flex-1 border-b-2 px-2 py-3 text-center transition " +
                (ansicht === tab.key ? "border-marke-gruen-dunkel text-ueberschrift" : "border-transparent text-tertiaer hover:text-primaer")
              }
            >
              {tab.label}
            </Link>
          ))}
          {zeigeProjekteKachel && (
            <Link
              href="/aufgaben/projekte"
              className="flex-1 border-b-2 border-transparent px-2 py-3 text-center text-tertiaer transition hover:text-primaer"
            >
              Meine Projekte
            </Link>
          )}
        </nav>
      )}

      {zeigeProjekteKachel && (
        <Link
          href="/aufgaben/projekte"
          className={
            "mt-6 items-center justify-between gap-3 rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-gruen bg-flaeche p-4 shadow-sm transition hover:border-marke-gruen focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen " +
            (kontext.adminModusAktiv ? "flex" : "hidden md:flex")
          }
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
        darfAuftraegeZuweisen ? (
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3 md:items-start">
            <div className={"flex flex-col gap-4 " + (ansicht === "aufgaben" ? "" : "hidden md:flex")}>
              {blockVonDirVergeben}
            </div>
            <div className={"flex flex-col gap-4 " + (ansicht === "aufgaben" ? "" : "hidden md:flex")}>
              {blockDirZugewiesen}
              {blockAusProjekten}
            </div>
            <div className={"flex flex-col gap-4 " + (ansicht === "todos" ? "" : "hidden md:flex")}>
              {blockMeineTodos}
            </div>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start">
            <div className={"flex flex-col gap-4 " + (ansicht === "aufgaben" ? "" : "hidden md:flex")}>
              {blockDirZugewiesen}
              {blockAusProjekten}
            </div>
            {/* Diese Spalte mischt auf dem Desktop zwei Themen (To-Dos +
                Von dir vergeben) — die Tabs auf dem Handy brauchen sie
                aber einzeln, deshalb hier zwei eigene, je per
                `md:contents` transparente Wrapper statt eines
                gemeinsamen "hidden md:flex" auf der ganzen Spalte. */}
            <div className="flex flex-col gap-4">
              <div className={ansicht === "todos" ? "contents" : "hidden md:contents"}>{blockMeineTodos}</div>
              <div className={ansicht === "aufgaben" ? "contents" : "hidden md:contents"}>{blockVonDirVergeben}</div>
            </div>
          </div>
        )
      )}

      {kontext.adminModusAktiv && (
        <div className={"mt-6 grid grid-cols-1 gap-6" + (seiteZweispaltig ? " md:grid-cols-2 md:items-start" : "")}>
          <div className="rounded-xl border border-rand bg-flaeche p-4">
            <h2 className="text-sm font-semibold text-ueberschrift">
              Alle offenen Aufgaben (Firma) ({firmenweiteAuftraege?.length ?? 0})
            </h2>
            {!firmenweiteAuftraege || firmenweiteAuftraege.length === 0 ? (
              <p className="mt-3 text-sm text-sekundaer">Aktuell keine offenen Aufgaben.</p>
            ) : (
              <ul className="mt-3 flex flex-col divide-y divide-flaeche-100">
                {firmenweiteAuftraege.map((auftrag) => (
                  <li key={auftrag.id} data-ziel={auftrag.id} className="flex items-start gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <AuftragInhalt
                        auftrag={auftrag}
                        heute={heute}
                        name={`${auftrag.erstelltVon.vorname} ${auftrag.erstelltVon.nachname} → ${empfaengerNamen(auftrag.empfaenger)}`}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {firmenweiteProjektAufgabenOffen && firmenweiteProjektAufgabenOffen.length > 0 && (
            <div className="rounded-xl border border-rand bg-flaeche p-4">
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
                          {faellig.ueberfaellig && <AlertTriangle className="h-3.5 w-3.5" aria-hidden />}
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
        </div>
      )}

      <ZurueckButton />
    </main>
  )
}
