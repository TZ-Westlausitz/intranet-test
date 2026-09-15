import Link from "next/link"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { Kopfleiste } from "@/components/kopfleiste"
import { StatusBadge } from "@/components/status-badge"
import { ZurueckButton } from "@/components/zurueck-button"

/**
 * Alle eigenen Anfragen/Reservierungen auf einen Blick — unabhängig vom
 * Status, damit man auch sieht, was abgelehnt oder storniert wurde. Jede
 * Zeile führt zur Detailseite, wo auch die Nutzungsvereinbarung (PDF) und
 * die Stornieren-Option stehen.
 */
export default async function MeineAnfragenSeite() {
  const kontext = await berechtigung()

  const anfragen = await prisma.ausleihe.findMany({
    where: { entleiherId: kontext.personId },
    include: { fahrzeug: true },
    orderBy: { angefragtAm: "desc" },
  })

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Kopfleiste name={kontext.name} />
      <h1 className="text-2xl font-semibold text-ueberschrift">Meine Anfragen</h1>
      <p className="mt-1 text-sm text-primaer">
        Alle privat angefragten Fahrzeuge, mit Nutzungsvereinbarung und
        Stornieren-Option auf der jeweiligen Detailseite
      </p>

      {anfragen.length === 0 ? (
        <p className="mt-6 text-primaer">Noch keine Anfrage gestellt.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {anfragen.map((a) => (
            <li key={a.id}>
              <Link
                href={`/ausleihen/${a.id}`}
                className="block rounded-lg border border-rand p-4 transition hover:border-marke-gruen focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen focus-visible:outline-offset-2"
              >
                <p className="flex items-center justify-between gap-2 font-medium">
                  <span>{a.fahrzeug.bezeichnung}</span>
                  <StatusBadge status={a.status} />
                </p>
                <p className="mt-1 text-sm text-primaer">
                  {a.geplantVon.toLocaleDateString("de-DE")}–
                  {a.geplantBis.toLocaleDateString("de-DE")} · {a.zweck}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <ZurueckButton />
    </main>
  )
}
