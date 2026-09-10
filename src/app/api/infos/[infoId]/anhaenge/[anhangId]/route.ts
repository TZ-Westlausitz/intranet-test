import { prisma } from "@/lib/db"
import { berechtigung } from "@/lib/auth/berechtigung"
import { dateiLesen } from "@/lib/ablage"
import { contentDispositionHeader } from "@/lib/http"
import { istInfoEmpfaenger } from "@/lib/infos/sichtbarkeit"

/**
 * Liefert einen Info-Anhang aus — sichtbar für dieselben Personen wie die
 * Info selbst (siehe istInfoEmpfaenger). Bei fehlender Sicht 404, nicht
 * 403, wie bei den übrigen Anhang-Routen (kein Hinweis, ob die ID existiert).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ infoId: string; anhangId: string }> },
) {
  const kontext = await berechtigung()
  const { infoId, anhangId } = await params

  const anhang = await prisma.infoAnhang.findUnique({ where: { id: anhangId } })
  const darfSehen = anhang !== null && anhang.infoId === infoId && (await istInfoEmpfaenger(infoId, kontext.personId))

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
