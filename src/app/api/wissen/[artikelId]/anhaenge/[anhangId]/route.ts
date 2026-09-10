import { prisma } from "@/lib/db"
import { berechtigung } from "@/lib/auth/berechtigung"
import { dateiLesen } from "@/lib/ablage"
import { contentDispositionHeader } from "@/lib/http"
import { istWissensEmpfaenger } from "@/lib/wissen/sichtbarkeit"

/**
 * Liefert einen Wissensartikel-Anhang aus — sichtbar für dieselben
 * Personen wie der Artikel selbst (siehe istWissensEmpfaenger). Bei
 * fehlender Sicht 404, nicht 403 (Muster: Info-Anhang-Route).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ artikelId: string; anhangId: string }> },
) {
  const kontext = await berechtigung()
  const { artikelId, anhangId } = await params

  const anhang = await prisma.wissensAnhang.findUnique({ where: { id: anhangId } })
  const darfSehen =
    anhang !== null && anhang.artikelId === artikelId && (await istWissensEmpfaenger(artikelId, kontext.personId))

  if (!anhang || !darfSehen) {
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
