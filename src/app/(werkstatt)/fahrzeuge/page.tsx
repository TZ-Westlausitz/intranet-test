import Link from "next/link"

import { Rolle } from "@/generated/prisma/enums"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"

/**
 * Einstieg in den Ausleihe-Vorgang: Fahrzeug antippen → Ausleihe anlegen.
 *
 * Offene Vorgänge, Übergabe und Rücknahme kommen als Nächstes dazu.
 */
export default async function Fahrzeuguebersicht() {
  const kontext = await berechtigung([Rolle.WERKSTATTLEITER, Rolle.ADMINISTRATION])

  const fahrzeuge = await prisma.fahrzeug.findMany({
    where: { aktiv: true, fuerPrivatausleiheFreigegeben: true },
    orderBy: { bezeichnung: "asc" },
  })

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Kopfleiste name={kontext.name} />
      <h1 className="text-2xl font-semibold text-ueberschrift">Fahrzeugausleihe</h1>
      <p className="mt-1 text-sm text-primaer">{kontext.rollen.join(", ")}</p>

      <h2 className="mt-8 text-lg font-medium">Für Privatausleihe freigegeben</h2>

      {fahrzeuge.length === 0 ? (
        <p className="mt-2 text-primaer">
          Noch kein Fahrzeug freigegeben. Der Seed legt eins an — läuft er?
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {fahrzeuge.map((f) => (
            <li key={f.id}>
              <Link
                href={`/fahrzeuge/${f.id}/ausleihe-anlegen`}
                className="block rounded-lg border border-rand p-4 transition hover:border-marke-gruen focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen focus-visible:outline-offset-2"
              >
                <span className="font-medium">{f.bezeichnung}</span>
                <span className="ml-2 text-sm text-primaer">{f.kennzeichen}</span>
                {f.merkmale && (
                  <span className="mt-1 block text-sm text-primaer">{f.merkmale}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <ZurueckButton />
    </main>
  )
}
