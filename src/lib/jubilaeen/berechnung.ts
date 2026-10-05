/** 3, 5, 10 und danach alle fünf Jahre bis 50 Jahre Firmenzugehörigkeit. */
export const JUBILAEUMSJAHRE = [3, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50]

/**
 * Das Firmenkonto hat zwar "Adminbereich", ist aber kein Mensch: es
 * bekommt keine Jubiläumshinweise und taucht auch nicht als Jubilar auf.
 */
export const FIRMENKONTO_BENUTZERNAME = "therapie.pflegezentrum@tz"

const TAG_MS = 24 * 60 * 60 * 1000

/** Wie lange nach dem Jubiläum es noch in der Übersicht steht und noch gemeldet wird, falls es knapp verpasst wurde. */
export const NACHFRIST_TAGE = 14

/** Wie viele Monate im Voraus die Übersicht schaut. */
export const VORSCHAU_MONATE = 3

/** Kalendertag (UTC-Mitternacht-Konvention, siehe src/lib/datum.ts) + Monate; der 31. springt dabei nicht in den Folgemonat. */
function monateAddieren(tag: Date, monate: number): Date {
  const ziel = new Date(Date.UTC(tag.getUTCFullYear(), tag.getUTCMonth() + monate, 1))
  const letzterTag = new Date(Date.UTC(ziel.getUTCFullYear(), ziel.getUTCMonth() + 1, 0)).getUTCDate()
  return new Date(Date.UTC(ziel.getUTCFullYear(), ziel.getUTCMonth(), Math.min(tag.getUTCDate(), letzterTag)))
}

export function jubilaeumDatum(eintritt: Date, jahre: number): Date {
  return monateAddieren(eintritt, jahre * 12)
}

/** Tage von `heute` bis `datum` (negativ = schon vorbei). Beide auf UTC-Mitternacht normiert. */
export function tageBis(datum: Date, heute: Date): number {
  return Math.round((datum.getTime() - heute.getTime()) / TAG_MS)
}

/** Alle Jubiläen dieser Person, deren Tag zwischen `von` und `bis` (beide einschließlich) liegt. */
function jubilaeenZwischen(eintritt: Date, von: Date, bis: Date): { jahre: number; datum: Date }[] {
  return JUBILAEUMSJAHRE.map((jahre) => ({ jahre, datum: jubilaeumDatum(eintritt, jahre) })).filter(
    (j) => j.datum.getTime() >= von.getTime() && j.datum.getTime() <= bis.getTime(),
  )
}

/** Für die Übersicht: letzte Tage bis zu drei Monate voraus. */
export function jubilaeenFuerUebersicht(eintritt: Date, heute: Date) {
  const von = new Date(heute.getTime() - NACHFRIST_TAGE * TAG_MS)
  return jubilaeenZwischen(eintritt, von, monateAddieren(heute, VORSCHAU_MONATE))
}

/** Für die Mitteilung: ab einem Monat vorher (bis kurz nach dem Tag, falls niemand rechtzeitig geschaut hat). */
export function jubilaeenFuerHinweis(eintritt: Date, heute: Date) {
  const von = new Date(heute.getTime() - NACHFRIST_TAGE * TAG_MS)
  return jubilaeenZwischen(eintritt, von, monateAddieren(heute, 1))
}
