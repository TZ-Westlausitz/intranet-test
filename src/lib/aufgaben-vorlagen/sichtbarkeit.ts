import { Prisma } from "@/generated/prisma/client"

/** Reine Boolean-Prüfung wie darfFormulareVerwalten/darfInfoVorlagenVerwalten — wer Wissensmanager ist, darf Aufgaben-Vorlagen anlegen, bearbeiten und löschen. */
export function darfAufgabenVorlagenVerwalten(kontext: { berechtigungen: string[] }): boolean {
  return kontext.berechtigungen.includes("Wissensmanager")
}

/**
 * Sichtbarkeit einer AufgabenVorlage beim Zuweisen eines Auftrags oder
 * Anlegen eines persönlichen To-dos (Rückmeldung 2026-10-01) — dasselbe
 * Prinzip wie infoVorlageSichtbarFuer in src/lib/infos/sichtbarkeit.ts:
 * kein Benutzbar-Eintrag = für alle offen, ein Eintrag schränkt gezielt
 * ein, "Adminbereich"/"Admin" umgehen die Einschränkung immer. Die
 * Grund-Berechtigung ("Aufgaben") prüft der Aufrufer selbst — diese
 * Funktion kennt nur die Benutzbar-für-Einschränkung einer einzelnen
 * Vorlage.
 */
export function aufgabenVorlageSichtbarFuer(kontext: {
  personId: string
  berechtigungen: string[]
}): Prisma.AufgabenVorlageWhereInput {
  if (kontext.berechtigungen.includes("Adminbereich") || kontext.berechtigungen.includes("Admin")) return {}
  const jetzt = new Date()
  return {
    OR: [
      { benutzbarPersonen: { none: {} }, benutzbarGruppen: { none: {} }, benutzbarAbteilungen: { none: {} } },
      { benutzbarPersonen: { some: { personId: kontext.personId } } },
      { benutzbarGruppen: { some: { gruppe: { mitglieder: { some: { personId: kontext.personId } } } } } },
      {
        benutzbarAbteilungen: {
          some: {
            abteilung: {
              zugehoerigkeiten: { some: { personId: kontext.personId, OR: [{ bisDatum: null }, { bisDatum: { gt: jetzt } }] } },
            },
          },
        },
      },
    ],
  }
}
