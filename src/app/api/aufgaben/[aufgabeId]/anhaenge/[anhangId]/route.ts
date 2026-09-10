import { prisma } from "@/lib/db"
import { berechtigung } from "@/lib/auth/berechtigung"
import { dateiLesen } from "@/lib/ablage"
import { contentDispositionHeader } from "@/lib/http"
import { istAktivesProjektmitglied } from "@/lib/projekte/mitgliedschaft"

/**
 * Liefert einen Aufgaben-Anhang aus. Zwei Fälle (siehe Kommentar am Model
 * Aufgabe): persönliches To-do — nur die eigene Person sieht ihn, es gibt
 * keine geteilte Sicht auf fremde To-dos. Projekt-Aufgabe (projektId
 * gesetzt, personId dafür immer leer) — sichtbar für jedes aktive
 * Mitglied des Projekts, nicht nur für die zugewiesene Person. Bei
 * fehlender Sicht 404, nicht 403 (kein Hinweis, ob die ID existiert).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ aufgabeId: string; anhangId: string }> },
) {
  const kontext = await berechtigung()
  const { aufgabeId, anhangId } = await params

  const anhang = await prisma.aufgabeAnhang.findUnique({
    where: { id: anhangId },
    include: { aufgabe: true },
  })

  if (!anhang || anhang.aufgabeId !== aufgabeId) {
    return new Response("Nicht gefunden", { status: 404 })
  }

  const darfSehen = anhang.aufgabe.projektId
    ? await istAktivesProjektmitglied(anhang.aufgabe.projektId, kontext.personId)
    : anhang.aufgabe.personId === kontext.personId

  if (!darfSehen) {
    return new Response("Nicht gefunden", { status: 404 })
  }

  const datei = await dateiLesen(anhang.pfad)

  return new Response(new Blob([new Uint8Array(datei)]), {
    headers: {
      "Content-Type": anhang.mimetyp,
      "Content-Disposition": contentDispositionHeader(anhang.dateiname),
    },
  })
}
