import { notFound } from "next/navigation"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { ProjektmitgliedRolle } from "@/generated/prisma/enums"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import { Hinweis } from "@/components/hinweis"
import { ProjektFormFelder } from "@/components/projekt-form-felder"
import { ProjektZeitstrahl } from "@/components/projekt-zeitstrahl"
import { ProjektZwischenziele } from "@/components/projekt-zwischenziele"
import { ProjektAufgaben } from "@/components/projekt-aufgaben"
import { ProjektDokumente } from "@/components/projekt-dokumente"
import { ProjektThread } from "@/components/projekt-thread"
import { ProjektMitglieder } from "@/components/projekt-mitglieder"
import { KachelPopup } from "@/components/kachel-popup"
import {
  projektDetails,
  projektAufgaben,
  projektDokumente,
  projektNachrichten,
} from "@/lib/projekte/abfragen"
import { istProjektSchreibgeschuetzt, projektZugriffTrotzPlanung } from "@/lib/projekte/mitgliedschaft"
import {
  projektAktualisieren,
  projektStarten,
  projektMitgliedHinzufuegen,
  projektMitgliedEntfernen,
  projektMitgliedRolleSetzen,
} from "@/lib/projekte/aktionen"
import { zwischenzielErstellen, zwischenzielLoeschen } from "@/lib/projekte/zwischenziele-aktionen"
import {
  projektAufgabeErstellen,
  projektAufgabeAnnehmen,
  projektAufgabeKenntnisnahme,
  projektAufgabeInArbeitSetzen,
  projektAufgabeStatusSetzen,
  projektAufgabeLoeschen,
} from "@/lib/projekte/aufgaben-aktionen"
import { projektDokumentHochladen, projektDokumentLoeschen } from "@/lib/projekte/dokumente-aktionen"
import { projektNachrichtErstellen } from "@/lib/projekte/nachrichten-aktionen"
import { PROJEKT_STATUS_KLASSEN, PROJEKT_STATUS_NAMEN } from "@/lib/projekte-optionen"
import { datumIsoAusDate } from "@/lib/datum"
import { richTextZuText } from "@/lib/rich-text"

const FEHLER_TEXTE: Record<string, string> = {
  pflichtfeld: "Bitte alle Pflichtfelder ausfüllen.",
  zeitraum: "Das Enddatum darf nicht vor dem Start liegen.",
  zuGross: "Eine Datei ist zu groß (maximal 15 MB je Datei).",
  typUngueltig: "Nicht unterstützter Dateityp. Erlaubt sind PDF, Fotos, Word und Excel.",
}

/**
 * Projekt-Detailseite: Kopfbereich, Zeitstrahl, vier Bereiche (Aufgaben,
 * Dokumente, Thread, Mitglieder). Sichtbar ausschließlich für aktive
 * Projektmitglieder (siehe Kommentar am Model Projekt) — derselbe 404 für
 * "gibt es nicht" und "gehört nicht zu deinen Projekten" wie bei
 * /ausleihen/[id], damit sich über den Statuscode keine ID erraten lässt.
 */
