import { prisma } from "@/lib/db"
import { berlinerTagesbeginn, datumIsoAusDate } from "@/lib/datum"
import { aufgabenVorlageSichtbarFuer } from "@/lib/aufgaben-vorlagen/sichtbarkeit"

type VorlagenKontext = { personId: string; berechtigungen: string[] }

/**
 * Für das "Aus Vorlage"-Auswahlfeld beim Zuweisen eines Auftrags bzw.
 * Anlegen eines persönlichen To-dos — volle Felder statt nur id/titel
 * (Muster verwendbareInfoVorlagen), nur aktive und für die Person
 * sichtbare Vorlagen (siehe aufgabenVorlageSichtbarFuer). Die Grund-
 * Berechtigung "Aufgaben" prüft der Aufrufer selbst.
 *
 * `faelligAm` kommt hier bereits als fertiger Datums-String heraus —
 * `faelligInTagen` (relativ, siehe Kommentar am Model) wird einmal HIER
 * in ein konkretes Datum umgerechnet (heute in Europe/Berlin + N Tage,
 * siehe berlinerTagesbeginn), damit AuftragFormFelder/AufgabeFormFelder
 * selbst keine eigene Datumslogik brauchen und weiterhin nur mit fertigen
 * `<input type="date">`-Strings arbeiten.
 */
export async function verwendbareAufgabenVorlagen(kontext: VorlagenKontext) {
  const vorlagen = await prisma.aufgabenVorlage.findMany({
    where: { aktiv: true, ...aufgabenVorlageSichtbarFuer(kontext) },
    select: { id: true, titel: true, beschreibung: true, prioritaet: true, faelligInTagen: true },
    orderBy: { titel: "asc" },
  })

  const heute = berlinerTagesbeginn()
  return vorlagen.map((vorlage) => ({
    ...vorlage,
    faelligAm:
      vorlage.faelligInTagen === null ? null : datumIsoAusDate(new Date(heute.getTime() + vorlage.faelligInTagen * 86_400_000)),
  }))
}

/**
 * Für die Verwaltung (nur Wissensmanager, siehe darfAufgabenVorlagenVerwalten)
 * — zeigt auch inaktive Vorlagen, damit sie wieder aktivierbar bleiben.
 * IDs UND Namen in einem Rutsch, Muster alleInfoVorlagenFuerVerwaltung.
 */
export async function alleAufgabenVorlagenFuerVerwaltung() {
  return prisma.aufgabenVorlage.findMany({
    include: {
      benutzbarPersonen: { select: { personId: true, person: { select: { vorname: true, nachname: true } } } },
      benutzbarGruppen: { select: { gruppeId: true, gruppe: { select: { name: true } } } },
      benutzbarAbteilungen: { select: { abteilungId: true, abteilung: { select: { name: true } } } },
    },
    orderBy: { aktualisiertAm: "desc" },
  })
}

/** Eine Vorlage + ihre Benutzbar-für-Auswahl fürs Bearbeiten — unabhängig von Sichtbarkeit, nur für die Verwaltung (Aufrufer prüft die Berechtigung). */
export async function aufgabenVorlageDetailFuerVerwaltung(vorlageId: string) {
  return prisma.aufgabenVorlage.findUnique({
    where: { id: vorlageId },
    include: {
      benutzbarPersonen: { select: { personId: true } },
      benutzbarGruppen: { select: { gruppeId: true } },
      benutzbarAbteilungen: { select: { abteilungId: true } },
    },
  })
}
