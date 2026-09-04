import Link from "next/link"

import { berechtigung } from "@/lib/auth/berechtigung"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import { aufgabenFuerPerson } from "@/lib/aufgaben/abfragen"
import { offeneAuftraegeAnzahl } from "@/lib/auftraege/abfragen"
import { projekteFuerPerson } from "@/lib/projekte/abfragen"

/**
 * Einstieg in den Aufgaben-Baustein — drei Unterbereiche als Kacheln,
 * dasselbe Muster wie die Startseite (siehe src/app/page.tsx): To-dos
 * (rein persönlich), Aufgaben (Aufträge an/von anderen Personen) und
 * Projekte (größere, mehrpersonige Vorhaben mit Zeitstrahl).
 *
 * Die Projekte-Kachel selbst ist für JEDE Person ein echter Link — die
 * eigentliche Einschränkung sitzt nicht hier (ein ausgeblendeter Knopf
 * wäre keine Zugriffskontrolle, Regel 5), sondern auf der Zielseite
 * selbst: Sichtbar ist dort nur, wer aktives Mitglied eines Projekts ist,
 * und nur mit der Berechtigung "Projektmanager" lässt sich überhaupt eins
 * anlegen (siehe /aufgaben/projekte).
 */
export default async function AufgabenUebersichtSeite() {
  const kontext = await berechtigung()

  const [{ offen: todosOffen }, offeneAuftraege, projekte] = await Promise.all([
    aufgabenFuerPerson(kontext.personId),
    offeneAuftraegeAnzahl(kontext.personId),
    projekteFuerPerson(kontext.personId),
  ])

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Kopfleiste name={kontext.name} />
      <h1 className="text-center text-2xl font-semibold text-marke-grau md:text-left">Aufgaben</h1>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          href="/aufgaben/todos"
          className="flex flex-col justify-between rounded-2xl border border-x-neutral-200 border-b-neutral-200 border-t-4 border-t-marke-gruen-dunkel bg-white p-4 shadow-sm transition hover:border-marke-gruen-dunkel focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-marke-grau">To-dos</h2>
            {todosOffen.length > 0 && (
              <span
                aria-label={`${todosOffen.length} offene To-dos`}
                className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-marke-orange px-1 text-xs font-bold text-neutral-900"
              >
                {todosOffen.length}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-neutral-500">Deine eigene To-do-Liste zum Abhaken.</p>
        </Link>

        <Link
          href="/aufgaben/auftraege"
          className="flex flex-col justify-between rounded-2xl border border-x-neutral-200 border-b-neutral-200 border-t-4 border-t-marke-orange bg-white p-4 shadow-sm transition hover:border-marke-orange focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-marke-grau">Aufgaben</h2>
            {offeneAuftraege > 0 && (
              <span
                aria-label={`${offeneAuftraege} dir zugewiesene offene Aufgaben`}
                className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-marke-orange px-1 text-xs font-bold text-neutral-900"
              >
                {offeneAuftraege}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-neutral-500">Aufgaben, die du vergeben hast oder die dir zugewiesen wurden.</p>
        </Link>

        <Link
          href="/aufgaben/projekte"
          className="flex flex-col justify-between rounded-2xl border border-x-neutral-200 border-b-neutral-200 border-t-4 border-t-marke-gruen bg-white p-4 shadow-sm transition hover:border-marke-gruen focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-marke-grau">Projekte</h2>
            {projekte.length > 0 && (
              <span
                aria-label={`${projekte.length} eigene Projekte`}
                className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-marke-orange px-1 text-xs font-bold text-neutral-900"
              >
                {projekte.length}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-neutral-500">Größere Vorhaben mit mehreren Beteiligten und Zeitstrahl.</p>
        </Link>
      </div>

      <ZurueckButton />
    </main>
  )
}
