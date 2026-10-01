import Link from "next/link"
import { Car, FileEdit, Truck, Inbox, CalendarCheck, Wrench, Receipt, type LucideIcon } from "lucide-react"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { AusleiheStatus } from "@/generated/prisma/enums"
import { fuhrparkNavigation } from "@/lib/fuhrpark/abfragen"
import { fuhrparkRechte } from "@/lib/fuhrpark/zugriff"
import { ZurueckButton } from "@/components/zurueck-button"

type Kachel = {
  href: string
  icon: LucideIcon
  titel: string
  beschreibung: string
  badge?: number
}

const AKZENT = {
  gruen: { rand: "border-t-marke-gruen hover:border-marke-gruen", icon: "text-marke-gruen-dunkel" },
  orange: { rand: "border-t-marke-orange hover:border-marke-orange", icon: "text-marke-orange" },
} as const

function KachelRaster({ kacheln, akzent }: { kacheln: Kachel[]; akzent: keyof typeof AKZENT }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {kacheln.map((k) => (
        <Link
          key={k.href}
          href={k.href}
          className={
            "relative flex flex-col gap-2 rounded-2xl border border-x-rand border-b-rand border-t-4 bg-flaeche p-4 shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen " +
            AKZENT[akzent].rand
          }
        >
          {!!k.badge && k.badge > 0 && (
            <span
              aria-label={`${k.badge} offen`}
              className="absolute top-3 right-3 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-marke-orange px-1 text-xs font-bold text-neutral-900"
            >
              {k.badge}
            </span>
          )}
          <k.icon aria-hidden className={"h-6 w-6 " + AKZENT[akzent].icon} />
          <span className="font-medium text-ueberschrift">{k.titel}</span>
          <span className="text-sm text-sekundaer">{k.beschreibung}</span>
        </Link>
      ))}
    </div>
  )
}

/**
 * Einstieg in alles Fahrzeugbezogene — bewusst EIN Menüpunkt/EINE Seite
 * statt getrennter Fundstellen für Selbstbedienung (Fahrzeug mieten),
 * Fuhrpark-Stammdaten und das Werkstattleiter-Reservierungsmenü
 * (Rückmeldung 2026-09-29: "Fahrzeug Reservierungen" hing an keinem
 * Menüpunkt). Jede angemeldete Person darf die Seite öffnen — welche
 * Kacheln zu sehen sind, entscheidet allein die jeweilige Berechtigung:
 *
 * - Oben, für JEDE Person: Fahrzeug mieten, Meine Anfragen. Dazu, wenn
 *   `fuhrparkNavigation` Zugang meldet (Werkstattleiter/Adminbereich,
 *   "Fahrzeuge lesen" ODER eigener Halter-Bezug), die Fuhrpark-Kachel mit
 *   deren Name/Ziel/Zähler (z. B. "Mein Fahrzeug" bei reinem Halter-Bezug).
 * - Unten, NUR für Werkstattleiter/Adminbereich: Offene Anfragen,
 *   Reservierungen, Fahrzeugausleihe (Werkstatt), Abrechnung — deshalb ein
 *   eigener Abschnitt "Werkstattleitung", nicht mit den ersten drei
 *   vermischt (die gelten für Halter/"Fahrzeuge lesen" NICHT, "Werkstatt-
 *   leitung" wäre für die eine falsche Überschrift).
 */
export default async function FahrzeugeSeite() {
  const kontext = await berechtigung()
  const { darfBearbeiten } = fuhrparkRechte(kontext)

  const [offeneAnfragen, fuhrpark] = await Promise.all([
    darfBearbeiten ? prisma.ausleihe.count({ where: { status: AusleiheStatus.ANGEFRAGT } }) : Promise.resolve(0),
    fuhrparkNavigation(kontext),
  ])

  const fuerAlle: Kachel[] = [
    { href: "/fahrzeug-mieten", icon: Car, titel: "Fahrzeug mieten", beschreibung: "Privat ein Firmenfahrzeug anfragen" },
    { href: "/meine-anfragen", icon: FileEdit, titel: "Meine Anfragen", beschreibung: "Eigene Anfragen und ihr Status" },
  ]
  if (fuhrpark.zugang) {
    fuerAlle.push({
      href: fuhrpark.href,
      icon: Truck,
      titel: fuhrpark.label,
      beschreibung: "Fahrzeuge, Standort, Fristen",
      badge: fuhrpark.warnungen,
    })
  }

  const werkstattleitung: Kachel[] = [
    { href: "/anfragen", icon: Inbox, titel: "Offene Anfragen", beschreibung: "Bestätigen oder ablehnen", badge: offeneAnfragen },
    { href: "/reservierungen", icon: CalendarCheck, titel: "Reservierungen", beschreibung: "Alle bestätigten Ausleihen" },
    { href: "/fahrzeuge", icon: Wrench, titel: "Fahrzeugausleihe (Werkstatt)", beschreibung: "Direkt anlegen, Übergabe, Rücknahme" },
    { href: "/abrechnung", icon: Receipt, titel: "Abrechnung", beschreibung: "Geldwerter Vorteil, Lohnbuchhaltung" },
  ]

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="text-2xl font-semibold text-ueberschrift">Fahrzeuge</h1>

      <div className="mt-6">
        <KachelRaster kacheln={fuerAlle} akzent="gruen" />
      </div>

      {darfBearbeiten && (
        <div className="mt-8">
          <h2 className="mb-3 text-xs font-semibold tracking-wide text-sekundaer uppercase">Werkstattleitung</h2>
          <KachelRaster kacheln={werkstattleitung} akzent="orange" />
        </div>
      )}

      <ZurueckButton />
    </main>
  )
}
