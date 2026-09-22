import { prisma } from "@/lib/db"
import { berechtigung } from "@/lib/auth/berechtigung"
import { dateiLesen } from "@/lib/ablage"
import { meldungAnhangZugriffPruefen } from "@/lib/kontaktstelle/abfragen"
import { contentDispositionHeader } from "@/lib/http"

/**
 * Liefert einen Meldungs-Anhang aus — sichtbar für die meldende Person
 * selbst oder die Kontaktstelle. Muster: Formular-Anhang-Route, 404 statt
 * 403 bei fehlender Sicht (verrät nicht einmal, ob die ID existiert).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ meldungId: string; anhangId: string }> }) {
  const kontext = await berechtigung()
  const { meldungId, anhangId } = await params

  const anhang = await prisma.meldungAnhang.findUnique({ where: { id: anhangId } })
  const darfSehen =
    anhang !== null && anhang.meldungId === meldungId && (await meldungAnhangZugriffPruefen(anhangId, kontext))

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
