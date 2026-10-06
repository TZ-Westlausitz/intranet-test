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
 * DATENSCHUTZ: Push-Mitteilungen erscheinen auf dem Sperrbildschirm, jede
 * Person in Reichweite kann mitlesen. Deshalb enthalten sie nur den Namen der
 * auslösenden Person und die Art ("von Anna Vogel / Aufgabe") — nie Titel,
 * Nachrichten- oder Beitragsinhalte und nichts aus der Meldestelle (Regel 10,
 * keine Patientendaten). Die Details stehen erst in der App hinter der
 * Anmeldung. Der Link enthält höchstens eine technische ID. Die Nutzlast ist
 * zwischen Server und Gerät verschlüsselt (Web-Push-Standard); die Push-Dienste
 * von Apple/Google sehen nur, DASS eine Mitteilung zugestellt wird.
 */

const OEFFENTLICH = process.env.VAPID_PUBLIC_KEY
const PRIVAT = process.env.VAPID_PRIVATE_KEY
const KONTAKT = process.env.VAPID_SUBJECT ?? process.env.APP_URL

const bereit = Boolean(OEFFENTLICH && PRIVAT && KONTAKT)
if (bereit) webpush.setVapidDetails(KONTAKT!, OEFFENTLICH!, PRIVAT!)

export function pushVerfuegbar(): boolean {
  return bereit
}

/** Art der Mitteilung ("Aufgabe") und der Bereich dazu ("Aufgaben") aus dem Link; `null` = unbekannt/bewusst unbenannt (Meldestelle). */
function pushArt(link?: string | null): { art: string; bereich: string } | null {
  if (!link) return null
  if (link.startsWith("/chat")) return { art: "Nachricht", bereich: "Chat" }
  if (link.startsWith("/aufgaben")) return { art: "Aufgabe", bereich: "Aufgaben" }
  if (link.startsWith("/kalender")) return { art: "Termin", bereich: "Terminen" }
  if (link.startsWith("/newsfeed")) return { art: "Newsfeed-Beitrag", bereich: "Newsfeed" }
  if (link.startsWith("/fuhrpark")) return { art: "Fahrzeug", bereich: "Fahrzeugen" }
  if (link.startsWith("/formulare")) return { art: "Formular", bereich: "Formularen" }
  return null
}

/**
 * Text der Mitteilung (Rückmeldung 2026-10-06): "von Anna Vogel" und darunter
 * die Art ("Aufgabe", "Nachricht", "Termin" …) — ohne Titel und Inhalt. Fehlt
 * der Absender (Systemmeldungen), steht nur "Neue Mitteilung zu <Bereich>".
 * Die Meldestelle und alles Unbekannte bleiben bewusst ganz allgemein und
 * ohne Namen: Schon "Meldestelle" oder ein Name auf dem Sperrbildschirm
 * könnte verraten, dass jemand dort etwas gemeldet hat.
 */
export function pushText(link?: string | null, absender?: string | null): string {
  const treffer = pushArt(link)
  if (!treffer) return "Neue Mitteilung"
  return absender ? `von ${absender}\n${treffer.art}` : `Neue Mitteilung zu ${treffer.bereich}`
}

/**
 * Schickt eine kurze Mitteilung an alle Geräte einer Person. Fehler
 * stoppen nie den Aufrufer (die Glocken-Benachrichtigung ist längst
 * gespeichert); Geräte, die der Push-Dienst nicht mehr kennt (404/410),
 * werden hier aus der Datenbank entfernt. Gibt die Zahl erfolgreich
 * zugestellter Geräte zurück.
 */
export async function pushSenden(
  personId: string,
  link?: string | null,
  optionen: { absender?: string | null; text?: string } = {},
): Promise<number> {
  if (!bereit) return 0

  // Nur aktive Personen: ein deaktiviertes Konto soll keine Mitteilungen mehr bekommen.
  const abos = await prisma.pushAbo.findMany({ where: { personId, person: { aktiv: true } } })
  if (abos.length === 0) return 0

  const nutzlast = JSON.stringify({ titel: "TPZ Intranet", text: optionen.text ?? pushText(link, optionen.absender), link: link ?? "/" })

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
