import Link from "next/link"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { AusleiheStatus } from "@/generated/prisma/enums"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"

/**
 * Das "komplette Reservierungsmenü", das von der Werkstatt-Kachel auf der
 * Startseite aus erreicht wird — die bisherigen vier Einzelkacheln, jetzt
 * hier gebündelt statt einzeln auf der Startseite.
 */
const UNTERMODULE = [
  {
    pfad: "/fahrzeug-mieten",
    name: "Fahrzeug mieten",
    beschreibung: "Privat ein Firmenfahrzeug anfragen",
  },
  {
    pfad: "/anfragen",
    name: "Offene Anfragen",
    beschreibung: "Anfragen von Mitarbeitenden bestätigen oder ablehnen",
  },
  {
    pfad: "/reservierungen",
    name: "Reservierungen",
    beschreibung: "Alle bestätigten Ausleihen im Überblick",
  },
  {
    pfad: "/fahrzeuge",
    name: "Fahrzeugausleihe (Werkstatt)",
    beschreibung: "Ausleihe direkt anlegen, Übergabe, Rücknahme",
  },
  {
    pfad: "/abrechnung",
    name: "Abrechnung",
    beschreibung: "Geldwerter Vorteil, Meldung an die Lohnbuchhaltung",
  },
]

export default async function FahrzeugReservierungenMenueSeite() {
  await berechtigung({ benoetigteBerechtigung: ["Werkstattleiter", "Adminbereich"] })

  const offeneAnfragen = await prisma.ausleihe.count({
    where: { status: AusleiheStatus.ANGEFRAGT },
  })

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Kopfleiste />
      <h1 className="text-2xl font-semibold text-ueberschrift">Fahrzeug Reservierungen</h1>
      <p className="mt-1 text-sm text-primaer">Komplettes Menü</p>

      <ul className="mt-6 flex flex-col gap-3">
        {UNTERMODULE.map((modul) => (
          <li key={modul.pfad}>
            <Link
              href={modul.pfad}
              className="flex items-center justify-between gap-3 rounded-lg border border-rand p-4 transition hover:border-marke-gruen focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen focus-visible:outline-offset-2"
            >
              <span>
                <span className="block font-medium">{modul.name}</span>
                <span className="mt-1 block text-sm text-primaer">
                  {modul.beschreibung}
                </span>
              </span>

              {modul.pfad === "/anfragen" && offeneAnfragen > 0 && (
                <span
                  aria-label={`${offeneAnfragen} offene Anfragen`}
                  className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-marke-orange px-1.5 text-xs font-bold text-neutral-900"
                >
                  {offeneAnfragen}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>

      <ZurueckButton />
    </main>
  )
}
