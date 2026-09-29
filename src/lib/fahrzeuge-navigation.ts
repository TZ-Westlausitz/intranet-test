import { prisma } from "@/lib/db"
import { AusleiheStatus } from "@/generated/prisma/enums"
import type { Kontext } from "@/lib/auth/berechtigung"
import { fuhrparkNavigation } from "@/lib/fuhrpark/abfragen"
import { fuhrparkRechte } from "@/lib/fuhrpark/zugriff"

type FahrzeugeKontext = Pick<Kontext, "personId" | "berechtigungen">

/**
 * EIN Menüpunkt "Fahrzeuge" für Kopfzeile ("Weiteres", siehe BAUSTEINE)
 * und mobiles Menü (/menu) statt getrennter Punkte für Selbstbedienung
 * (Fahrzeug mieten), Fuhrpark und das Werkstattleiter-Reservierungsmenü.
 * Rückmeldung 2026-09-29: "Fahrzeug Reservierungen" hing an keinem
 * Menüpunkt, nur an einer Startseiten-Kachel — alle drei Themen stehen
 * seitdem gemeinsam auf /fahrzeug-reservierungen (siehe dort), permissions-
 * abhängig zusammengestellt statt als drei getrennte Fundstellen.
 *
 * Der Zähler summiert, was Aufmerksamkeit braucht: offene Anfragen (nur
 * Werkstattleiter/Adminbereich) plus fällige/bald fällige Fristen aus dem
 * Fuhrpark (Werkstattleiter, "Fahrzeuge lesen" oder eigener Halter-Bezug —
 * siehe fuhrparkNavigation, die auch entscheidet, ob es dafür überhaupt
 * etwas zu zählen gibt).
 */
export async function fahrzeugeNavigation(kontext: FahrzeugeKontext) {
  const { darfBearbeiten } = fuhrparkRechte(kontext)
  const [offeneAnfragen, fuhrpark] = await Promise.all([
    darfBearbeiten ? prisma.ausleihe.count({ where: { status: AusleiheStatus.ANGEFRAGT } }) : Promise.resolve(0),
    fuhrparkNavigation(kontext),
  ])
  return { href: "/fahrzeug-reservierungen", label: "Fahrzeuge", badge: offeneAnfragen + fuhrpark.warnungen }
}
