import Link from "next/link"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { AusleiheStatus, Rolle } from "@/generated/prisma/enums"
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
import { BAUSTEINE } from "@/lib/bausteine"

/**
 * DIE ZWEI STUNDEN VERSICHERUNG — Fortsetzung.
 *
 * Auf dem Handy bleibt die Startseite bewusst die einfache Modul-Liste von
 * vorher (mobile first: der Werkstattleiter steht damit am Fahrzeug). Ab
 * Tablet/Desktop (`md:` aufwärts) kommt die besprochene Kachel-Startseite
 * dazu: sechs quadratische Kacheln in der Bildschirmmitte — die zwei linken
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

const MODULE = [
  {
    pfad: "/fahrzeug-mieten",
    name: "Fahrzeug mieten",
    beschreibung: "Privat ein Firmenfahrzeug anfragen",
    // Keine Rolleneinschränkung: jede aktive Person darf anfragen.
  },
  {
    pfad: "/meine-anfragen",
    name: "Meine Anfragen",
    beschreibung: "Eigene Anfragen, Nutzungsvereinbarung, Stornieren",
    // Keine Rolleneinschränkung: jede aktive Person sieht ihre eigenen.
  },
  // Nächste Module hier ergänzen.
]

export default async function Startseite() {
  const kontext = await berechtigung()
  const heute = new Date()

  const istWerkstatt =
    kontext.rollen.includes(Rolle.WERKSTATTLEITER) ||
    kontext.rollen.includes(Rolle.ADMINISTRATION)

  // Welches "Weiteres"-Modul für Zeile 2, Spalte 4 eingestellt ist (siehe
  // /einstellungen) — ohne eigene Einstellung greift der
  // erste Eintrag der Liste als Default (aktuell Fahrzeuge, das bisherige
  // Verhalten für alle, die die Einstellung noch nicht angefasst haben).
  const [person, weiteresEintrag] = [
    await prisma.person.findUniqueOrThrow({
      where: { benutzername: kontext.personId },
      select: { startseiteWeiteresModul: true },
    }),
    BAUSTEINE.find((baustein) => baustein.unterpunkte),
  ]
  const weiteresModule = weiteresEintrag?.unterpunkte ?? []
  const ausgewaehltesModul = person.startseiteWeiteresModul ?? weiteresModule[0]?.name ?? ""
  const zeigeFahrzeuge = ausgewaehltesModul === "Fahrzeuge"
  const zeigeTodoListe = ausgewaehltesModul === "To-Do-Liste"
  const zeigeGeplanteAktionen = ausgewaehltesModul === "Geplante Aktionen"

  // Nur abfragen, wenn die Fahrzeuge-Kachel für diese Person überhaupt
  // sichtbar ist (Werkstatt-Rolle UND als Startseiten-Modul ausgewählt).
  const [offeneAnfragen, naechsteReservierungen] = istWerkstatt && zeigeFahrzeuge
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

  // Nur abfragen, wenn die "Geplante Aktionen"-Kachel überhaupt sichtbar ist.
  const [naechsteGeplantInfosListe, naechsteGeplantAufgabenListe, naechsteGeplantAuftraegeListe] = zeigeGeplanteAktionen
    ? await Promise.all([
        naechsteGeplantInfos(kontext.personId, 5),
        naechsteGeplantAufgaben(kontext.personId, 5),
        naechsteGeplantAuftraege(kontext.personId, 5),
      ])
    : [[], [], []]

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
    }))
  // Die Aufgaben-Kachel zeigt jetzt nur noch Aufträge (mit Offen/
  // Angenommen-Abstufung) und Projekt-Aufgaben — die To-Do-Liste hat eine
  // eigene Kachel weiter unten im Raster.
  const auftraegeGesamtOffen = auftraegeStatus.offen + auftraegeStatus.angenommen
  const aufgabenGesamtOffen = auftraegeGesamtOffen + offeneProjektAufgaben.length
  const terminVorschau = termin
    ? `${
        istGleicherTag(termin.beginn, heute)
          ? termin.beginn.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr"
          : termin.beginn.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" })
      } · ${termin.titel}`
    : null

  return (
    <>
      {/* Handy: unverändert die einfache Modul-Liste. */}
      <main className="mx-auto max-w-2xl px-5 py-10 md:hidden">
        <Kopfleiste name={kontext.name} />

        <ul className="flex flex-col gap-3">
          {MODULE.map((modul) => (
            <li key={modul.pfad}>
              <Link
                href={modul.pfad}
                className="block rounded-lg border border-rand p-4 transition hover:border-marke-gruen focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen focus-visible:outline-offset-2"
              >
                <span className="block font-medium">{modul.name}</span>
                <span className="mt-1 block text-sm text-primaer">{modul.beschreibung}</span>
              </Link>
            </li>
          ))}

          {istWerkstatt && (
            <li className="rounded-lg border border-rand p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">Fahrzeug Reservierungen</span>
                {offeneAnfragen > 0 && (
                  <span
                    aria-label={`${offeneAnfragen} offene Anfragen`}
                    className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-marke-orange px-1.5 text-xs font-bold text-neutral-900"
                  >
                    {offeneAnfragen}
                  </span>
                )}
              </div>

              {naechsteReservierungen.length === 0 ? (
                <p className="mt-2 text-sm text-primaer">Keine anstehenden Reservierungen.</p>
              ) : (
                <ul className="mt-2 flex flex-col gap-1.5">
                  {naechsteReservierungen.map((r) => (
                    <li key={r.id} className="text-sm text-primaer">
                      <span className="font-medium text-primaer">
                        {r.geplantVon.toLocaleDateString("de-DE")}–
                        {r.geplantBis.toLocaleDateString("de-DE")}
                      </span>{" "}
                      · {r.fahrzeug.bezeichnung} · {r.entleiher.vorname} {r.entleiher.nachname}
                    </li>
                  ))}
                </ul>
              )}

              <Link
                href="/fahrzeug-reservierungen"
                className="mt-3 inline-block rounded-lg bg-marke-gruen px-3 py-1.5 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
              >
                Zum Reservierungsmenü
              </Link>
            </li>
          )}
        </ul>
      </main>

      {/* Tablet/Desktop: Kachel-Startseite füllt genau die Höhe, die das
          Root-Layout ihr unter der festen Kopfzeile lässt (md:h-full auf
          der flex-1-Fläche dort) — kein eigenes min-h-screen mehr, sonst
          würde die Seite unter der Kopfzeile wieder über eine Bildschirm-
          höhe hinauswachsen. */}
      <main className="hidden h-full flex-col md:flex">
        <div className="flex flex-1 flex-col items-center justify-center overflow-auto bg-gradient-to-br from-marke-gruen/5 via-background to-marke-orange/5 p-6">
          {/* 4 Spalten statt 4 einzelne Kacheln: Newsfeed nimmt per
              col-span-2 zwei davon ein und bleibt durch row-span-2 genauso
              hoch wie breit — ein großer quadratischer Block statt eines
              schmalen Streifens, damit später Posts (auch mit Fotos)
              hineinpassen. Die Tile-Größe ist zusätzlich per "22vw"
              begrenzt (nicht nur wie bisher per rem/vh) — sonst würde das
              jetzt breitere Grid auf schmaleren Bildschirmen (z. B. das
              1024px-Tablet) über den Rand hinauswachsen. */}
          <div className="grid grid-cols-[repeat(4,min(23rem,33vh,26vw))] grid-rows-[repeat(2,min(23rem,33vh,26vw))] gap-[min(2.25rem,4vh)]">
            <NewsfeedHomeKachel infos={newsfeedKarten} offeneBestaetigungen={offeneBestaetigungen} />

            <Link
              href="/kalender"
              className="col-start-3 row-start-1 flex flex-col rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-orange bg-flaeche p-4 text-center shadow-sm transition hover:border-marke-orange focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
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
              className="col-start-4 row-start-1 flex flex-col rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-gruen-dunkel bg-flaeche p-4 shadow-sm transition hover:border-marke-gruen-dunkel focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
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
              className="col-start-3 row-start-2 flex flex-col justify-between rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-orange bg-flaeche p-4 shadow-sm transition hover:border-marke-orange focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
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
                className="col-start-4 row-start-2 flex flex-col justify-between rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-gruen bg-flaeche p-4 shadow-sm transition hover:border-marke-gruen focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
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
                              {r.geplantVon.toLocaleDateString("de-DE")} · {r.fahrzeug.bezeichnung}
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
              <div className="col-start-4 row-start-2 flex flex-col rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-gruen bg-flaeche p-4 shadow-sm transition hover:border-marke-gruen">
                <Link
                  href="/aufgaben/todos"
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
              <div className="col-start-4 row-start-2 flex flex-col rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-gruen bg-flaeche p-4 shadow-sm transition hover:border-marke-gruen">
                <Link
                  href="/geplante-aktionen"
                  className="flex items-center justify-between gap-1.5 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
                >
                  <h2 className="text-lg font-semibold text-ueberschrift hover:underline">Geplante Aktionen</h2>
                  {geplanteEintraege.length > 0 && (
                    <span
                      aria-label={`${geplanteEintraege.length} geplante Infos, Aufgaben und Aufträge`}
                      className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-marke-orange px-1 text-xs font-bold text-neutral-900"
                    >
                      {geplanteEintraege.length}
                    </span>
                  )}
                </Link>

                {naechsteGeplant.length === 0 ? (
                  <p className="mt-2 text-xs text-sekundaer">Keine geplanten Infos, Aufgaben oder Aufträge.</p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {naechsteGeplant.map((eintrag) => (
                      <li key={eintrag.id} title={eintrag.titel} className="flex items-center gap-1.5 text-xs">
                        <span aria-hidden className="shrink-0">
                          {eintrag.typ === "info" ? "📰" : eintrag.typ === "aufgabe" ? "☑" : "📌"}
                        </span>
                        <span className="truncate text-primaer">{eintrag.titel}</span>
                        <span className="ml-auto shrink-0 text-tertiaer">
                          {eintrag.datum.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
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
