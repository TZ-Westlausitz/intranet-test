import { prisma } from "@/lib/db"
import { berlinerTagesbeginn, formatiereDatumAusDate } from "@/lib/datum"
import { benachrichtigungErstellen } from "@/lib/benachrichtigungen/erstellen"
import { FIRMENKONTO_BENUTZERNAME, jubilaeenFuerHinweis, tageBis } from "./berechnung"

const LINK_VORSPANN = "/admin/jubilaeen?hinweis="

/** Läuft höchstens alle 30 Minuten je Person — die Prüfung selbst ist idempotent, das spart nur Abfragen. */
const letzterLauf = new Map<string, number>()
const MIN_ABSTAND_MS = 30 * 60 * 1000

function hinweisText(name: string, jahre: number, datum: Date, tage: number): string {
  const wann = tage > 1 ? `in ${tage} Tagen` : tage === 1 ? "morgen" : tage === 0 ? "heute" : `vor ${-tage} Tagen`
  return `Jubiläum ${wann}: ${name} — ${jahre} Jahre am ${formatiereDatumAusDate(datum)}.`
}

/**
 * Legt für die Person (wenn sie "Adminbereich" hat) die Mitteilungen zu
 * Jubiläen an, die innerhalb des nächsten Monats anstehen. Wird beim
 * Seitenaufruf ausgeführt statt per Hintergrundjob (wie die Terminerinnerungen,
 * siehe Model TerminErinnerung). Doppelte Mitteilungen verhindert der Link:
 * er enthält Person und Jubiläumsjahr und ist je Empfänger nur einmal vorhanden.
 */
export async function jubilaeumsHinweiseErzeugen(kontext: { personId: string; berechtigungen: string[] }) {
  if (!kontext.berechtigungen.includes("Adminbereich") || kontext.personId === FIRMENKONTO_BENUTZERNAME) return

  const jetzt = Date.now()
  const zuletzt = letzterLauf.get(kontext.personId)
  if (zuletzt !== undefined && jetzt - zuletzt < MIN_ABSTAND_MS) return
  letzterLauf.set(kontext.personId, jetzt)

  const heute = berlinerTagesbeginn()

  const [personen, vorhandene] = await Promise.all([
    prisma.person.findMany({
      where: { aktiv: true, eintrittAm: { not: null }, NOT: { benutzername: { in: [kontext.personId, FIRMENKONTO_BENUTZERNAME] } } },
      select: { benutzername: true, vorname: true, nachname: true, eintrittAm: true },
    }),
    prisma.benachrichtigung.findMany({
      where: { personId: kontext.personId, link: { startsWith: LINK_VORSPANN } },
      select: { link: true },
    }),
  ])
  const schonGemeldet = new Set(vorhandene.map((b) => b.link))

  for (const person of personen) {
    for (const jubilaeum of jubilaeenFuerHinweis(person.eintrittAm!, heute)) {
      const link = `${LINK_VORSPANN}${encodeURIComponent(`${person.benutzername}_${jubilaeum.jahre}`)}`
      if (schonGemeldet.has(link)) continue
      await benachrichtigungErstellen({
        personId: kontext.personId,
        text: hinweisText(`${person.vorname} ${person.nachname}`, jubilaeum.jahre, jubilaeum.datum, tageBis(jubilaeum.datum, heute)),
        link,
      })
    }
  }
}
