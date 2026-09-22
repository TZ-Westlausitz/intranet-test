import { MeldungStatus } from "@/generated/prisma/enums"

/** Reihenfolge für den Schieberegler (Muster: TANK_REIHENFOLGE) — von "neu" nach "erledigt". */
export const MELDUNG_STATUS_REIHENFOLGE = [
  MeldungStatus.EINGEGANGEN,
  MeldungStatus.IN_BEARBEITUNG,
  MeldungStatus.ABGESCHLOSSEN,
] as const

export const MELDUNG_STATUS_LABEL: Record<string, string> = {
  EINGEGANGEN: "Eingegangen",
  IN_BEARBEITUNG: "In Bearbeitung",
  ABGESCHLOSSEN: "Abgeschlossen",
}

export const MELDUNG_STATUS_FARBE: Record<string, string> = {
  EINGEGANGEN: "bg-marke-orange/15 text-ueberschrift",
  IN_BEARBEITUNG: "bg-marke-gruen/15 text-ueberschrift",
  ABGESCHLOSSEN: "bg-flaeche-200 text-primaer",
}
