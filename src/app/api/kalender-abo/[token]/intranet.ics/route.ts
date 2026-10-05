import { prisma } from "@/lib/db"
import { berlinerTagesbeginn } from "@/lib/datum"
import { termineFuerKalenderFeed } from "@/lib/termine/abfragen"
import { kalenderFeedBauen } from "@/lib/kalender-abo/ics"

const TAG_MS = 24 * 60 * 60 * 1000

/**
 * Persönlicher Kalender-Feed zum Abonnieren in Outlook, Google, Apple &
 * Co. Bewusst OHNE Anmeldung (siehe `oeffentlich` in auth.config.ts):
 * Kalender-Apps können sich nicht einloggen, der geheime Token im Pfad ist
 * die Zugangsberechtigung. Ausgeliefert werden nur die Termine dieser
 * Person (siehe termineFuerKalenderFeed) mit Titel, Zeit und Ort. Unbekannter
 * Token, deaktivierte Person und "kein Abo" sehen alle dasselbe 404 — nichts
 * verrät, ob es einen Link gegeben hat.
 */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  // Echte Token sind 43 Zeichen; alles andere gar nicht erst abfragen.
  if (!/^[A-Za-z0-9_-]{30,64}$/.test(token)) return new Response("Nicht gefunden", { status: 404 })

  const person = await prisma.person.findUnique({
    where: { kalenderAboToken: token },
    select: { benutzername: true, aktiv: true },
  })
  if (!person || !person.aktiv) return new Response("Nicht gefunden", { status: 404 })

  const heute = berlinerTagesbeginn()
  const termine = await termineFuerKalenderFeed(
    person.benutzername,
    new Date(heute.getTime() - 60 * TAG_MS),
    new Date(heute.getTime() + 400 * TAG_MS),
  )

  const basisUrl = new URL(request.url).origin
  return new Response(kalenderFeedBauen(termine, basisUrl), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="intranet.ics"',
      "Cache-Control": "private, max-age=300",
      "X-Robots-Tag": "noindex",
    },
  })
}
