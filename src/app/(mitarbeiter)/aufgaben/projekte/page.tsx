import Link from "next/link"

import { berechtigung } from "@/lib/auth/berechtigung"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import { Hinweis } from "@/components/hinweis"
import { ProjektFormFelder, LEERE_PROJEKT_STANDARDWERTE } from "@/components/projekt-form-felder"
import { projekteFuerPerson } from "@/lib/projekte/abfragen"
import { projektErstellen } from "@/lib/projekte/aktionen"
import { PROJEKT_STATUS_KLASSEN, PROJEKT_STATUS_NAMEN } from "@/lib/projekte-optionen"
import { formatiereDatumAusDate } from "@/lib/datum"

const FEHLER_TEXTE: Record<string, string> = {
  pflichtfeld: "Bitte Titel, Ziel, Start und Enddatum ausfüllen.",
  zeitraum: "Das Enddatum darf nicht vor dem Start liegen.",
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
 */
export default async function ProjekteSeite({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string }>
}) {
  const kontext = await berechtigung()
  const { fehler } = await searchParams
  const projekte = await projekteFuerPerson(kontext.personId)
  const darfAnlegen = kontext.berechtigungen.includes("Projektmanager")

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Kopfleiste name={kontext.name} />
      <h1 className="text-center text-2xl font-semibold text-marke-grau md:text-left">Projekte</h1>

      {fehler && (
        <div className="mt-4">
          <Hinweis>{FEHLER_TEXTE[fehler] ?? "Das hat nicht geklappt."}</Hinweis>
        </div>
      )}

      {darfAnlegen && (
        <form
          action={projektErstellen}
          className="mt-6 flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4"
        >
          <h2 className="text-sm font-semibold text-marke-grau">Neues Projekt</h2>
          <ProjektFormFelder standardwerte={LEERE_PROJEKT_STANDARDWERTE} />
          <button
            type="submit"
            className="ml-auto h-9 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
          >
            Anlegen
          </button>
        </form>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {projekte.length === 0 ? (
          <p className="text-sm text-neutral-500">
            {darfAnlegen ? "Noch keine Projekte." : "Du bist aktuell in keinem Projekt Mitglied."}
          </p>
        ) : (
          projekte.map((projekt) => (
            <Link
              key={projekt.id}
              href={`/aufgaben/projekte/${projekt.id}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-marke-gruen-dunkel"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-marke-grau">{projekt.titel}</p>
                <p className="mt-0.5 text-xs text-neutral-400">
                  {formatiereDatumAusDate(projekt.start)} – {formatiereDatumAusDate(projekt.ende)}
                </p>
              </div>
              <span
                className={"shrink-0 rounded-full px-2.5 py-1 text-xs font-medium " + PROJEKT_STATUS_KLASSEN[projekt.status]}
              >
                {PROJEKT_STATUS_NAMEN[projekt.status]}
              </span>
            </Link>
          ))
        )}
      </div>

      <ZurueckButton />
    </main>
  )
}
