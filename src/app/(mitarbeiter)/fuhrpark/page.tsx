import Link from "next/link"

import { berechtigung } from "@/lib/auth/berechtigung"
import { berlinerTagesbeginn } from "@/lib/datum"
import { fuhrparkFahrzeuge } from "@/lib/fuhrpark/abfragen"
import { fristStatus, reifenHinweis, schlimmsteStufe, REIFENART_TEXT, type FristStufe } from "@/lib/fuhrpark/fristen"
import { fuhrparkRechte } from "@/lib/fuhrpark/zugriff"
import { FristAnzeige } from "@/components/fuhrpark/frist-anzeige"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"

const REIHENFOLGE: Record<FristStufe, number> = { ueberfaellig: 0, bald: 1, ok: 2, offen: 3 }

/**
 * Fuhrpark: alle Firmenfahrzeuge auf einen Blick — Zuordnung (Standort bzw.
 * Halter) und die Fristen TÜV/Service samt Reifenart. Fahrzeuge mit
 * überfälligen oder bald fälligen Fristen stehen oben, damit nichts
 * versäumt wird.
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
  const fahrzeuge = (await fuhrparkFahrzeuge(kontext))
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
      <p className="mt-1 text-sm text-sekundaer">
        {darfAlleSehen
          ? "Alle Firmenfahrzeuge mit Zuordnung und Fristen. Fahrzeuge mit fälligem TÜV oder Service stehen oben."
          : "Die Fahrzeuge, für die du als Halter bzw. verantwortliche Person eingetragen bist."}
      </p>

      {fahrzeuge.length === 0 ? (
        <p className="mt-8 text-primaer">
          {darfAlleSehen ? "Noch kein Fahrzeug erfasst." : "Dir ist aktuell kein Fahrzeug zugeordnet."}
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {fahrzeuge.map((f) => {
            const hinweis = reifenHinweis(f.reifenart, heute)
            return (
              <li key={f.id}>
                <Link
                  href={`/fuhrpark/${f.id}`}
                  className={
                    "block rounded-xl border bg-flaeche p-4 transition hover:border-marke-gruen focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen " +
                    (f.stufe === "ueberfaellig" ? "border-red-500/60" : f.stufe === "bald" ? "border-marke-orange" : "border-rand")
                  }
                >
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-semibold text-ueberschrift">{f.bezeichnung}</span>
                    <span className="text-sm text-sekundaer">{f.kennzeichen}</span>
                    {f.fuerPrivatausleiheFreigegeben && (
                      <span className="rounded-full bg-marke-gruen/15 px-2 py-0.5 text-[11px] font-medium text-marke-gruen-dunkel">
                        Mietpark
                      </span>
                    )}
                    {f._count.schaeden > 0 && (
                      <span className="rounded-full bg-marke-orange/20 px-2 py-0.5 text-[11px] font-medium text-ueberschrift">
                        {f._count.schaeden === 1 ? "1 offener Schaden" : `${f._count.schaeden} offene Schäden`}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-sekundaer">
                    {f.standort ? f.standort.name : "Kein fester Standort"}
                    {" · "}
                    {f.halter ? `${f.halter.vorname} ${f.halter.nachname}` : "kein fester Halter"}
                    {f.zuordnungHinweis ? ` · ${f.zuordnungHinweis}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <FristAnzeige label="TÜV" faelligAm={f.huFaelligAm} heute={heute} />
                    <FristAnzeige label="Service" faelligAm={f.serviceFaelligAm} heute={heute} />
                    {f.reifenart && (
                      <span className="inline-flex items-center rounded-full bg-flaeche-100 px-2.5 py-1 text-xs font-medium text-primaer">
                        {REIFENART_TEXT[f.reifenart]}
                      </span>
                    )}
                  </div>
                  {hinweis && <p className="mt-2 text-xs text-sekundaer">{hinweis}</p>}
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <ZurueckButton />
    </main>
  )
}
