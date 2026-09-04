import Link from "next/link"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"

/**
 * Selbstbedienung: Fahrzeug auswählen, um eine private Ausleihe anzufragen.
 *
 * Bewusst ohne Rolleneinschränkung in `berechtigung()` — jede angemeldete,
 * aktive Person darf ein Fahrzeug anfragen. Was danach mit der Anfrage
 * passiert (bestätigen/ablehnen), entscheidet die Werkstattleitung unter
 * /anfragen.
 */
export default async function FahrzeugMietenSeite() {
  const kontext = await berechtigung()

  const fahrzeuge = await prisma.fahrzeug.findMany({
    where: { aktiv: true, fuerPrivatausleiheFreigegeben: true },
    orderBy: { bezeichnung: "asc" },
  })

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Kopfleiste name={kontext.name} />
      <h1 className="text-2xl font-semibold text-marke-grau">Fahrzeug mieten</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Privat ein Firmenfahrzeug anfragen — die Werkstattleitung bestätigt
        oder lehnt ab.
      </p>

      {fahrzeuge.length === 0 ? (
        <p className="mt-6 text-neutral-600">Derzeit ist kein Fahrzeug freigegeben.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {fahrzeuge.map((f) => (
            <li key={f.id}>
              <Link
                href={`/fahrzeug-mieten/${f.id}`}
                className="block rounded-lg border border-neutral-200 p-4 transition hover:border-marke-gruen focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen focus-visible:outline-offset-2"
              >
                <span className="font-medium">{f.bezeichnung}</span>
                <span className="ml-2 text-sm text-neutral-600">{f.kennzeichen}</span>
                {f.merkmale && (
                  <span className="mt-1 block text-sm text-neutral-600">{f.merkmale}</span>
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
