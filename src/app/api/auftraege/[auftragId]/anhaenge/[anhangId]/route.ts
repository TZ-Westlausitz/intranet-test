import { prisma } from "@/lib/db"
import { berechtigung } from "@/lib/auth/berechtigung"
import { dateiLesen } from "@/lib/ablage"

/**
 * Liefert einen Auftrag-Anhang aus — sichtbar für dieselben Personen wie
 * der Auftrag selbst (erstellende Person + zugewiesene Person). Bei
 * fehlender Sicht 404, nicht 403 (kein Hinweis, ob die ID existiert).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ auftragId: string; anhangId: string }> },
) {
  const kontext = await berechtigung()
  const { auftragId, anhangId } = await params

  const anhang = await prisma.auftragAnhang.findUnique({
    where: { id: anhangId },
    include: { auftrag: true },
  })

  const darfSehen =
    anhang !== null &&
    anhang.auftragId === auftragId &&
    (anhang.auftrag.erstelltVonId === kontext.personId || anhang.auftrag.zugewiesenAnId === kontext.personId)

  if (!anhang || !darfSehen) {
    return new Response("Nicht gefunden", { status: 404 })
  }

  const datei = await dateiLesen(anhang.pfad)

  return new Response(new Blob([new Uint8Array(datei)]), {
    headers: {
      "Content-Type": anhang.mimetyp,
      "Content-Disposition": `inline; filename="${anhang.dateiname.replace(/"/g, "")}"`,
    },
  })
}
