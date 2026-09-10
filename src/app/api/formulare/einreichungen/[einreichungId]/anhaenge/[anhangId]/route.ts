import { prisma } from "@/lib/db"
import { berechtigung } from "@/lib/auth/berechtigung"
import { dateiLesen } from "@/lib/ablage"
import { istFormularEmpfaenger } from "@/lib/formulare/sichtbarkeit"
import { contentDispositionHeader } from "@/lib/http"

/**
 * Liefert einen Einreichungs-Anhang aus (Datei-Antwort oder generierte
 * PDF) — sichtbar für die einreichende Person ODER den Empfänger der
 * Vorlage. Muster: Wissen-Anhang-Route, 404 statt 403 bei fehlender
 * Sicht.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ einreichungId: string; anhangId: string }> },
) {
  const kontext = await berechtigung()
  const { einreichungId, anhangId } = await params

  const anhang = await prisma.formularEinreichungAnhang.findUnique({
    where: { id: anhangId },
    include: { einreichung: { select: { eingereichtVonId: true, vorlageId: true } } },
  })

  const darfSehen =
    anhang !== null &&
    anhang.einreichungId === einreichungId &&
    (anhang.einreichung.eingereichtVonId === kontext.personId ||
      (await istFormularEmpfaenger(anhang.einreichung.vorlageId, kontext.personId)))

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
