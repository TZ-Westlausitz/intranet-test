import Link from "next/link"

import { berechtigung } from "@/lib/auth/berechtigung"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import { FormularAenderungenSchutz } from "@/components/formular-aenderungen-schutz"
import { Hinweis } from "@/components/hinweis"
import { ProjektFormFelder, LEERE_PROJEKT_STANDARDWERTE } from "@/components/projekt-form-felder"
import { ProjektZeitstrahl } from "@/components/projekt-zeitstrahl"
import {
  projekteFuerPerson,
  alleProjekte,
  alleFertigenProjekte,
  zwischenzieleMitFortschritt,
} from "@/lib/projekte/abfragen"
import { projektErstellen } from "@/lib/projekte/aktionen"
import { PROJEKT_STATUS_KLASSEN, PROJEKT_STATUS_NAMEN } from "@/lib/projekte-optionen"
import { formatiereDatumAusDate, berlinerTagesbeginn } from "@/lib/datum"

const FEHLER_TEXTE: Record<string, string> = {
  pflichtfeld: "Bitte Titel, Ziel, Start und Enddatum ausfüllen.",
  zeitraum: "Das Enddatum darf nicht vor dem Start liegen.",
}

const TERMINAL_STATUS = ["ABGESCHLOSSEN", "ABGEBROCHEN"]

/** Kompakte Statuspille, für die "Fertige Projekte"-Zeilen (kein Zeitstrahl dort, siehe Kommentar unten). */
function StatusPille({ status }: { status: string }) {
  return (
    <span className={"shrink-0 rounded-full px-2.5 py-1 text-xs font-medium " + PROJEKT_STATUS_KLASSEN[status]}>
      {PROJEKT_STATUS_NAMEN[status]}
    </span>
  )
}

/**
 * "Meine Projekte" — für JEDE angemeldete Person aufrufbar (auch wenn die
 * Liste leer ist), nicht nur für Projektmanager. Sichtbar ist ein Projekt
 * ausschließlich über eine aktive Projektmitglied-Zeile (siehe
 * projekteFuerPerson), nicht über Standort/Abteilung/Rolle. Nur das
 * "Neues Projekt"-Formular ist an die Berechtigung "Projektmanager"
 * gekoppelt — ein ausgeblendetes Formular ist zwar keine Zugriffskontrolle
 * (Regel 5), aber projektErstellen prüft dieselbe Berechtigung serverseitig
 * noch einmal (siehe dort).
 *
 * Aufbau seit Rückmeldung 2026-09-30: oben zuerst die aktiven Projekte
 * (PLANUNG/AKTIV) als volle Kacheln mit Zeitstrahl-Vorschau — vorher gab
 * es dort nur eine schmale Zeile ohne jeden Fortschritt. Darunter
 * zweispaltig: links "Neues Projekt", rechts "Fertige Projekte"
 * (ABGESCHLOSSEN/ABGEBROCHEN) — dort bewusst OHNE Zeitstrahl, ein
 * abgeschlossenes Projekt braucht keinen Fortschrittsbalken mehr, nur
 * noch Name/Zeitraum/Status als Rückblick.
 */
export default async function ProjekteSeite({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string }>
}) {
  const kontext = await berechtigung()
  const { fehler } = await searchParams
  const darfAnlegen = kontext.berechtigungen.includes("Projektmanager")
  const heute = berlinerTagesbeginn()

  const [aktiveProjekte, fertigeProjekte] = kontext.adminModusAktiv
    ? await Promise.all([alleProjekte(), alleFertigenProjekte()])
    : await (async () => {
        const alle = await projekteFuerPerson(kontext.personId)
        return [
          alle.filter((p) => !TERMINAL_STATUS.includes(p.status)),
          alle.filter((p) => TERMINAL_STATUS.includes(p.status)),
        ] as const
      })()

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Kopfleiste />
      <h1 className="text-center text-2xl font-semibold text-ueberschrift md:text-left">
        {kontext.adminModusAktiv ? "Alle Projekte (Firma)" : "Projekte"}
      </h1>

      {fehler && (
        <div className="mt-4">
          <Hinweis>{FEHLER_TEXTE[fehler] ?? "Das hat nicht geklappt."}</Hinweis>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {aktiveProjekte.length === 0 ? (
          <p className="text-sm text-sekundaer">
            {kontext.adminModusAktiv
              ? "Aktuell keine aktiven Projekte in der Firma."
              : darfAnlegen
                ? "Noch keine aktiven Projekte."
                : "Du bist aktuell in keinem aktiven Projekt Mitglied."}
          </p>
        ) : (
          aktiveProjekte.map((projekt) => (
            <Link
              key={projekt.id}
              href={`/aufgaben/projekte/${projekt.id}`}
              className="rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-gruen bg-flaeche p-4 shadow-sm transition hover:border-marke-gruen"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="truncate text-lg font-semibold text-ueberschrift">{projekt.titel}</h2>
                <StatusPille status={projekt.status} />
              </div>
              <ProjektZeitstrahl
                start={projekt.start}
                ende={projekt.ende}
                heute={heute}
                zwischenziele={zwischenzieleMitFortschritt(projekt.zwischenziele, projekt.aufgaben)}
              />
            </Link>
          ))
        )}
      </div>

      <div className={"mt-8 grid grid-cols-1 gap-6" + (darfAnlegen ? " md:grid-cols-2" : "")}>
        {darfAnlegen && (
          <form
            action={projektErstellen}
            className="flex h-fit flex-col gap-3 rounded-xl border border-rand bg-flaeche p-4"
          >
            <h2 className="text-sm font-semibold text-ueberschrift">Neues Projekt</h2>
            <ProjektFormFelder standardwerte={LEERE_PROJEKT_STANDARDWERTE} />
            <button
              type="submit"
              className="ml-auto h-9 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
            >
              Anlegen
            </button>
            <FormularAenderungenSchutz />
          </form>
        )}

        <div className="flex h-fit flex-col gap-3 rounded-xl border border-rand bg-flaeche p-4">
          <h2 className="text-sm font-semibold text-ueberschrift">Fertige Projekte</h2>
          {fertigeProjekte.length === 0 ? (
            <p className="text-sm text-sekundaer">Noch kein Projekt abgeschlossen oder abgebrochen.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-flaeche-100">
              {fertigeProjekte.map((projekt) => (
                <li key={projekt.id}>
                  <Link
                    href={`/aufgaben/projekte/${projekt.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 transition hover:text-marke-gruen-dunkel"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ueberschrift">{projekt.titel}</p>
                      <p className="mt-0.5 text-xs text-tertiaer">
                        {formatiereDatumAusDate(projekt.start)} – {formatiereDatumAusDate(projekt.ende)}
                      </p>
                    </div>
                    <StatusPille status={projekt.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ZurueckButton />
    </main>
  )
}
