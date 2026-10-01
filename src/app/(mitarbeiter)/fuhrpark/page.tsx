import Link from "next/link"

import { berechtigung } from "@/lib/auth/berechtigung"
import { berlinerTagesbeginn } from "@/lib/datum"
import { fuhrparkFahrzeuge, fuhrparkOrte, fuhrparkAusgesonderteFahrzeuge } from "@/lib/fuhrpark/abfragen"
import { fahrzeugLoeschen } from "@/lib/fuhrpark/aktionen"
import { fristStatus, schlimmsteStufe, type FristStufe } from "@/lib/fuhrpark/fristen"
import { fuhrparkRechte } from "@/lib/fuhrpark/zugriff"
import { FuhrparkListe } from "@/components/fuhrpark/fuhrpark-liste"
import { FahrzeugLoeschenButton } from "@/components/fuhrpark/fahrzeug-loeschen-button"
import { ZurueckButton } from "@/components/zurueck-button"

const REIHENFOLGE: Record<FristStufe, number> = { ueberfaellig: 0, bald: 1, ok: 2, offen: 3 }

const FEHLER_TEXTE: Record<string, string> = {
  fahrzeugHatHistorie: "Dieses Fahrzeug hat noch Mietverlauf, Schäden oder Terminvorschläge und kann deshalb nicht gelöscht werden.",
}

/**
 * Fuhrpark: alle Firmenfahrzeuge auf einen Blick — Zuordnung (Standort bzw.
 * Halter) und die Fristen TÜV/Service samt Reifenart. Fahrzeuge mit
 * überfälligen oder bald fälligen Fristen stehen oben, damit nichts
 * versäumt wird. Filterleiste + Liste stehen in FuhrparkListe (Client
 * Component, Rückmeldung 2026-09-29): Suche und Auswahlfilter sollen
 * sofort wirken statt bei jeder Eingabe neu zu laden.
 *
 * Wer alle Fahrzeuge sehen darf (Werkstattleiter, "Fahrzeuge lesen"),
 * bekommt alle; jede andere Person nur die eigenen (als Halter/
 * Verantwortliche eingetragenen) — siehe fuhrparkFahrzeuge. Bearbeiten darf
 * nur die Werkstattleitung. Kein Fahrtenbuch, keine Fahrten (Regel 10).
 *
 * Ganz unten, eingeklappt und nur für die Werkstattleitung: ausgemusterte
 * Fahrzeuge (Rückmeldung 2026-09-29) — mit der Möglichkeit, sie endgültig
 * zu löschen. Nur Fahrzeuge OHNE Mietverlauf/Schäden/Terminvorschläge
 * lassen sich tatsächlich löschen (siehe fahrzeugLoeschen); mit Historie
 * zeigt die Zeile stattdessen einen Hinweis statt des Löschen-Knopfs.
 */
export default async function FuhrparkSeite({ searchParams }: { searchParams: Promise<{ fehler?: string }> }) {
  const kontext = await berechtigung()
  const { darfBearbeiten, darfAlleSehen } = fuhrparkRechte(kontext)
  const { fehler } = await searchParams

  const heute = berlinerTagesbeginn()
  const [rohFahrzeuge, orte, ausgesonderte] = await Promise.all([
    fuhrparkFahrzeuge(kontext),
    fuhrparkOrte(),
    darfBearbeiten ? fuhrparkAusgesonderteFahrzeuge() : Promise.resolve([]),
  ])
  const fahrzeuge = rohFahrzeuge
    .map((f) => ({
      ...f,
      stufe: schlimmsteStufe([fristStatus(f.huFaelligAm, heute).stufe, fristStatus(f.serviceFaelligAm, heute).stufe]),
    }))
    .sort((a, b) => REIHENFOLGE[a.stufe] - REIHENFOLGE[b.stufe] || a.bezeichnung.localeCompare(b.bezeichnung, "de"))

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-ueberschrift">Fuhrpark</h1>
        {darfBearbeiten && (
          <Link
            href="/fuhrpark/neu"
            className="flex h-9 items-center rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
          >
            + Fahrzeug
          </Link>
        )}
      </div>

      {fehler && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {FEHLER_TEXTE[fehler] ?? "Das hat nicht geklappt."}
        </p>
      )}

      {fahrzeuge.length === 0 ? (
        <p className="mt-8 text-primaer">
          {darfAlleSehen ? "Noch kein Fahrzeug erfasst." : "Dir ist aktuell kein Fahrzeug zugeordnet."}
        </p>
      ) : (
        <FuhrparkListe fahrzeuge={fahrzeuge} orte={orte} heute={heute} />
      )}

      {darfBearbeiten && ausgesonderte.length > 0 && (
        <details className="mt-8 rounded-xl border border-rand bg-flaeche">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-primaer">
            Ausgesonderte Fahrzeuge ({ausgesonderte.length})
          </summary>
          <ul className="flex flex-col divide-y divide-flaeche-100 border-t border-rand">
            {ausgesonderte.map((f) => {
              const hatHistorie = f._count.ausleihen + f._count.schaeden + f._count.terminvorschlaege > 0
              return (
                <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <Link href={`/fuhrpark/${f.id}`} className="truncate font-medium text-primaer hover:underline">
                      {f.bezeichnung}
                    </Link>
                    <span className="ml-2 text-sm text-sekundaer">{f.kennzeichen}</span>
                    {hatHistorie && (
                      <p className="mt-0.5 text-xs text-tertiaer">Hat Mietverlauf, Schäden oder Termine — kann nicht gelöscht werden.</p>
                    )}
                  </div>
                  {!hatHistorie && (
                    <FahrzeugLoeschenButton bezeichnung={`${f.bezeichnung} (${f.kennzeichen})`} action={fahrzeugLoeschen.bind(null, f.id)} />
                  )}
                </li>
              )
            })}
          </ul>
        </details>
      )}

      <ZurueckButton />
    </main>
  )
}
