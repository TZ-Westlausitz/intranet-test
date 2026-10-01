import { prisma } from "@/lib/db"
import { infoVorlageSichtbarFuer } from "@/lib/infos/sichtbarkeit"

type VorlagenKontext = { personId: string; berechtigungen: string[] }

/**
 * Für das "Aus Vorlage"-Auswahlfeld im Erstellen-Dialog — volle Felder
 * statt nur id/titel, weil InfoErstellenDialog die Inhalte beim Auswählen
 * client-seitig direkt einsetzt, ohne einen zweiten Server-Roundtrip
 * (Muster: alle anderen Auswahllisten in diesem Projekt werden vorab
 * geladen). Nur aktive und für die Person sichtbare Vorlagen (siehe
 * infoVorlageSichtbarFuer).
 */
export async function verwendbareInfoVorlagen(kontext: VorlagenKontext) {
  return prisma.infoVorlage.findMany({
    where: { aktiv: true, ...infoVorlageSichtbarFuer(kontext) },
    select: {
      id: true,
      titel: true,
      inhalt: true,
      kategorieId: true,
      mitBestaetigung: true,
      kommentareErlaubt: true,
    },
    orderBy: { titel: "asc" },
  })
}

/**
 * Für die Verwaltung (nur Wissensmanager, siehe darfInfoVorlagenVerwalten)
 * — zeigt auch inaktive Vorlagen, damit sie wieder aktivierbar bleiben.
 * `personId`/`gruppeId`/`abteilungId` UND die Namen in einem Rutsch: die
 * IDs braucht InfoVorlageDialog (vorausgewählte Einträge beim
 * Bearbeiten), die Namen die Zeilen-Anzeige (benutzerAnzeige).
 */
export async function alleInfoVorlagenFuerVerwaltung() {
  return prisma.infoVorlage.findMany({
    include: {
      kategorie: { select: { name: true } },
      benutzbarPersonen: { select: { personId: true, person: { select: { vorname: true, nachname: true } } } },
      benutzbarGruppen: { select: { gruppeId: true, gruppe: { select: { name: true } } } },
      benutzbarAbteilungen: { select: { abteilungId: true, abteilung: { select: { name: true } } } },
    },
    orderBy: { aktualisiertAm: "desc" },
  })
}

/** Eine Vorlage + ihre Benutzbar-für-Auswahl fürs Bearbeiten — unabhängig von Sichtbarkeit, nur für die Verwaltung (Aufrufer prüft die Berechtigung). */
export async function infoVorlageDetailFuerVerwaltung(vorlageId: string) {
  return prisma.infoVorlage.findUnique({
    where: { id: vorlageId },
    include: {
      benutzbarPersonen: { select: { personId: true } },
      benutzbarGruppen: { select: { gruppeId: true } },
      benutzbarAbteilungen: { select: { abteilungId: true } },
    },
  })
}
