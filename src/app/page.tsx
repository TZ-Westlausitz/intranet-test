import Link from "next/link"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { AusleiheStatus, Rolle } from "@/generated/prisma/enums"
import { Kopfleiste } from "@/components/kopfleiste"
import { MONATSNAMEN, istGleicherTag } from "@/lib/kalender"
import { naechsterTermin, faelligeErinnerungenAnzahl } from "@/lib/termine/abfragen"
import { aufgabenFuerPerson } from "@/lib/aufgaben/abfragen"
import { aufgabeErledigtSetzen } from "@/lib/aufgaben/aktionen"

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
 * Die "modular einstellbare" sechste Kachel zeigt vorerst rollenbasiert die
 * Startansicht der Fahrzeugausleihe (Werkstattleitung sieht die
 * Reservierungsübersicht, alle anderen "Fahrzeug mieten") — eine echte
 * Auswahl durch die Mitarbeitenden selbst ist ein späterer Schritt, siehe
 * Memory kachel-dashboard-berechtigungen.
 *
 * Beide Fassungen rendern serverseitig gleichzeitig, nur per Tailwind
 * `md:`-Klassen ein-/ausgeblendet — kein Geräte-Sniffing, keine zwei
 * Datenabfragen.
 *
 * Ab Tablet/Desktop passt die Kachel-Startseite bewusst IMMER auf eine
 * Bildschirmhöhe, ohne Scrollen — die Kachelgröße ist deshalb nicht in
 * festen rem-Werten je Breakpoint gesetzt, sondern als
 * `min(19rem, Nvh)`: Sie wächst mit der Bildschirmhöhe, ist aber nach oben
 * (19rem) UND nach unten (durch den vh-Anteil) begrenzt. Genau das hat
 * vorher das Problem mit dem 4:3-Tablet in Landschaft gelöst (1024×768 —
 * schmal genug für die volle Breite, aber zu niedrig für feste große
 * Kacheln) und funktioniert jetzt automatisch für JEDE Bildschirmhöhe statt
 * nur für einen einzelnen getesteten Fall. Scrollen soll es später INNERHALB
 * einzelner Kacheln oder auf den Unterseiten geben, nicht auf dieser Seite
 * selbst.
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

  // Nur abfragen, wenn die Werkstatt-Kachel überhaupt sichtbar ist.
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

  const [termin, faelligeErinnerungen, { offen: offeneAufgaben }] = await Promise.all([
    naechsterTermin(kontext.personId, heute),
    faelligeErinnerungenAnzahl(kontext.personId, heute),
    aufgabenFuerPerson(kontext.personId),
  ])
  // Höchstens 3 in der Kachel, je nach Platz — auf schmaleren
  // Bildschirmen (md, aber noch nicht lg) blendet sich die dritte Zeile
  // per CSS wieder aus (siehe unten), damit die Kachel nicht überläuft.
  const naechsteAufgaben = offeneAufgaben.slice(0, 3)
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
                className="block rounded-lg border border-neutral-200 p-4 transition hover:border-marke-gruen focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen focus-visible:outline-offset-2"
              >
                <span className="block font-medium">{modul.name}</span>
                <span className="mt-1 block text-sm text-neutral-600">{modul.beschreibung}</span>
              </Link>
            </li>
          ))}

          {istWerkstatt && (
            <li className="rounded-lg border border-neutral-200 p-4">
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
                <p className="mt-2 text-sm text-neutral-600">Keine anstehenden Reservierungen.</p>
              ) : (
                <ul className="mt-2 flex flex-col gap-1.5">
                  {naechsteReservierungen.map((r) => (
                    <li key={r.id} className="text-sm text-neutral-600">
                      <span className="font-medium text-neutral-800">
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
        <div className="flex flex-1 items-center justify-center overflow-auto bg-gradient-to-br from-marke-gruen/5 via-white to-marke-orange/5 p-6">
          {/* 4 Spalten statt 4 einzelne Kacheln: Newsfeed nimmt per
              col-span-2 zwei davon ein und bleibt durch row-span-2 genauso
              hoch wie breit — ein großer quadratischer Block statt eines
              schmalen Streifens, damit später Posts (auch mit Fotos)
              hineinpassen. Die Tile-Größe ist zusätzlich per "22vw"
              begrenzt (nicht nur wie bisher per rem/vh) — sonst würde das
              jetzt breitere Grid auf schmaleren Bildschirmen (z. B. das
              1024px-Tablet) über den Rand hinauswachsen. */}
          <div className="grid grid-cols-[repeat(4,min(19rem,28vh,22vw))] grid-rows-[repeat(2,min(19rem,28vh,22vw))] gap-[min(2rem,3.5vh)]">
            <div className="col-span-2 row-span-2 flex flex-col justify-between rounded-2xl border border-x-neutral-200 border-b-neutral-200 border-t-4 border-t-marke-gruen bg-white p-5 shadow-sm">
              <div>
                <h2 className="text-xl font-semibold text-marke-grau">Newsfeed</h2>
                <p className="mt-2 text-sm text-neutral-500">
                  Hier entstehen künftig aktuelle Neuigkeiten und Ankündigungen aus dem TPZ.
                </p>
              </div>
              <p className="text-xs text-neutral-400">Noch nicht verfügbar</p>
            </div>

            <Link
              href="/kalender"
              className="col-start-3 row-start-1 flex flex-col rounded-2xl border border-x-neutral-200 border-b-neutral-200 border-t-4 border-t-marke-orange bg-white p-4 text-center shadow-sm transition hover:border-marke-orange focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
            >
              <div className="flex items-center justify-center gap-1.5">
                <h2 className="text-lg font-semibold text-marke-grau">Kalender</h2>
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
                <span className="text-5xl font-bold leading-none text-marke-grau">{heute.getDate()}</span>
                <span className="mt-1.5 text-sm font-medium text-neutral-500">
                  {MONATSNAMEN[heute.getMonth()]}
                </span>
              </div>
              <p className="truncate text-xs font-medium text-neutral-500">
                {terminVorschau ?? "Keine anstehenden Termine"}
              </p>
            </Link>

            {/* Bewusst keine ganze Kachel als EIN Link (anders als
                Kalender/Fahrzeuge) — hier gibt es mehrere unabhängige
                Klickziele (Überschrift + je ein Abhak-Knopf pro Zeile),
                und ein <button> in einem <a> ist ungültiges HTML. Der
                Rahmen-Hover-Effekt bleibt trotzdem identisch: `hover:`
                greift auch auf einem <div>, nicht nur auf Links. */}
            <div className="col-start-4 row-start-1 flex flex-col rounded-2xl border border-x-neutral-200 border-b-neutral-200 border-t-4 border-t-marke-gruen-dunkel bg-white p-4 shadow-sm transition hover:border-marke-gruen-dunkel">
              <Link
                href="/aufgaben"
                className="flex items-center justify-between gap-1.5 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
              >
                <h2 className="text-lg font-semibold text-marke-grau hover:underline">Aufgaben</h2>
                {offeneAufgaben.length > 0 && (
                  <span
                    aria-label={`${offeneAufgaben.length} offene Aufgabe${offeneAufgaben.length === 1 ? "" : "n"}`}
                    className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-marke-orange px-1 text-xs font-bold text-neutral-900"
                  >
                    {offeneAufgaben.length}
                  </span>
                )}
              </Link>

              {naechsteAufgaben.length === 0 ? (
                <p className="mt-2 text-xs text-neutral-500">Alles erledigt</p>
              ) : (
                <ul className="mt-2 flex flex-col gap-1.5">
                  {naechsteAufgaben.map((aufgabe, index) => (
                    <li
                      key={aufgabe.id}
                      title={aufgabe.titel}
                      className={"flex items-center gap-1.5 " + (index === 2 ? "hidden lg:flex" : "")}
                    >
                      {/* Schnell-Abhaken direkt in der Kachel, wie bei den
                          Erinnerungs-Apps am Handy — kein Umweg über die
                          volle Aufgaben-Seite für den Alltagsfall
                          "kurz was abhaken". */}
                      <form action={aufgabeErledigtSetzen.bind(null, aufgabe.id, true)}>
                        <button
                          type="submit"
                          aria-label={`"${aufgabe.titel}" als erledigt markieren`}
                          className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-neutral-300 transition hover:border-marke-gruen-dunkel"
                        />
                      </form>
                      <span className="truncate text-xs text-neutral-600">{aufgabe.titel}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="col-start-3 row-start-2 flex flex-col justify-between rounded-2xl border border-x-neutral-200 border-b-neutral-200 border-t-4 border-t-marke-orange bg-white p-4 shadow-sm">
              <div>
                <h2 className="text-lg font-semibold text-marke-grau">Wissensbereich</h2>
                <p className="mt-2 text-sm text-neutral-500">
                  Wichtige Dokumente, abgestimmt auf die jeweilige Abteilung.
                </p>
              </div>
              <p className="text-xs text-neutral-400">Noch nicht verfügbar</p>
            </div>

            {/* Modular einstellbare 6. Kachel — vorerst rollenbasiert die
                Fahrzeugausleihe. Gleiches Kachel-Design wie Kalender/Aufgaben
                (weiß, neutraler Rahmen, Hover hebt den Rahmen in der
                eigenen Akzentfarbe hervor) statt der früheren
                Sonderfarbgebung — eine Kachel soll nicht anders aussehen
                als die übrigen, nur weil sie modular ist. */}
            <Link
              href={istWerkstatt ? "/fahrzeug-reservierungen" : "/fahrzeug-mieten"}
              className="col-start-4 row-start-2 flex flex-col justify-between rounded-2xl border border-x-neutral-200 border-b-neutral-200 border-t-4 border-t-marke-gruen bg-white p-4 shadow-sm transition hover:border-marke-gruen focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
            >
              {istWerkstatt ? (
                <>
                  <div>
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-marke-grau">Fahrzeuge</h2>
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
                      <p className="mt-2 text-xs text-neutral-500">Keine anstehenden Reservierungen.</p>
                    ) : (
                      <ul className="mt-2 flex flex-col gap-1 text-xs text-neutral-500">
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
                    <h2 className="text-lg font-semibold text-marke-grau">Fahrzeug mieten</h2>
                    <p className="mt-2 text-sm text-neutral-500">Privat ein Firmenfahrzeug anfragen.</p>
                  </div>
                  <span className="text-sm font-semibold text-marke-gruen-dunkel">Jetzt anfragen →</span>
                </>
              )}
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
