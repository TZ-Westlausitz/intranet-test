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

type MeldungAbschlussStand = { status: string; abschlussBestaetigtAm: Date | null }

/**
 * Drei zusammenhängende Ableitungen aus Status + Bestätigungs-Zeitstempel
 * (Rückmeldung 2026-09-22: "Hat sich Ihr Anliegen klären können?") — an
 * einer Stelle statt mehrfach dieselbe Bedingung nachzubauen, überall dort
 * verwendet, wo entschieden werden muss, ob der Chat/Schieberegler aktiv
 * sein darf (aktionen.ts, meldung-kommentare.tsx-Aufrufer, Seiten).
 *
 * - EINGEGANGEN/IN_BEARBEITUNG: normaler Ablauf, keine Rückfrage nötig.
 * - ABGESCHLOSSEN + `abschlussBestaetigtAm` null: die Kontaktstelle hat
 *   abgeschlossen, aber die meldende Person hat die Rückfrage noch nicht
 *   beantwortet — Chat bleibt in diesem Zwischenzustand bewusst offen.
 * - ABGESCHLOSSEN + `abschlussBestaetigtAm` gesetzt: mit "Ja" bestätigt,
 *   dauerhaft archiviert — Status UND Chat sind ab dann für immer gesperrt.
 */
export function meldungWartetAufBestaetigung(meldung: MeldungAbschlussStand): boolean {
  return meldung.status === MeldungStatus.ABGESCHLOSSEN && meldung.abschlussBestaetigtAm === null
}

export function meldungEndgueltigArchiviert(meldung: MeldungAbschlussStand): boolean {
  return meldung.status === MeldungStatus.ABGESCHLOSSEN && meldung.abschlussBestaetigtAm !== null
}

export function meldungChatAktiv(meldung: MeldungAbschlussStand): boolean {
  return meldung.status === MeldungStatus.IN_BEARBEITUNG || meldungWartetAufBestaetigung(meldung)
}
