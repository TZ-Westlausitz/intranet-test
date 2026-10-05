import Link from "next/link"
import { CheckSquare, ClipboardList, Clock, Truck } from "lucide-react"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { teileInBerlinerZeit } from "@/lib/datum"
import { AusleiheStatus } from "@/generated/prisma/enums"
import { MONATSNAMEN, istGleicherTag } from "@/lib/kalender"
import { naechsterTermin, faelligeErinnerungenAnzahl } from "@/lib/termine/abfragen"
import { aufgabenFuerPerson, naechsteGeplantAufgaben } from "@/lib/aufgaben/abfragen"
import { auftraegeStatusAnzahl, naechsteGeplantAuftraege } from "@/lib/auftraege/abfragen"
import { projektAufgabenFuerPerson } from "@/lib/projekte/abfragen"
import {
  infosFuerPerson,
  alleInfos,
  offeneBestaetigungenAnzahl,
  naechsteGeplantInfos,
  UNTERNEHMENSNAME,
} from "@/lib/infos/abfragen"
import { NewsfeedHomeKachel } from "@/components/newsfeed-home-kachel"
import { KalenderKachel } from "@/components/startseite/kalender-kachel"
import { AufgabenKachel } from "@/components/startseite/aufgaben-kachel"
import { WissensbereichKachel } from "@/components/startseite/wissensbereich-kachel"
import { FahrzeugeKachel } from "@/components/startseite/fahrzeuge-kachel"
import { TodoListeKachel } from "@/components/startseite/todo-liste-kachel"
import { GeplanteAktionenKachel } from "@/components/startseite/geplante-aktionen-kachel"
import { FormulareKachel } from "@/components/startseite/formulare-kachel"
import { KontakteKachel } from "@/components/startseite/kontakte-kachel"
import { parseRaster } from "@/lib/startseite/raster"
import { gitterKlassen, portraitZeilenVorlage } from "@/lib/startseite/gitter-klassen"
import { formulareStartseitenStand, formularVorlagenFuerKachel } from "@/lib/formulare/abfragen"
import { personenFuerKachel } from "@/lib/kontakte/abfragen"
import { ordnerVorschauFuerKachel } from "@/lib/wissen/abfragen"

/**
 * DIE ZWEI STUNDEN VERSICHERUNG — Fortsetzung.
 *
 * Auf dem Handy (Rückmeldung vom 2026-09-15, ersetzt die vorherige,
 * inzwischen veraltete einfache Modul-Liste) zeigt die Startseite
 * dieselben Bausteine wie der Desktop, nur untereinander statt im
 * Raster: Newsfeed/Kalender/Aufgaben mit echter Vorschau (dasselbe
 * Konstrukt wie auf dem Desktop, insbesondere NewsfeedHomeKachel direkt
 * wiederverwendet statt eigens nachgebaut), alle übrigen Bausteine als
 * einfache Kachel ohne Vorschau, nur Name + Link. Ab Tablet/Desktop
 * (`md:` aufwärts) kommt die besprochene Kachel-Startseite dazu: sechs
 * quadratische Kacheln in der Bildschirmmitte — die zwei linken
 * zusammen als Newsfeed. Logo, Kopfzeilenmenü und Benutzermenü stehen
 * NICHT hier, sondern fest im Root-Layout (src/app/layout.tsx) — dort
 * gelten sie für jede Seite, nicht nur die Startseite.
 *
 * Seit 2026-09-28 ist das ganze 4×2-Raster (Tablet/Desktop) modular: jede
 * Person stellt unter /einstellungen selbst ein, welches Modul in welchem
 * der 8 Felder erscheint (`Person.startseiteRaster`, siehe
 * src/lib/startseite/raster.ts für den Modul-Katalog und
 * src/lib/startseite/gitter-klassen.ts für die Umrechnung in
 * Grid-Platzierung inkl. Hochformat). Vorher gab es hier nur eine feste
 * Anordnung mit genau einem wählbaren Feld — das ist Geschichte, siehe Git.
 * Das Handy-Layout unten ist bewusst NICHT Teil dieses Rasters.
 *
 * Beide Fassungen rendern serverseitig gleichzeitig, nur per Tailwind
 * `md:`-Klassen ein-/ausgeblendet — kein Geräte-Sniffing, keine zwei
 * Datenabfragen.
 *
 * Ab Tablet/Desktop passt die Kachel-Startseite bewusst IMMER auf eine
 * Bildschirmhöhe, ohne Scrollen — die Kachelgröße ist deshalb nicht in
 * festen rem-Werten je Breakpoint gesetzt, sondern als
 * `min(23rem, Nvh, Mvw)`: Sie wächst mit Bildschirmhöhe UND -breite, ist
 * aber nach oben (23rem) UND nach unten (durch vh-/vw-Anteil) begrenzt.
 * Genau das hat vorher das Problem mit dem 4:3-Tablet in Landschaft
 * gelöst (1024×768 — schmal genug für die volle Breite, aber zu niedrig
 * für feste große Kacheln) und funktioniert automatisch für JEDE
 * Bildschirmgröße statt nur für einen einzelnen getesteten Fall — deshalb
 * genügt es, die drei Zahlen (rem-Obergrenze, vh-Anteil, vw-Anteil)
 * gemeinsam moderat anzuheben (Rückmeldung: viel Leerraum über/unter dem
 * Raster auf großen Desktop-Monitoren): Auf einem großen Bildschirm mit
 * viel vh/vw wachsen die Kacheln entsprechend mit, auf einem schmalen/
 * niedrigen Bildschirm wie dem 4:3-Tablet bleibt automatisch dieselbe
 * engere Grenze wirksam wie vorher (nur ein wenig großzügiger) — dieselbe
 * Rechnung, kein Breakpoint-Sonderfall nötig. Scrollen soll es später
 * INNERHALB einzelner Kacheln oder auf den Unterseiten geben, nicht auf
 * dieser Seite selbst.
 */

