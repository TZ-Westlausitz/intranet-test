import Link from "next/link"

import { berechtigung } from "@/lib/auth/berechtigung"
import { berlinerTagesbeginn } from "@/lib/datum"
import { fuhrparkFahrzeuge, fuhrparkOrte } from "@/lib/fuhrpark/abfragen"
import { fristStatus, schlimmsteStufe, type FristStufe } from "@/lib/fuhrpark/fristen"
import { fuhrparkRechte } from "@/lib/fuhrpark/zugriff"
import { FuhrparkListe } from "@/components/fuhrpark/fuhrpark-liste"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"

const REIHENFOLGE: Record<FristStufe, number> = { ueberfaellig: 0, bald: 1, ok: 2, offen: 3 }

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
 */
export default async function FuhrparkSeite() {
  const kontext = await berechtigung()
  const { darfBearbeiten, darfAlleSehen } = fuhrparkRechte(kontext)

  const heute = berlinerTagesbeginn()
  const [rohFahrzeuge, orte] = await Promise.all([fuhrparkFahrzeuge(kontext), fuhrparkOrte()])
  const fahrzeuge = rohFahrzeuge
    .map((f) => ({
      ...f,
      stufe: schlimmsteStufe([fristStatus(f.huFaelligAm, heute).stufe, fristStatus(f.serviceFaelligAm, heute).stufe]),
    }))
    .sort((a, b) => REIHENFOLGE[a.stufe] - REIHENFOLGE[b.stufe] || a.bezeichnung.localeCompare(b.bezeichnung, "de"))

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Kopfleiste />
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

      {fahrzeuge.length === 0 ? (
        <p className="mt-8 text-primaer">
          {darfAlleSehen ? "Noch kein Fahrzeug erfasst." : "Dir ist aktuell kein Fahrzeug zugeordnet."}
        </p>
      ) : (
        <FuhrparkListe fahrzeuge={fahrzeuge} orte={orte} heute={heute} />
      )}

      <ZurueckButton />
    </main>
  )
}
