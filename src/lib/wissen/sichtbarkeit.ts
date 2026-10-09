import { Prisma } from "@/generated/prisma/client"

import { prisma } from "@/lib/db"

/**
 * Ein Wissensartikel ist sichtbar für eine Person, wenn sie direkt
 * Empfänger ist, Mitglied einer der Empfänger-Gruppen ODER aktiv einer
 * der Empfänger-Abteilungen zugehörig ist — 1:1 das Muster von
 * `infoSichtbarFuer` (src/lib/infos/sichtbarkeit.ts), aber OHNE den
 * Veröffentlichungs-/"Geplant am"-Teil: ein Wissensartikel kennt keine
 * zeitversetzte Freigabe, er ist ab dem Anlegen sofort für seine
 * Empfänger sichtbar. Ordner/Unterordner selbst sind bewusst NICHT
 * gefiltert (siehe Kontext im Plan) — nur die Artikel darin.
 */
export function wissenSichtbarFuer(personId: string): Prisma.WissensArtikelWhereInput {
  const jetzt = new Date()
  return {
    OR: [
      { empfaengerPersonen: { some: { personId } } },
      { empfaengerGruppen: { some: { gruppe: { mitglieder: { some: { personId } } } } } },
      {
        empfaengerAbteilungen: {
          some: {
            abteilung: {
              zugehoerigkeiten: {
                some: { personId, OR: [{ bisDatum: null }, { bisDatum: { gt: jetzt } }] },
              },
            },
          },
        },
      },
    ],
  }
}

type WissenRechte = { berechtigungen: string[] }

/**
 * Ordner und Unterordner anlegen, umbenennen, (de)aktivieren sowie ALLES an
 * Artikeln: nur "Wissensmanager". Dieselbe Berechtigung verwaltet auch die
 * Vorlagen für Formulare, Infos und Aufgaben (siehe darfFormulareVerwalten &
 * Co.).
 */
export function darfWissenVerwalten(kontext: WissenRechte): boolean {
  return kontext.berechtigungen.includes("Wissensmanager")
}

/**
 * Artikel anlegen: Wissensmanager ODER "Wissensartikel anlegen" (Rückmeldung
 * 2026-10-09: eine schlanke Berechtigung nur für Artikel, ohne die
 * Vorlagen-Rechte des Wissensmanagers). Ordner anlegen gehört nicht dazu.
 */
export function darfArtikelAnlegen(kontext: WissenRechte): boolean {
  return darfWissenVerwalten(kontext) || kontext.berechtigungen.includes("Wissensartikel anlegen")
}

/**
 * Artikel bearbeiten (inkl. Anhänge entfernen): Wissensmanager, oder wer
 * "Wissensartikel anlegen" UND "Bearbeiten" bzw. "Löschen & Bearbeiten" hat.
 * Die Info-Berechtigungen "Bearbeiten"/"Löschen & Bearbeiten" greifen im
 * Wissensbereich also nur zusammen mit "Wissensartikel anlegen".
 */
export function darfArtikelBearbeiten(kontext: WissenRechte): boolean {
  return (
    darfWissenVerwalten(kontext) ||
    (kontext.berechtigungen.includes("Wissensartikel anlegen") &&
      (kontext.berechtigungen.includes("Bearbeiten") || kontext.berechtigungen.includes("Löschen & Bearbeiten")))
  )
}

/** Artikel löschen: Wissensmanager, oder wer "Wissensartikel anlegen" UND "Löschen & Bearbeiten" hat. */
export function darfArtikelLoeschen(kontext: WissenRechte): boolean {
  return (
    darfWissenVerwalten(kontext) ||
    (kontext.berechtigungen.includes("Wissensartikel anlegen") && kontext.berechtigungen.includes("Löschen & Bearbeiten"))
  )
}

/** Für die Anhang-Download-Route — Muster istInfoEmpfaenger. */
export async function istWissensEmpfaenger(artikelId: string, personId: string): Promise<boolean> {
  const treffer = await prisma.wissensArtikel.findFirst({
    where: { id: artikelId, ...wissenSichtbarFuer(personId) },
    select: { id: true },
  })
  return treffer !== null
}
