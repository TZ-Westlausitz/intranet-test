import { Rolle } from "@/generated/prisma/enums"

/** Anzeigetexte für die Rolle-Enum — an einer Stelle, damit sie überall gleich lauten. */
export const ROLLE_NAMEN: Record<Rolle, string> = {
  MITARBEITENDE: "Mitarbeitende",
  FUEHRUNGSKRAFT: "Führungskraft",
  WERKSTATTLEITER: "Werkstattleiter",
  REDAKTION: "Redaktion",
  QM: "QM (Qualitätsmanagement)",
  ADMINISTRATION: "Administration",
}

export const ROLLEN_OPTIONEN: { wert: Rolle; name: string }[] = Object.entries(ROLLE_NAMEN).map(
  ([wert, name]) => ({ wert: wert as Rolle, name }),
)
