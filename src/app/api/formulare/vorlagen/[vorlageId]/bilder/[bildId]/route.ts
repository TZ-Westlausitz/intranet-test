import { prisma } from "@/lib/db"
import { berechtigung } from "@/lib/auth/berechtigung"
import { dateiLesen } from "@/lib/ablage"
import { contentDispositionHeader } from "@/lib/http"
import { formularSichtbarFuer, darfFormulareVerwalten } from "@/lib/formulare/sichtbarkeit"

/**
 * Liefert ein in die Beschreibung eingefügtes Vorlage-Bild aus — sichtbar
 * für Wissensmanager (Verwaltung) UND für jeden, der die Vorlage sonst
 * schon sehen darf (Muster: Wissen-Anhang-Route, 404 statt 403).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ vorlageId: string; bildId: string }> },
) {
  const kontext = await berechtigung()
  const { vorlageId, bildId } = await params

  const bild = await prisma.formularVorlageBild.findUnique({ where: { id: bildId } })
  if (!bild || bild.vorlageId !== vorlageId) {
    return new Response("Nicht gefunden", { status: 404 })
  }

  const darfSehen =
    darfFormulareVerwalten(kontext) ||
    (await prisma.formularVorlage.findFirst({
      where: { id: vorlageId, ...formularSichtbarFuer(kontext.personId) },
      select: { id: true },
    })) !== null

  if (!darfSehen) {
    return new Response("Nicht gefunden", { status: 404 })
  }

  const datei = await dateiLesen(bild.pfad)

  return new Response(new Blob([new Uint8Array(datei)]), {
    headers: {
      "Content-Type": bild.mimetyp,
      "Content-Disposition": contentDispositionHeader(bild.dateiname),
    },
  })
}