export default async function ProjektDetailSeite({
  params,
  searchParams,
}: {
  params: Promise<{ projektId: string }>
  searchParams: Promise<{ fehler?: string }>
}) {
  const kontext = await berechtigung()
  const { projektId } = await params
  const { fehler } = await searchParams

  const projekt = await projektDetails(projektId)
  const eigeneMitgliedschaft = projekt?.mitglieder.find((m) => m.personId === kontext.personId)
  const istMitglied =
    eigeneMitgliedschaft !== undefined &&
    projekt !== null &&
    projektZugriffTrotzPlanung(projekt.status, eigeneMitgliedschaft.rolle)
  // Admin-Modus (siehe Kontext.adminModusAktiv): rein lesender Zugriff auch
  // ohne Mitgliedschaft — projektMitgliedschaftPruefen (jede schreibende
  // Projekt-Aktion) verlangt weiterhin eine echte Mitglied-Zeile, siehe
  // Plan "Admin-Modus". `schreibgeschuetzt` unten wird für Nicht-Mitglieder
  // zusätzlich erzwungen, damit ProjektAufgaben/-Dokumente/-Thread gar
  // keine Schreib-Steuerelemente erst anbieten.
  if (!projekt || (!istMitglied && !kontext.adminModusAktiv)) {
    notFound()
  }

  const istLeitung = eigeneMitgliedschaft?.rolle === ProjektmitgliedRolle.LEITUNG
  const schreibgeschuetzt = istProjektSchreibgeschuetzt(projekt) || !istMitglied
  const heute = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())

  const [aufgaben, dokumenteRoh, nachrichten, kandidatenRoh] = await Promise.all([
    projektAufgaben(projektId),
    projektDokumente(projektId),
    projektNachrichten(projektId),
    prisma.person.findMany({
      where: { aktiv: true, benutzername: { notIn: projekt.mitglieder.map((m) => m.personId) } },
      orderBy: [{ nachname: "asc" }, { vorname: "asc" }],
      select: { benutzername: true, vorname: true, nachname: true },
    }),
  ])

  // Aufgaben-Zähler je Zwischenziel für die Zwischenziel-Kachel — bewusst
  // NICHT global über alle Aufgaben (siehe Rückmeldung zur früher
  // verwirrenden, globalen Fortschrittsanzeige über dem Zeitstrahl).
  // `erreicht` wird hier abgeleitet statt gespeichert (siehe Kommentar am
  // Model Zwischenziel): erst wenn es mindestens eine Aufgabe hat und alle
  // davon erledigt sind, gilt es als erreicht — ein leeres Zwischenziel
  // ohne Aufgaben also nie automatisch.
  const zwischenzieleAnzeige = projekt.zwischenziele.map((z) => {
    const zugehoerig = aufgaben.filter((a) => a.zwischenzielId === z.id)
    const aufgabenErledigt = zugehoerig.filter((a) => a.status === "ERLEDIGT").length
    return {
      ...z,
      erreicht: zugehoerig.length > 0 && aufgabenErledigt === zugehoerig.length,
      aufgabenErledigt,
      aufgabenGesamt: zugehoerig.length,
    }
  })
  const mitgliederAnzeige = projekt.mitglieder.map((m) => ({
    id: m.id,
    personId: m.personId,
    name: `${m.person.vorname} ${m.person.nachname}`,
    rolle: m.rolle,
  }))
  const mitgliederKandidaten = kandidatenRoh.map((p) => ({ id: p.benutzername, name: `${p.vorname} ${p.nachname}` }))
  // Fürs Aufgaben-Formular: die Frist als ISO-Datumsstring, damit ein
  // ausgewählter Zwischenziel sie direkt ins "Fällig am"-Feld übernehmen
  // kann (siehe beiZwischenzielAendern in ProjektAufgaben).
  const zwischenzieleFuerAufgabenformular = projekt.zwischenziele.map((m) => ({
    id: m.id,
    titel: m.titel,
    fristIso: datumIsoAusDate(m.frist),
  }))
  const projektmitgliederKandidaten = projekt.mitglieder.map((m) => ({
    id: m.personId,
    name: `${m.person.vorname} ${m.person.nachname}`,
  }))
  const dokumenteAnzeige = dokumenteRoh.map((d) => ({
    ...d,
    darfLoeschen: istLeitung,
  }))
  const dokumenteErwaehnungen = dokumenteAnzeige.map((d) => ({ id: d.id, dateiname: d.dateiname }))

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <Kopfleiste />

      {fehler && (
        <div className="mb-4">
          <Hinweis>{FEHLER_TEXTE[fehler] ?? "Das hat nicht geklappt."}</Hinweis>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-2">
        <h1 className="text-2xl font-semibold text-ueberschrift">{projekt.titel}</h1>
        <span className={"shrink-0 rounded-full px-2.5 py-1 text-xs font-medium " + PROJEKT_STATUS_KLASSEN[projekt.status]}>
          {PROJEKT_STATUS_NAMEN[projekt.status]}
        </span>
      </div>

      {projekt.ziel && (
        <p className="mt-2 text-sm text-primaer">{richTextZuText(projekt.ziel)}</p>
      )}

      {!istMitglied && (
        <div className="mt-3 rounded-xl border border-marke-orange/30 bg-marke-orange/10 px-4 py-2.5 text-sm text-ueberschrift">
          Du siehst dieses Projekt über den Admin-Modus — rein lesend, du bist kein Mitglied.
        </div>
      )}

      {/* Solange PLANUNG läuft, sieht nur die Leitung dieses Projekt
          überhaupt (siehe projektZugriffTrotzPlanung) — deshalb hier
          prominent statt im ausklappbaren "Projekt bearbeiten" versteckt.
          "Projekt starten" ist der einzige Weg auf AKTIV (siehe
          projektStarten): erst dabei werden die übrigen Mitglieder
          freigeschaltet und gebündelt benachrichtigt. */}
      {istLeitung && projekt.status === "PLANUNG" && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-marke-gruen/30 bg-marke-gruen/10 px-4 py-3">
          <p className="text-sm text-ueberschrift">
            Dieses Projekt ist noch in der Planung — bisher siehst nur du es. Mit &quot;Projekt starten&quot; bekommen die
            übrigen Mitglieder Zugriff und eine Nachricht mit ihren Aufgaben.
          </p>
          <form action={projektStarten.bind(null, projektId)}>
            <button
              type="submit"
              className="h-9 shrink-0 rounded-lg bg-marke-gruen px-4 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
            >
              Projekt starten
            </button>
          </form>
        </div>
      )}

      {schreibgeschuetzt && (
        <div className="mt-3">
          <Hinweis>
            Dieses Projekt ist schreibgeschützt (Enddatum erreicht oder Status {PROJEKT_STATUS_NAMEN[projekt.status]}).
            {istLeitung && " Als Leitung kannst du das Enddatum verlängern oder den Status ändern."}
          </Hinweis>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4">
        {/* Zeile 1: Statusleiste, über die ganze Breite — EIN Balken bis zum
            zuletzt erreichten Zwischenziel, mit nummerierten, farbigen
            Markierungen je Zwischenziel (siehe ProjektZeitstrahl). */}
        <section className="rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-gruen bg-flaeche p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-ueberschrift">Statusleiste</h2>
          <ProjektZeitstrahl
            start={projekt.start}
            ende={projekt.ende}
            heute={heute}
            zwischenziele={zwischenzieleAnzeige}
          />
        </section>

        {/* Zeile 2: Zwischenziele und Aufgaben nebeneinander. */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <section className="flex flex-col rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-orange bg-flaeche p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-ueberschrift">Zwischenziele</h2>
            {/* flex-1: die Kachel wird per Grid ohnehin auf die Höhe der
                Aufgaben-Kachel daneben gestreckt — dieser Bereich füllt
                diese Höhe, damit das Anlegen-Formular unten anheften kann
                (siehe mt-auto in ProjektZwischenziele), statt direkt unter
                der Liste zu schweben. */}
            <div className="mt-3 flex flex-1 flex-col">
              <ProjektZwischenziele
                projektId={projektId}
                zwischenziele={zwischenzieleAnzeige}
                heute={heute}
                istLeitung={istLeitung}
                schreibgeschuetzt={schreibgeschuetzt}
                erstellenAktion={zwischenzielErstellen}
                loeschenAktion={zwischenzielLoeschen}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-gruen-dunkel bg-flaeche p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-ueberschrift">Aufgaben</h2>
            <div className="mt-3">
              <ProjektAufgaben
                projektId={projektId}
                aufgaben={aufgaben}
                zwischenziele={zwischenzieleFuerAufgabenformular}
                mitgliederKandidaten={projektmitgliederKandidaten}
                eigenePersonId={kontext.personId}
                istLeitung={istLeitung}
                schreibgeschuetzt={schreibgeschuetzt}
                erstellenAktion={projektAufgabeErstellen}
                annehmenAktion={projektAufgabeAnnehmen}
                kenntnisnahmeAktion={projektAufgabeKenntnisnahme}
                inArbeitAktion={projektAufgabeInArbeitSetzen}
                statusSetzenAktion={projektAufgabeStatusSetzen}
                loeschenAktion={projektAufgabeLoeschen}
              />
            </div>
          </section>
        </div>

        {/* Zeile 3: Mitglieder und Dokumente als Kachel-Knopf mit Pop-up. */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <KachelPopup
            titel="Mitglieder"
            akzentKlasse="border-t-marke-gruen"
            vorschau={`${mitgliederAnzeige.length} ${mitgliederAnzeige.length === 1 ? "Mitglied" : "Mitglieder"}`}
          >
            <ProjektMitglieder
              projektId={projektId}
              mitglieder={mitgliederAnzeige}
              kandidaten={mitgliederKandidaten}
              istLeitung={istLeitung}
              hinzufuegenAktion={projektMitgliedHinzufuegen}
              entfernenAktion={projektMitgliedEntfernen}
              rolleSetzenAktion={projektMitgliedRolleSetzen}
            />
          </KachelPopup>

          <KachelPopup
            titel="Dokumente"
            akzentKlasse="border-t-marke-orange"
            vorschau={`${dokumenteAnzeige.length} ${dokumenteAnzeige.length === 1 ? "Dokument" : "Dokumente"}`}
          >
            <ProjektDokumente
              projektId={projektId}
              dokumente={dokumenteAnzeige}
              schreibgeschuetzt={schreibgeschuetzt}
              hochladenAktion={projektDokumentHochladen}
              loeschenAktion={projektDokumentLoeschen}
            />
          </KachelPopup>
        </div>

        {/* Zeile 4: Thread, über die ganze Breite. */}
        <section className="rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-gruen-dunkel bg-flaeche p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-ueberschrift">Thread</h2>
          <div className="mt-3">
            <ProjektThread
              projektId={projektId}
              nachrichten={nachrichten}
              dokumente={dokumenteErwaehnungen}
              schreibgeschuetzt={schreibgeschuetzt}
              nachrichtAktion={projektNachrichtErstellen}
            />
          </div>
        </section>

        {/* Zeile 5: Projekt bearbeiten, nur für die Leitung — ausklappbar, damit der Bearbeiten-Kasten nicht dauerhaft Platz braucht. */}
        {istLeitung && (
          <details className="rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-neutral-300 bg-flaeche p-4 shadow-sm">
            <summary className="cursor-pointer text-lg font-semibold text-ueberschrift">Projekt bearbeiten</summary>
            <form action={projektAktualisieren.bind(null, projektId)} className="mt-3 flex flex-col gap-3">
              <ProjektFormFelder
                standardwerte={{
                  titel: projekt.titel,
                  ziel: projekt.ziel,
                  start: datumIsoAusDate(projekt.start),
                  ende: datumIsoAusDate(projekt.ende),
                  status: projekt.status,
                }}
                zeigeStatus
              />
              <button
                type="submit"
                className="ml-auto h-9 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
              >
                Speichern
              </button>
            </form>
          </details>
        )}
      </div>

      <ZurueckButton />
    </main>
  )
}
