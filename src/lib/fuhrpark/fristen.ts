import { teileInBerlinerZeit } from "@/lib/datum"

/**
 * Reine Rechenlogik für die Fuhrpark-Fristen (TÜV, Service, Reifen) —
 * ohne Datenbank und ohne Anzeige, damit sie an einer Stelle steht und
 * Liste, Profil und spätere Erinnerungen dieselbe Bewertung nutzen.
 *
 * Alle Termine sind Kalendertage (UTC-Mitternacht des Berliner Tages, siehe
 * src/lib/datum.ts). `heute` muss ebenfalls auf diese Form normiert sein
 * (berlinerTagesbeginn()).
 */

/** Ab so vielen Tagen vor dem Termin gilt eine Frist als "bald fällig". */
export const FRIST_BALD_TAGE = 30

export type FristStufe =
  /** Termin liegt in der Vergangenheit. */
  | "ueberfaellig"
  /** Termin in den nächsten FRIST_BALD_TAGE Tagen. */
  | "bald"
  /** Termin liegt weiter in der Zukunft. */
  | "ok"
  /** Es ist gar kein Termin eingetragen. */
  | "offen"

export type FristStatus = { stufe: FristStufe; tage: number | null }

const TAG_MS = 24 * 60 * 60 * 1000

export function fristStatus(faelligAm: Date | null, heute: Date): FristStatus {
  if (!faelligAm) return { stufe: "offen", tage: null }
  const tage = Math.round((faelligAm.getTime() - heute.getTime()) / TAG_MS)
  if (tage < 0) return { stufe: "ueberfaellig", tage }
  if (tage <= FRIST_BALD_TAGE) return { stufe: "bald", tage }
  return { stufe: "ok", tage }
}

/** Kurzer Text zur Stufe, z. B. "seit 12 Tagen überfällig" / "in 9 Tagen". */
export function fristText(status: FristStatus): string {
  const { stufe, tage } = status
  if (stufe === "offen" || tage === null) return "kein Termin eingetragen"
  if (tage === 0) return "heute fällig"
  if (tage < 0) return tage === -1 ? "seit 1 Tag überfällig" : `seit ${-tage} Tagen überfällig`
  return tage === 1 ? "in 1 Tag" : `in ${tage} Tagen`
}

/** Schlimmste Stufe mehrerer Fristen — fürs Ampel-Symbol in der Fahrzeugliste. */
export function schlimmsteStufe(stufen: FristStufe[]): FristStufe {
  for (const s of ["ueberfaellig", "bald"] as const) {
    if (stufen.includes(s)) return s
  }
  // "offen" (kein Termin) ist bewusst KEINE Warnung: neu erfasste Fahrzeuge
  // haben anfangs noch keine Termine, das soll nicht rot blinken.
  return "ok"
}

/**
 * Hinweis, wenn die montierten Reifen nicht zur Jahreszeit passen.
 * Bewusst nur ein Hinweis, keine Regel: Die situative Winterreifenpflicht
 * hängt vom Wetter ab, die übliche Faustregel "O bis O" (Oktober bis Ostern)
 * dient hier nur als Erinnerung. Ostern ist grob mit dem 15. April
 * angesetzt.
 */
export function reifenHinweis(
  reifenart: "SOMMER" | "WINTER" | "GANZJAHR" | null,
  heute: Date,
): string | null {
  if (reifenart === null || reifenart === "GANZJAHR") return null
  const { monat, tag } = teileInBerlinerZeit(heute)
  const m = Number(monat)
  const t = Number(tag)
  const winterzeit = m >= 10 || m <= 3 || (m === 4 && t <= 15)
  if (reifenart === "SOMMER" && winterzeit) return "Sommerreifen montiert — Winterreifen wären jetzt angebracht (Oktober bis Ostern)."
  if (reifenart === "WINTER" && !winterzeit) return "Winterreifen montiert — Sommerreifen wären jetzt angebracht (ab Ostern)."
  return null
}

export const REIFENART_TEXT: Record<string, string> = {
  SOMMER: "Sommerreifen",
  WINTER: "Winterreifen",
  GANZJAHR: "Ganzjahresreifen",
}
