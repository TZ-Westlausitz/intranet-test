import Link from "next/link"
import { CheckSquare, ClipboardList, Clock, FileEdit, Newspaper, Truck } from "lucide-react"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { AusleiheStatus } from "@/generated/prisma/enums"
import { Kopfleiste } from "@/components/kopfleiste"
import { MONATSNAMEN, istGleicherTag } from "@/lib/kalender"
import { naechsterTermin, faelligeErinnerungenAnzahl } from "@/lib/termine/abfragen"
import { aufgabenFuerPerson, naechsteGeplantAufgaben } from "@/lib/aufgaben/abfragen"
import { aufgabeErledigtSetzen } from "@/lib/aufgaben/aktionen"
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
import { STARTSEITE_WEITERES_MODULE } from "@/lib/bausteine"

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
 * Zeile 2, Spalte 4 ist die "modular einstellbare" Kachel: genau EIN Modul
 * aus dem Kopfzeilenpunkt "Weiteres" (siehe src/lib/bausteine.ts, aktuell
 * Fahrzeuge oder To-Do-Liste) — welches, stellt jede Person selbst unter
 * /einstellungen ein (Person.startseiteWeiteresModul).
 * Die übrigen Module dieser Liste zeigen sich hier NICHT zusätzlich,
 * bleiben aber über "Weiteres" in der Kopfzeile erreichbar — es ist also
 * immer nur eins der beiden sichtbar, nie beide gleichzeitig. Bewusst
 * Zeile 2 und keine dritte Raster-Zeile: Das sichtbare Raster ist auf 2×4
 * Felder ausgelegt (passt so auf eine Bildschirmhöhe, siehe Kommentar
 * weiter unten zum 4:3-Tablet) — eine dritte Zeile würde darunter
 * verschwinden statt an derselben Stelle wie früher die Fahrzeuge-Kachel
 * zu stehen.
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

  const istWerkstatt =
    kontext.berechtigungen.includes("Werkstattleiter") || kontext.berechtigungen.includes("Adminbereich")

  // Welches "Weiteres"-Modul für Zeile 2, Spalte 4 eingestellt ist (siehe
  // /einstellungen) — ohne eigene Einstellung greift der
  // erste Eintrag der Liste als Default (aktuell Fahrzeuge, das bisherige
  // Verhalten für alle, die die Einstellung noch nicht angefasst haben).
  const person = await prisma.person.findUniqueOrThrow({
    where: { benutzername: kontext.personId },
    select: { startseiteWeiteresModul: true },
  })
  const weiteresModule = STARTSEITE_WEITERES_MODULE
  const ausgewaehltesModul = person.startseiteWeiteresModul ?? weiteresModule[0]?.name ?? ""
  const zeigeFahrzeuge = ausgewaehltesModul === "Fahrzeuge"
  const zeigeTodoListe = ausgewaehltesModul === "To-Do-Liste"
  const zeigeGeplanteAktionen = ausgewaehltesModul === "Geplante Aktionen"

  // Nur abfragen, wenn die Fahrzeuge-Kachel für diese Person überhaupt
  // sichtbar ist — auf dem Handy IMMER für Werkstatt-Rolle (eigene
  // Kachel dort, unabhängig vom Desktop-"Weiteres"-Modul, siehe
  // Rückmeldung vom 2026-09-15 zur Handy-Startseite), auf dem Desktop
  // zusätzlich nur, wenn als Modul ausgewählt.
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
        <Kopfleiste />

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
              <span className="text-3xl leading-none font-bold text-ueberschrift">{heute.getDate()}</span>
              <span className="mt-1 text-xs font-medium text-sekundaer">{MONATSNAMEN[heute.getMonth()]}</span>
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
              Redundanz. Die übrigen fünf haben (noch) keinen anderen Platz
              in der neuen mobilen Navigation und bleiben deshalb hier. */}
          <ul className="grid grid-cols-2 gap-3">
            {[
              { href: "/formulare", name: "Formulare", icon: ClipboardList },
              istWerkstatt
                ? { href: "/fahrzeug-reservierungen", name: "Fahrzeuge", icon: Truck }
                : { href: "/fahrzeug-mieten", name: "Fahrzeug mieten", icon: Truck },
              { href: "/meine-anfragen", name: "Meine Anfragen", icon: FileEdit },
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
          {/* 4 Spalten statt 4 einzelne Kacheln: Newsfeed nimmt per
              col-span-2 zwei davon ein und bleibt durch row-span-2 genauso
              hoch wie breit — ein großer quadratischer Block statt eines
              schmalen Streifens, damit später Posts (auch mit Fotos)
              hineinpassen.

              Kachelgröße (--kachel) = das Kleinste aus Maximalgröße,
              Höhenanteil und der tatsächlich verfügbaren Breite geteilt
              durch 4 Spalten. Die Breite MUSS Seitenpolster (2 × 1.5rem)
              und die 3 Abstände abziehen — ein fester vw-Anteil pro Kachel
              (früher 26vw) ergab 4 × 26vw = 104vw und ließ das Raster auf
              iPads über den Rand hinauswachsen. "m-auto" statt
              Flex-Zentrierung: bei zu wenig Platz scrollt die Fläche,
              statt links unerreichbar abgeschnitten zu werden. */}
          <div
            style={
              {
                "--kachel-abstand": "min(2.25rem, 4dvh)",
                "--kachel":
                  "min(23rem, 33dvh, calc((100vw - 3rem - 3 * var(--kachel-abstand)) / 4))",
              } as React.CSSProperties
            }
            className="m-auto grid grid-cols-[repeat(4,var(--kachel))] grid-rows-[repeat(2,var(--kachel))] gap-[var(--kachel-abstand)] portrait:m-0 portrait:mx-auto portrait:min-h-[42rem] portrait:w-full portrait:max-w-3xl portrait:flex-1 portrait:grid-cols-2 portrait:grid-rows-[minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,1fr)]"
          >
            <NewsfeedHomeKachel infos={newsfeedKarten} offeneBestaetigungen={offeneBestaetigungen} />

            <Link
              href="/kalender"
              className="col-start-3 row-start-1 portrait:col-start-1 portrait:row-start-2 flex flex-col rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-orange bg-flaeche p-4 text-center shadow-sm transition hover:border-marke-orange focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
            >
              <div className="flex items-center justify-center gap-1.5">
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
              <div className="flex flex-1 flex-col items-center justify-center">
                <span className="text-5xl font-bold leading-none text-ueberschrift">{heute.getDate()}</span>
                <span className="mt-1.5 text-sm font-medium text-sekundaer">
                  {MONATSNAMEN[heute.getMonth()]}
                </span>
              </div>
              <p className="truncate text-xs font-medium text-sekundaer">
                {terminVorschau ?? "Keine anstehenden Termine"}
              </p>
            </Link>

            {/* Eine Kachel, ein Link — anders als früher, als die Zeilen
                noch auf verschiedene Unterseiten zeigten (Aufträge vs.
                Projekt-Aufgaben getrennt). Seit beides gemeinsam unter
                /aufgaben liegt, gibt es nur noch EIN Klickziel, und
                Aufträge/Projekt-Aufgaben stehen deshalb gleichwertig
                nebeneinander statt in getrennten Abschnitten. */}
            <Link
              href="/aufgaben"
              className="col-start-4 row-start-1 portrait:col-start-2 portrait:row-start-2 flex flex-col rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-gruen-dunkel bg-flaeche p-4 shadow-sm transition hover:border-marke-gruen-dunkel focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
            >
              <div className="flex items-center justify-between gap-1.5">
                <h2 className="text-lg font-semibold text-ueberschrift hover:underline">Aufgaben</h2>
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
                <p className="mt-2 text-xs text-sekundaer">Alles erledigt</p>
              ) : (
                <div className="mt-2 flex flex-1 flex-col gap-1.5">
                  {/* Aufträge (Offen/Angenommen) und Projekt-Aufgaben als
                      gleichwertige Zeilen — dieselbe Abstufung, kein
                      Abschnitt optisch bevorzugt. Erledigtes taucht hier
                      bewusst nicht auf, genau wie bei den anderen Kacheln. */}
                  {auftraegeStatus.offen > 0 && (
                    <div className="flex items-center justify-between text-xs text-primaer">
                      <span>Offen</span>
                      <span className="font-medium">{auftraegeStatus.offen}</span>
                    </div>
                  )}
                  {auftraegeStatus.angenommen > 0 && (
                    <div className="flex items-center justify-between text-xs text-primaer">
                      <span>Angenommen</span>
                      <span className="font-medium">{auftraegeStatus.angenommen}</span>
                    </div>
                  )}
                  {offeneProjektAufgaben.length > 0 && (
                    <div className="flex items-center justify-between text-xs text-primaer">
                      <span>Projekt-Aufgaben</span>
                      <span className="font-medium">{offeneProjektAufgaben.length}</span>
                    </div>
                  )}
                </div>
              )}
            </Link>

            <Link
              href="/wissen"
              className="col-start-3 row-start-2 portrait:col-start-1 portrait:row-start-3 flex flex-col justify-between rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-orange bg-flaeche p-4 shadow-sm transition hover:border-marke-orange focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
            >
              <div>
                <h2 className="text-lg font-semibold text-ueberschrift">Wissensbereich</h2>
                <p className="mt-2 text-sm text-sekundaer">
                  Wichtige Dokumente, abgestimmt auf die jeweilige Abteilung.
                </p>
              </div>
              <span className="text-sm font-semibold text-marke-gruen-dunkel">Zum Wissensbereich →</span>
            </Link>

            {/* Zeile 2, Spalte 4: das in /einstellungen
                ausgewählte "Weiteres"-Modul — genau eins von beiden, nie
                beide gleichzeitig (siehe Kommentar oben am Modul). Gleiches
                Kachel-Design wie die übrigen (weiß, neutraler Rahmen, Hover
                hebt den Rahmen in der eigenen Akzentfarbe hervor) statt
                einer Sonderfarbgebung — eine Kachel soll nicht anders
                aussehen, nur weil sie modular ist. */}
            {zeigeFahrzeuge && (
              <Link
                href={istWerkstatt ? "/fahrzeug-reservierungen" : "/fahrzeug-mieten"}
                className="col-start-4 row-start-2 portrait:col-start-2 portrait:row-start-3 flex flex-col justify-between rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-gruen bg-flaeche p-4 shadow-sm transition hover:border-marke-gruen focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
              >
                {istWerkstatt ? (
                  <>
                    <div>
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-ueberschrift">Fahrzeuge</h2>
                        {offeneAnfragen > 0 && (
                          <span
                            aria-label={`${offeneAnfragen} offene Anfragen`}
                            className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-marke-orange px-1 text-xs font-bold text-neutral-900"
                          >
                            {offeneAnfragen}
                          </span>
                        )}
                      </div>
                      {naechsteReservierungen.length === 0 ? (
                        <p className="mt-2 text-xs text-sekundaer">Keine anstehenden Reservierungen.</p>
                      ) : (
                        <ul className="mt-2 flex flex-col gap-1 text-xs text-sekundaer">
                          {naechsteReservierungen.map((r) => (
                            <li key={r.id}>
                              {r.geplantVon.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })} · {r.fahrzeug.bezeichnung}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-marke-gruen-dunkel">Zum Reservierungsmenü →</span>
                  </>
                ) : (
                  <>
                    <div>
                      <h2 className="text-lg font-semibold text-ueberschrift">Fahrzeug mieten</h2>
                      <p className="mt-2 text-sm text-sekundaer">Privat ein Firmenfahrzeug anfragen.</p>
                    </div>
                    <span className="text-sm font-semibold text-marke-gruen-dunkel">Jetzt anfragen →</span>
                  </>
                )}
              </Link>
            )}

            {zeigeTodoListe && (
              <div className="col-start-4 row-start-2 portrait:col-start-2 portrait:row-start-3 flex flex-col rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-gruen bg-flaeche p-4 shadow-sm transition hover:border-marke-gruen">
                <Link
                  href="/aufgaben"
                  className="flex items-center justify-between gap-1.5 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
                >
                  <h2 className="text-lg font-semibold text-ueberschrift hover:underline">To-Do-Liste</h2>
                  {offeneAufgaben.length > 0 && (
                    <span
                      aria-label={`${offeneAufgaben.length} offene Einträge in der To-Do-Liste`}
                      className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-marke-orange px-1 text-xs font-bold text-neutral-900"
                    >
                      {offeneAufgaben.length}
                    </span>
                  )}
                </Link>

                {naechsteTodos.length === 0 ? (
                  <p className="mt-2 text-xs text-sekundaer">Alles erledigt</p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {naechsteTodos.map((aufgabe) => (
                      <li key={aufgabe.id} title={aufgabe.titel} className="flex items-center gap-1.5">
                        <form action={aufgabeErledigtSetzen.bind(null, aufgabe.id, true)}>
                          <button
                            type="submit"
                            aria-label={`"${aufgabe.titel}" als erledigt markieren`}
                            className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-flaeche-300 transition hover:border-marke-gruen-dunkel"
                          />
                        </form>
                        <span className="truncate text-xs text-primaer">{aufgabe.titel}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {zeigeGeplanteAktionen && (
              <div className="col-start-4 row-start-2 portrait:col-start-2 portrait:row-start-3 flex flex-col rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-gruen bg-flaeche p-4 shadow-sm transition hover:border-marke-gruen">
                <Link
                  href="/geplante-aktionen"
                  className="flex items-center justify-between gap-1.5 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
                >
                  <h2 className="text-lg font-semibold text-ueberschrift hover:underline">Geplante Aktionen</h2>
                  {geplanteEintraege.length > 0 && (
                    <span
                      aria-label={`${geplanteEintraege.length} geplante Infos, To-Dos und Aufgaben`}
                      className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-marke-orange px-1 text-xs font-bold text-neutral-900"
                    >
                      {geplanteEintraege.length}
                    </span>
                  )}
                </Link>

                {naechsteGeplant.length === 0 ? (
                  <p className="mt-2 text-xs text-sekundaer">Keine geplanten Infos, To-Dos oder Aufgaben.</p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {naechsteGeplant.map((eintrag) => (
                      <li key={eintrag.id} title={eintrag.titel} className="flex items-center gap-1.5 text-xs">
                        <span aria-hidden className="shrink-0 text-tertiaer">
                          {eintrag.typ === "info" ? (
                            <Newspaper className="h-3.5 w-3.5" />
                          ) : eintrag.typ === "aufgabe" ? (
                            <CheckSquare className="h-3.5 w-3.5" />
                          ) : (
                            <ClipboardList className="h-3.5 w-3.5" />
                          )}
                        </span>
                        <span className="truncate text-primaer">{eintrag.titel}</span>
                        <span className="ml-auto shrink-0 text-tertiaer">
                          {eintrag.datum.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit" })}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
