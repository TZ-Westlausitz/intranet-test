import Link from "next/link"

import { berechtigung } from "@/lib/auth/berechtigung"
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

type Ansicht = "aktiv" | "neu" | "fertig"

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
 *
 * Auf dem Handy (Rückmeldung 2026-10-01, dasselbe Muster wie /aufgaben
 * und /formulare) ein Tab-Umschalter über `?ansicht=` statt aller drei
 * Abschnitte untereinander gestapelt — "Neues Projekt" nur, wenn
 * `darfAnlegen`. Anders als bei /aufgaben gibt es hier keinen
 * dialog-bedingten Zwang zu einem einzigen Baum, aber da die Seite schon
 * vorher ohne eigene Mobile/Desktop-Aufteilung auskam (keine `md:hidden`-
 * Bäume), bleibt es bei EINEM Baum mit CSS-Sichtbarkeit je Abschnitt
 * (`hidden md:flex`) statt einer zweiten Kopie — die aktiven und fertigen
 * Projekte sowie das Formular sind ohnehin schon jeweils eigenständige
 * Geschwister-Elemente, keine gemeinsam verschachtelte Spalte wie bei
 * /aufgaben, deshalb reicht das hier ohne den dortigen `md:contents`-Kniff.
 */
export default async function ProjekteSeite({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string; ansicht?: string }>
}) {
  const kontext = await berechtigung()
  const { fehler, ansicht: ansichtParam } = await searchParams
  const darfAnlegen = kontext.berechtigungen.includes("Projektmanager")
  const heute = berlinerTagesbeginn()

  const ansichten: { key: Ansicht; label: string }[] = [
    { key: "aktiv", label: "Aktive Projekte" },
    ...(darfAnlegen ? [{ key: "neu" as const, label: "Neues Projekt" }] : []),
    { key: "fertig", label: "Fertige Projekte" },
  ]
  const ansicht: Ansicht = ansichten.some((tab) => tab.key === ansichtParam) ? (ansichtParam as Ansicht) : "aktiv"

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
      <h1 className="text-center text-2xl font-semibold text-ueberschrift md:text-left">
        {kontext.adminModusAktiv ? "Alle Projekte (Firma)" : "Projekte"}
      </h1>

      <nav aria-label="Ansicht wählen" className="mt-6 flex border-b border-rand text-sm font-medium md:hidden">
        {ansichten.map((tab) => (
          <Link
            key={tab.key}
            href={`/aufgaben/projekte?ansicht=${tab.key}`}
            aria-current={ansicht === tab.key ? "page" : undefined}
            className={
              "flex-1 border-b-2 px-2 py-3 text-center transition " +
              (ansicht === tab.key ? "border-marke-gruen-dunkel text-ueberschrift" : "border-transparent text-tertiaer hover:text-primaer")
            }
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {fehler && (
        <div className="mt-4">
          <Hinweis>{FEHLER_TEXTE[fehler] ?? "Das hat nicht geklappt."}</Hinweis>
        </div>
      )}

      <div className={"mt-6 flex flex-col gap-3 " + (ansicht === "aktiv" ? "" : "hidden md:flex")}>
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
            className={"h-fit flex-col gap-3 rounded-xl border border-rand bg-flaeche p-4 " + (ansicht === "neu" ? "flex" : "hidden md:flex")}
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

        <div className={"h-fit flex-col gap-3 rounded-xl border border-rand bg-flaeche p-4 " + (ansicht === "fertig" ? "flex" : "hidden md:flex")}>
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
