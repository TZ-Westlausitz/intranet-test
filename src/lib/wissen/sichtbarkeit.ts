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

/** Reine Boolean-Prüfung — wer die Berechtigung "Wissensmanager" hat, darf Ordner/Unterordner/Artikel anlegen, bearbeiten und (bei Artikeln) löschen. */
export function darfWissenVerwalten(kontext: { berechtigungen: string[] }): boolean {
  return kontext.berechtigungen.includes("Wissensmanager")
}

/** Für die Anhang-Download-Route — Muster istInfoEmpfaenger. */
export async function istWissensEmpfaenger(artikelId: string, personId: string): Promise<boolean> {
  const treffer = await prisma.wissensArtikel.findFirst({
    where: { id: artikelId, ...wissenSichtbarFuer(personId) },
    select: { id: true },
  })
  return treffer !== null
}
