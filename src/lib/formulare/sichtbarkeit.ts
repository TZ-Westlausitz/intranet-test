import { Prisma } from "@/generated/prisma/client"

import { prisma } from "@/lib/db"

/**
 * Eine Formular-Vorlage ist sichtbar ("benutzbar") für eine Person, wenn
 * sie direkt in der Zielgruppe steht, Mitglied einer der Gruppen ODER
 * aktiv einer der Abteilungen zugehörig ist — 1:1 das Muster von
 * `wissenSichtbarFuer` (src/lib/wissen/sichtbarkeit.ts).
 */
export function formularSichtbarFuer(personId: string): Prisma.FormularVorlageWhereInput {
  const jetzt = new Date()
  return {
    OR: [
      { benutzbarPersonen: { some: { personId } } },
      { benutzbarGruppen: { some: { gruppe: { mitglieder: { some: { personId } } } } } },
      {
        benutzbarAbteilungen: {
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

/**
 * Wer die Einreichungen einer Vorlage bekommt — dasselbe dreiteilige
 * Empfänger-Modell (Personen/Gruppen/Abteilungen gleichzeitig wählbar,
 * siehe Kontext im Plan) wie `formularSichtbarFuer`, nur auf die
 * Empfänger- statt die Benutzbar-für-Tabellen umgelegt.
 */
export function formularEmpfaengerFuer(personId: string): Prisma.FormularVorlageWhereInput {
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

/** Reine Boolean-Prüfung — wer die Berechtigung "Wissensmanager" hat, darf Formular-Vorlagen anlegen, bearbeiten und (ohne Einreichungen) löschen. */
export function darfFormulareVerwalten(kontext: { berechtigungen: string[] }): boolean {
  return kontext.berechtigungen.includes("Wissensmanager")
}

/** True, wenn `personId` (direkt oder über Gruppe/Abteilung) Empfänger der Vorlage ist — Muster istWissensEmpfaenger. */
export async function istFormularEmpfaenger(vorlageId: string, personId: string): Promise<boolean> {
  const treffer = await prisma.formularVorlage.findFirst({
    where: { id: vorlageId, ...formularEmpfaengerFuer(personId) },
    select: { id: true },
  })
  return treffer !== null
}
