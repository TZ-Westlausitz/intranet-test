import { prisma } from "@/lib/db"
import { berechtigung } from "@/lib/auth/berechtigung"
import { dateiLesen } from "@/lib/ablage"
import { istAktivesProjektmitglied } from "@/lib/projekte/mitgliedschaft"

/**
 * Liefert ein Projektdokument aus — sichtbar für jedes aktive Mitglied des
 * Projekts, nicht nur die hochladende Person (mehrpersonig, wie bei
 * TerminAnhang). Bei fehlender Sicht 404, nicht 403 (kein Hinweis, ob die
 * ID existiert).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projektId: string; dokumentId: string }> },
) {
  const kontext = await berechtigung()
  const { projektId, dokumentId } = await params

  const dokument = await prisma.projektDokument.findUnique({ where: { id: dokumentId } })

  const darfSehen =
    dokument !== null && dokument.projektId === projektId && (await istAktivesProjektmitglied(projektId, kontext.personId))

  if (!dokument || !darfSehen) {
    return new Response("Nicht gefunden", { status: 404 })
  }

  const datei = await dateiLesen(dokument.pfad)

  return new Response(new Blob([new Uint8Array(datei)]), {
    headers: {
      "Content-Type": dokument.mimetyp,
      "Content-Disposition": `inline; filename="${dokument.dateiname.replace(/"/g, "")}"`,
    },
  })
}
