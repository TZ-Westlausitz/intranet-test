import { prisma } from "@/lib/db"
import { berechtigung } from "@/lib/auth/berechtigung"
import { dateiLesen } from "@/lib/ablage"
import { dateiAntwort } from "@/lib/http"
import { chatSichtbarFuer } from "@/lib/chat/sichtbarkeit"

/**
 * Liefert einen Chat-Nachrichten-Anhang aus — sichtbar für jeden, der die
 * zugehörige Konversation sehen darf (`chatSichtbarFuer`, Muster
 * Formular-/Info-Anhang-Route: 404 statt 403 bei fehlender Sicht). Über
 * `dateiAntwort` mit HTTP-Range-Unterstützung, sonst verweigert Safari die
 * Wiedergabe von Sprachnachrichten (siehe dort).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ nachrichtId: string; anhangId: string }> },
) {
  const kontext = await berechtigung()
  const { nachrichtId, anhangId } = await params

  const anhang = await prisma.chatNachrichtAnhang.findUnique({
    where: { id: anhangId },
    include: { nachricht: { select: { konversationId: true } } },
  })
  if (!anhang || anhang.nachrichtId !== nachrichtId) {
    return new Response("Nicht gefunden", { status: 404 })
  }

  const darfSehen = await prisma.chatKonversation.findFirst({
    where: { id: anhang.nachricht.konversationId, ...chatSichtbarFuer(kontext.personId) },
    select: { id: true },
  })
  if (!darfSehen) {
    return new Response("Nicht gefunden", { status: 404 })
  }

  const datei = await dateiLesen(anhang.pfad)

  return dateiAntwort(request, datei, anhang.mimetyp, anhang.dateiname)
}