export default async function Startseite() {
  const kontext = await berechtigung()
  const heute = new Date()
  const heuteBerlin = teileInBerlinerZeit(heute)

  const istWerkstatt =
    kontext.berechtigungen.includes("Werkstattleiter") || kontext.berechtigungen.includes("Adminbereich")

  // Modulares Startseiten-Raster (Tablet/Desktop, siehe /einstellungen und
  // src/lib/startseite/raster.ts) — ohne eigene Einstellung greift
  // STARTSEITE_STANDARD als Fallback.
  const person = await prisma.person.findUniqueOrThrow({
    where: { benutzername: kontext.personId },
    select: { startseiteRaster: true },
  })
  const raster = parseRaster(person.startseiteRaster)
  const gitterKlassenNachModul = gitterKlassen(raster)
  const portraitZeilen = portraitZeilenVorlage(raster)

  // Nur abfragen, wenn tatsächlich platziert — anders als bei Fahrzeuge
  // (siehe unten) lohnt sich das hier, weil diese drei Abfragen echte
  // Zusatzarbeit machen (Formular-Status berechnen, Personen/Ordner nach
  // Auswahl-Reihenfolge nachladen), nicht nur ein günstiger Zähler.
  const formularePlatzierung = raster.find((p) => p.modul === "FORMULARE")
  const kontaktePlatzierung = raster.find((p) => p.modul === "KONTAKTE")
  const wissensbereichPlatzierung = raster.find((p) => p.modul === "WISSENSBEREICH")
  // Ob es sich lohnt, die gewählten Schnellzugriff-Vorlagen nachzuladen —
  // nur bei der Form BREIT hat die Formulare-Kachel dafür Platz (siehe
  // FormulareKachel).
  const formulareBreit = formularePlatzierung?.form === "BREIT"

  const [formulareStand, kontaktePersonen, wissensOrdner, formulareShortcuts] = await Promise.all([
    formularePlatzierung ? formulareStartseitenStand(kontext) : Promise.resolve({ eigeneOffen: [], adressiertOffen: [] }),
    kontaktePlatzierung ? personenFuerKachel(kontaktePlatzierung.personenIds ?? []) : Promise.resolve([]),
    wissensbereichPlatzierung
      ? ordnerVorschauFuerKachel(wissensbereichPlatzierung.ordnerIds ?? [], kontext)
      : Promise.resolve([]),
    formulareBreit ? formularVorlagenFuerKachel(formularePlatzierung?.formularIds ?? [], kontext) : Promise.resolve([]),
  ])

  // Fahrzeuge-Vorschaudaten: auf dem Handy IMMER für Werkstatt-Rolle nötig
  // (eigene Kachel dort, unabhängig vom Desktop-Raster, siehe Rückmeldung
  // vom 2026-09-15 zur Handy-Startseite) — die Abfrage ist günstig genug,
  // um sie nicht zusätzlich an "ist FAHRZEUGE im Raster platziert?" zu
  // koppeln.
  const [offeneAnfragen, naechsteReservierungen] = istWerkstatt
    ? await Promise.all([
        prisma.ausleihe.count({ where: { status: AusleiheStatus.ANGEFRAGT } }),
        prisma.ausleihe.findMany({
          where: { status: AusleiheStatus.ZUGESAGT, geplantBis: { gte: new Date() } },
          include: { fahrzeug: true, entleiher: true },
          orderBy: { geplantVon: "asc" },
          take: 2,
        }),
      ])
    : [0, []]

  // Auf dem Handy hat "Geplante Aktionen" eine eigene, immer sichtbare
  // Kachel (siehe oben) — deshalb hier nicht mehr an die
  // Desktop-Moduswahl gekoppelt.
  const [naechsteGeplantInfosListe, naechsteGeplantAufgabenListe, naechsteGeplantAuftraegeListe] = await Promise.all([
    naechsteGeplantInfos(kontext.personId, 5),
    naechsteGeplantAufgaben(kontext.personId, 5),
    naechsteGeplantAuftraege(kontext.personId, 5),
  ])

  const [termin, faelligeErinnerungen, { offen: offeneAufgaben }, auftraegeStatus, offeneProjektAufgaben, infos, offeneBestaetigungen] =
    await Promise.all([
      naechsterTermin(kontext.personId, heute),
      faelligeErinnerungenAnzahl(kontext.personId, heute),
      aufgabenFuerPerson(kontext.personId),
      auftraegeStatusAnzahl(kontext.personId),
      projektAufgabenFuerPerson(kontext.personId),
      // Admin-Modus (siehe Kontext.adminModusAktiv): dieselbe firmenweite
      // Sicht wie im vollen /newsfeed-Feed (Rückmeldung vom 2026-09-14) —
      // vorher zeigte die Startseiten-Kachel immer nur die eigenen Infos,
      // Admin-Modus blieb hier wirkungslos.
      kontext.adminModusAktiv ? alleInfos(kontext) : infosFuerPerson(kontext),
      offeneBestaetigungenAnzahl(kontext.personId),
    ])
  // Alle sichtbaren Infos statt einer festen Obergrenze — die Kachel
  // bekommt dafür einen eigenen scrollbaren Bereich (siehe Rückmeldung:
  // auch ältere Infos sollen dort erreichbar bleiben, nicht nur die
  // neuesten zwei).
  const naechsteTodos = offeneAufgaben.slice(0, 2)
  // Für die "Geplante Aktionen"-Kachel: Infos, Aufgaben und Aufträge zu
  // einer gemeinsamen, nach Datum sortierten Liste zusammenführen — Badge
  // zählt die volle Anzahl, angezeigt werden nur die ersten drei.
  const geplanteEintraege = [
    ...naechsteGeplantInfosListe.map((i) => ({ id: i.id, titel: i.titel, datum: i.veroeffentlichtAm, typ: "info" as const })),
    ...naechsteGeplantAufgabenListe.map((a) => ({ id: a.id, titel: a.titel, datum: a.geplantAm!, typ: "aufgabe" as const })),
    ...naechsteGeplantAuftraegeListe.map((a) => ({ id: a.id, titel: a.titel, datum: a.geplantAm!, typ: "auftrag" as const })),
  ].sort((a, b) => a.datum.getTime() - b.datum.getTime())
  const naechsteGeplant = geplanteEintraege.slice(0, 3)
  // Für NewsfeedHomeKachel (Client Component) vorberechnet — sie soll
  // UNTERNEHMENSNAME nicht selbst aus abfragen.ts importieren, sonst würde
  // dessen Prisma-Import mit in den Browser-Bundle wandern. previewHtml
  // nur ohne titelbild: Bild ODER Text, nie beides (siehe ersteBildInfo).
  // Geplante (noch nicht veröffentlichte) Infos bleiben hier außen vor —
  // die Kachel zeigt nur wirklich live Beiträge, ihre Entwürfe verwaltet
  // die erstellende Person im vollen /newsfeed-Feed (siehe "Geplant für").
  const newsfeedKarten = infos
    .filter((info) => !info.nochNichtVeroeffentlicht)
    .map((info) => ({
      id: info.id,
      titel: info.titel,
      erstelltAm: info.veroeffentlichtAm,
      absenderName: info.alsUnternehmen ? UNTERNEHMENSNAME : `${info.erstelltVon.vorname} ${info.erstelltVon.nachname}`,
      previewHtml: !info.titelbild && info.inhalt ? info.inhalt : null,
      titelbild: info.titelbild,
      anhaengeAnzahl: info.anhaenge.length,
      kommentareAnzahl: info._count.kommentare,
      likeAnzahl: info.likeAnzahl,
      umfrage: info.umfrage !== null,
      // Bestätigung steht noch aus — die Kachel hebt solche Beiträge
      // orange hervor (siehe NewsfeedHomeKachel).
      bestaetigungOffen: info.mitBestaetigung && info.istEmpfaenger && !info.selbstBestaetigt,
    }))
  // Handy-Startseite zeigt nur die 3 neuesten Infos direkt (kompakte,
  // natürlich mitscrollende Liste statt einer intern scrollenden Box wie
  // auf dem Desktop) — ältere Infos bleiben über "Zum Newsfeed →"
  // erreichbar, genau wie auf /newsfeed selbst.
  const newsfeedKartenMobil = newsfeedKarten.slice(0, 3)
  // Die Aufgaben-Kachel zeigt jetzt nur noch Aufträge (mit Offen/
  // Angenommen-Abstufung) und Projekt-Aufgaben — die To-Do-Liste hat eine
  // eigene Kachel weiter unten im Raster.
  const auftraegeGesamtOffen = auftraegeStatus.offen + auftraegeStatus.angenommen
  const aufgabenGesamtOffen = auftraegeGesamtOffen + offeneProjektAufgaben.length
  // Für die Aufgaben-Kachel (untere Hälfte, Rückmeldung 2026-09-28): die
  // ohnehin schon geladenen offenen Projekt-Aufgaben nach Projekt
  // gruppieren, statt einer eigenen Abfrage — nur Projekte mit
  // mindestens einer offenen eigenen Aufgabe tauchen dort auf.
  const projekteMitOffenenAufgaben = Array.from(
    offeneProjektAufgaben.reduce((karte, aufgabe) => {
      const eintrag = karte.get(aufgabe.projekt!.id) ?? { id: aufgabe.projekt!.id, titel: aufgabe.projekt!.titel, anzahl: 0 }
      eintrag.anzahl += 1
      karte.set(aufgabe.projekt!.id, eintrag)
      return karte
    }, new Map<string, { id: string; titel: string; anzahl: number }>()).values()
  )
  const terminVorschau = termin
    ? `${
        istGleicherTag(termin.beginn, heute)
          ? termin.beginn.toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" }) + " Uhr"
          : termin.beginn.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin", weekday: "short", day: "2-digit", month: "2-digit" })
      } · ${termin.titel}`
    : null

  return (
    <>
      {/* Handy: dieselben Bausteine wie auf dem Desktop, nur untereinander
          statt im 4×2-Raster (Rückmeldung vom 2026-09-15 — vorher stand
          hier noch die alte, seit den anderen Bausteinen nicht mehr
          gepflegte Modul-Liste). Newsfeed/Kalender/Aufgaben mit echter
          Vorschau wie auf dem Desktop, der Rest als einfache
          Menükacheln ohne Vorschau — auf dem Handy scrollt ohnehin die
          ganze Seite, eine Vorschau lohnt sich dort nicht für jeden
          Baustein gleichermaßen. */}
      <main className="mx-auto max-w-2xl px-5 py-6 md:hidden">
        <div className="flex flex-col gap-4">
          {/* Eigene Überschrift+Link-Kopfzeile hier bewusst NICHT nötig —
              NewsfeedHomeKachel bringt "Newsfeed" als Link zu /newsfeed
              schon selbst mit (identisch zur Desktop-Kachel). */}
          <NewsfeedHomeKachel infos={newsfeedKartenMobil} offeneBestaetigungen={offeneBestaetigungen} />

          <Link
            href="/kalender"
            className="flex items-center gap-4 rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-orange bg-flaeche p-4 shadow-sm transition hover:border-marke-orange focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
          >
            <div className="flex shrink-0 flex-col items-center">
              <span className="text-3xl leading-none font-bold text-ueberschrift">{Number(heuteBerlin.tag)}</span>
              <span className="mt-1 text-xs font-medium text-sekundaer">{MONATSNAMEN[Number(heuteBerlin.monat) - 1]}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="text-lg font-semibold text-ueberschrift">Kalender</h2>
                {faelligeErinnerungen > 0 && (
                  <span
                    aria-label={`${faelligeErinnerungen} fällige Erinnerungen`}
                    className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-marke-orange px-1 text-xs font-bold text-neutral-900"
                  >
                    {faelligeErinnerungen}
                  </span>
                )}
              </div>
              <p className="truncate text-sm text-sekundaer">{terminVorschau ?? "Keine anstehenden Termine"}</p>
            </div>
          </Link>

          <Link
            href="/aufgaben"
            className="rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-gruen-dunkel bg-flaeche p-4 shadow-sm transition hover:border-marke-gruen-dunkel focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
          >
            <div className="flex items-center justify-between gap-1.5">
              <h2 className="text-lg font-semibold text-ueberschrift">Aufgaben</h2>
              {aufgabenGesamtOffen > 0 && (
                <span
                  aria-label={`${aufgabenGesamtOffen} offene Aufgabe${aufgabenGesamtOffen === 1 ? "" : "n"}`}
                  className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-marke-orange px-1 text-xs font-bold text-neutral-900"
                >
                  {aufgabenGesamtOffen}
                </span>
              )}
            </div>

            {aufgabenGesamtOffen === 0 ? (
              <p className="mt-1.5 text-sm text-sekundaer">Alles erledigt</p>
            ) : (
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-primaer">
                {auftraegeStatus.offen > 0 && (
                  <span>
                    Offen <span className="font-medium">{auftraegeStatus.offen}</span>
                  </span>
                )}
                {auftraegeStatus.angenommen > 0 && (
                  <span>
                    Angenommen <span className="font-medium">{auftraegeStatus.angenommen}</span>
                  </span>
                )}
                {offeneProjektAufgaben.length > 0 && (
                  <span>
                    Projekt-Aufgaben <span className="font-medium">{offeneProjektAufgaben.length}</span>
                  </span>
                )}
              </div>
            )}
          </Link>

          {/* Alle übrigen Bausteine als einfache Kacheln ohne Vorschau —
              scrollt ohnehin mit der Seite, ein 2-spaltiges Raster hält
              es kompakt statt einer langen Einzelliste. Wissensbereich,
              Kontakte und Chat sind hier bewusst NICHT mehr dabei
              (Rückmeldung 2026-09-15): Chat steht schon in der
              MobileTabBar, Wissensbereich und Kontakte auf der neuen
              "Menü"-Seite (siehe src/app/(mitarbeiter)/menu/page.tsx) —
              eine dritte Fundstelle für dieselben drei Ziele wäre nur
              Redundanz. "Fahrzeuge" führt seit der Menü-Vereinheitlichung
              (2026-09-30) auf den gemeinsamen Hub /fahrzeug-reservierungen,
              der "Fahrzeug mieten" und "Meine Anfragen" selbst schon als
              eigene Kacheln enthält — dafür hier keine getrennten Einträge
              mehr. Die übrigen vier haben (noch) keinen anderen Platz in
              der neuen mobilen Navigation und bleiben deshalb hier. */}
          <ul className="grid grid-cols-2 gap-3">
            {[
              { href: "/formulare", name: "Formulare", icon: ClipboardList },
              { href: "/fahrzeug-reservierungen", name: "Fahrzeuge", icon: Truck },
              { href: "/aufgaben", name: "To-Do-Liste", icon: CheckSquare },
              { href: "/geplante-aktionen", name: "Geplante Aktionen", icon: Clock },
            ].map((kachel) => (
              <li key={kachel.href}>
                <Link
                  href={kachel.href}
                  className="flex flex-col items-center gap-1.5 rounded-2xl border border-rand bg-flaeche p-4 text-center shadow-sm transition hover:border-marke-gruen focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
                >
                  <kachel.icon aria-hidden className="h-7 w-7 text-primaer" />
                  <span className="text-sm font-medium text-ueberschrift">{kachel.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>

      {/* Tablet/Desktop: Kachel-Startseite füllt genau die Höhe, die das
          Root-Layout ihr unter der festen Kopfzeile lässt (md:h-full auf
          der flex-1-Fläche dort) — kein eigenes min-h-screen mehr, sonst
          würde die Seite unter der Kopfzeile wieder über eine Bildschirm-
          höhe hinauswachsen. */}
      <main className="hidden h-full flex-col md:flex">
        <div className="flex flex-1 flex-col overflow-auto bg-gradient-to-br from-marke-gruen/5 via-background to-marke-orange/5 p-6">
          {/* 4 Spalten × 2 Zeilen, Platzierung datengetrieben aus `raster`
              (siehe /einstellungen und src/lib/startseite/raster.ts) —
              welches Modul in welcher Zelle erscheint, bestimmt
              `gitterKlassenNachModul`. Newsfeed nimmt bei der Form GROSS
              per col-span-2/row-span-2 vier Zellen ein, alle anderen Module
              genau eine.

              Kachelgröße (--kachel) = das Kleinste aus Maximalgröße,
              Höhenanteil und der tatsächlich verfügbaren Breite geteilt
              durch 4 Spalten. Die Breite MUSS Seitenpolster (2 × 1.5rem)
              und die 3 Abstände abziehen — ein fester vw-Anteil pro Kachel
              (früher 26vw) ergab 4 × 26vw = 104vw und ließ das Raster auf
              iPads über den Rand hinauswachsen. "m-auto" statt
              Flex-Zentrierung: bei zu wenig Platz scrollt die Fläche,
              statt links unerreichbar abgeschnitten zu werden.

              --portrait-zeilen: Das Hochformat-Raster hat eine variable
              Zeilenzahl (abhängig davon, ob Newsfeed platziert ist und wie
              viele übrige Module es gibt, siehe portraitZeilenVorlage) —
              deshalb als Inline-Style statt einer festen Tailwind-Klasse. */}
          <div
            style={
              {
                "--kachel-abstand": "min(2.25rem, 4dvh)",
                "--kachel":
                  "min(23rem, 33dvh, calc((100vw - 3rem - 3 * var(--kachel-abstand)) / 4))",
                "--portrait-zeilen": portraitZeilen,
              } as React.CSSProperties
            }
            className="m-auto grid grid-cols-[repeat(4,var(--kachel))] grid-rows-[repeat(2,var(--kachel))] gap-[var(--kachel-abstand)] portrait:m-0 portrait:mx-auto portrait:min-h-[42rem] portrait:w-full portrait:max-w-3xl portrait:flex-1 portrait:grid-cols-2 portrait:grid-rows-[var(--portrait-zeilen)]"
          >
            {raster.map((platzierung) => {
              const gitterKlasse = gitterKlassenNachModul[platzierung.modul]
              switch (platzierung.modul) {
                case "NEWSFEED":
                  return (
                    <NewsfeedHomeKachel
                      key="NEWSFEED"
                      className={gitterKlasse}
                      infos={newsfeedKarten}
                      offeneBestaetigungen={offeneBestaetigungen}
                    />
                  )
                case "KALENDER":
                  return (
                    <KalenderKachel
                      key="KALENDER"
                      className={gitterKlasse}
                      heute={heute}
                      faelligeErinnerungen={faelligeErinnerungen}
                      terminVorschau={terminVorschau}
                    />
                  )
                case "AUFGABEN":
                  return (
                    <AufgabenKachel
                      key="AUFGABEN"
                      className={gitterKlasse}
                      auftraegeOffen={auftraegeStatus.offen}
                      auftraegeAngenommen={auftraegeStatus.angenommen}
                      projekte={projekteMitOffenenAufgaben}
                    />
                  )
                case "WISSENSBEREICH":
                  return <WissensbereichKachel key="WISSENSBEREICH" className={gitterKlasse} ordner={wissensOrdner} />
                case "FAHRZEUGE":
                  return (
                    <FahrzeugeKachel
                      key="FAHRZEUGE"
                      className={gitterKlasse}
                      istWerkstatt={istWerkstatt}
                      offeneAnfragen={offeneAnfragen}
                      naechsteReservierungen={naechsteReservierungen}
                    />
                  )
                case "TODO_LISTE":
                  return (
                    <TodoListeKachel
                      key="TODO_LISTE"
                      className={gitterKlasse}
                      offeneAnzahl={offeneAufgaben.length}
                      naechsteTodos={naechsteTodos}
                    />
                  )
                case "GEPLANTE_AKTIONEN":
                  return (
                    <GeplanteAktionenKachel
                      key="GEPLANTE_AKTIONEN"
                      className={gitterKlasse}
                      gesamtAnzahl={geplanteEintraege.length}
                      naechsteGeplant={naechsteGeplant}
                    />
                  )
                case "FORMULARE":
                  return (
                    <FormulareKachel
                      key="FORMULARE"
                      className={gitterKlasse}
                      breit={formulareBreit}
                      eigeneOffen={formulareStand.eigeneOffen}
                      adressiertOffen={formulareStand.adressiertOffen}
                      shortcuts={formulareShortcuts}
                    />
                  )
                case "KONTAKTE":
                  return <KontakteKachel key="KONTAKTE" className={gitterKlasse} personen={kontaktePersonen} />
                default:
                  return null
              }
            })}
          </div>
        </div>
      </main>
    </>
  )
}
