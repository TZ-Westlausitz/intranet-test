import Link from "next/link"

import { berechtigung } from "@/lib/auth/berechtigung"
import { ZurueckButton } from "@/components/zurueck-button"
import { formatiereDatumAusDate } from "@/lib/datum"
import { anstehendeJubilaeen } from "@/lib/jubilaeen/abfragen"
import { NACHFRIST_TAGE, VORSCHAU_MONATE } from "@/lib/jubilaeen/berechnung"

function wannText(tage: number): string {
  if (tage === 0) return "heute"
  if (tage === 1) return "morgen"
  if (tage > 1) return `in ${tage} Tagen`
  return `vor ${-tage} Tagen`
}

/**
 * Anstehende Firmenjubiläen (3, 5, 10 … 50 Jahre ab dem Eintrittsdatum) —
 * nur für den Adminbereich, damit Leitungskräfte rechtzeitig gratulieren
 * können. Dazu kommt eine Mitteilung in der Glocke einen Monat vorher
 * (siehe src/lib/jubilaeen/hinweise.ts).
 */
export default async function JubilaeenSeite({
  searchParams,
}: {
  searchParams: Promise<{ hinweis?: string }>
}) {
  await berechtigung({ benoetigteBerechtigung: "Adminbereich" })
  const { hinweis } = await searchParams
  const { zeilen, ohneEintrittsdatum } = await anstehendeJubilaeen()

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="text-center text-2xl font-semibold text-ueberschrift md:text-left">Jubiläen</h1>
      <p className="mt-1 text-center text-sm text-sekundaer md:text-left">
        Die nächsten {VORSCHAU_MONATE} Monate und die letzten {NACHFRIST_TAGE} Tage.
      </p>

      <ul className="mt-6 flex flex-col divide-y divide-flaeche-100 rounded-xl border border-rand bg-flaeche">
        {zeilen.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-sekundaer">Keine anstehenden Jubiläen.</li>
        ) : (
          zeilen.map((zeile) => {
            const hervorgehoben = hinweis === encodeURIComponent(`${zeile.benutzername}_${zeile.jahre}`) || hinweis === `${zeile.benutzername}_${zeile.jahre}`
            return (
              <li
                key={`${zeile.benutzername}-${zeile.jahre}`}
                className={"flex flex-wrap items-center justify-between gap-2 px-4 py-3 " + (hervorgehoben ? "bg-marke-gruen/10" : "")}
              >
                <div className="min-w-0">
                  <p className="font-medium text-ueberschrift">
                    {zeile.name} <span className="font-normal text-sekundaer">· {zeile.jahre} Jahre</span>
                  </p>
                  {zeile.abteilungen.length > 0 && <p className="text-xs text-tertiaer">{zeile.abteilungen.join(", ")}</p>}
                </div>
                <div className="text-right text-sm">
                  <p className="text-primaer">{formatiereDatumAusDate(zeile.datum)}</p>
                  <p className={"text-xs " + (zeile.tage < 0 ? "text-tertiaer" : zeile.tage <= 30 ? "font-medium text-marke-gruen-dunkel" : "text-sekundaer")}>
                    {wannText(zeile.tage)}
                  </p>
                </div>
              </li>
            )
          })
        )}
      </ul>

      {ohneEintrittsdatum > 0 && (
        <p className="mt-4 text-sm text-sekundaer">
          Bei {ohneEintrittsdatum} aktiven Personen fehlt noch das Eintrittsdatum —{" "}
          <Link href="/admin/benutzer" className="font-medium text-marke-gruen-dunkel hover:underline">
            in der Benutzerverwaltung nachtragen
          </Link>
          .
        </p>
      )}

      <ZurueckButton />
    </main>
  )
}
