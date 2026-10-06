import webpush from "web-push"

import { prisma } from "@/lib/db"

/**
 * Versand von Web-Push-Mitteilungen (Mitteilungen aufs Handy, siehe
 * Model PushAbo und public/sw.js). Läuft nur, wenn VAPID_PUBLIC_KEY und
 * VAPID_PRIVATE_KEY gesetzt sind — ohne sie bleibt alles beim Alten (nur die
 * Glocke), nichts bricht. Bewusst KEIN "use server": interner Baustein, der
 * für beliebige Personen aufrufbar ist (dieselbe Begründung wie bei
 * benachrichtigungErstellen).
 *
 * DATENSCHUTZ: Push-Mitteilungen laufen über die Server von Apple/Google/
 * Mozilla/Microsoft und erscheinen auf dem Sperrbildschirm. Deshalb gehen NUR
 * neutrale Texte raus — nie Namen, Aufgabentitel, Beitragsinhalte oder gar
 * Inhalte der Meldestelle (Regel 10, keine Patientendaten). Die Details stehen
 * erst in der App hinter der Anmeldung. Der Link in der Mitteilung enthält
 * höchstens eine technische ID.
 */

const OEFFENTLICH = process.env.VAPID_PUBLIC_KEY
const PRIVAT = process.env.VAPID_PRIVATE_KEY
const KONTAKT = process.env.VAPID_SUBJECT ?? process.env.APP_URL

const bereit = Boolean(OEFFENTLICH && PRIVAT && KONTAKT)
if (bereit) webpush.setVapidDetails(KONTAKT!, OEFFENTLICH!, PRIVAT!)

export function pushVerfuegbar(): boolean {
  return bereit
}

/**
 * Neutraler Text je Bereich, aus dem Link der Benachrichtigung abgeleitet.
 * Meldestelle und alles Unbekannte bekommen bewusst den allgemeinsten Text —
 * schon das Wort "Meldestelle" auf dem Sperrbildschirm könnte verraten, dass
 * jemand dort etwas gemeldet hat.
 */
export function neutralerPushText(link?: string | null): string {
  if (!link) return "Neue Mitteilung"
  if (link.startsWith("/aufgaben")) return "Neue Mitteilung zu Aufgaben"
  if (link.startsWith("/kalender")) return "Neue Mitteilung zu Terminen"
  if (link.startsWith("/newsfeed")) return "Neue Mitteilung im Newsfeed"
  if (link.startsWith("/fuhrpark")) return "Neue Mitteilung zu Fahrzeugen"
  if (link.startsWith("/formulare")) return "Neue Mitteilung zu Formularen"
  return "Neue Mitteilung"
}

/**
 * Schickt eine neutrale Mitteilung an alle Geräte einer Person. Fehler
 * stoppen nie den Aufrufer (die Glocken-Benachrichtigung ist längst
 * gespeichert); Geräte, die der Push-Dienst nicht mehr kennt (404/410),
 * werden hier aus der Datenbank entfernt. Gibt die Zahl erfolgreich
 * zugestellter Geräte zurück.
 */
export async function pushSenden(personId: string, link?: string | null, text?: string): Promise<number> {
  if (!bereit) return 0

  const abos = await prisma.pushAbo.findMany({ where: { personId } })
  if (abos.length === 0) return 0

  const nutzlast = JSON.stringify({ titel: "TPZ Intranet", text: text ?? neutralerPushText(link), link: link ?? "/" })

  const ergebnisse = await Promise.allSettled(
    abos.map((abo) =>
      webpush.sendNotification({ endpoint: abo.endpoint, keys: { p256dh: abo.p256dh, auth: abo.auth } }, nutzlast, {
        TTL: 60 * 60 * 24,
        timeout: 5000,
      }),
    ),
  )

  const tot: string[] = []
  let zugestellt = 0
  ergebnisse.forEach((ergebnis, index) => {
    if (ergebnis.status === "fulfilled") {
      zugestellt++
    } else {
      const status = (ergebnis.reason as { statusCode?: number })?.statusCode
      if (status === 404 || status === 410) tot.push(abos[index].id)
    }
  })
  if (tot.length > 0) await prisma.pushAbo.deleteMany({ where: { id: { in: tot } } })

  return zugestellt
}
