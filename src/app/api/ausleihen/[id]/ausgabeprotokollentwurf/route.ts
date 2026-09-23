import { prisma } from "@/lib/db"
import { berechtigung } from "@/lib/auth/berechtigung"
import { dateiLesen } from "@/lib/ablage"

/**
 * Liefert den vorbereiteten (noch nicht unterschriebenen) PDF-Entwurf des
 * Übergabeprotokolls aus — dieselbe Zugriffsprüfung wie bei
 * /api/ausleihen/[id]/vereinbarungsentwurf.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const kontext = await berechtigung()
  const { id } = await params

  const ausleihe = await prisma.ausleihe.findUnique({ where: { id } })

  const darfSehen =
    ausleihe !== null &&
    (ausleihe.entleiherId === kontext.personId ||
      kontext.berechtigungen.includes("Werkstattleiter") ||
      kontext.berechtigungen.includes("Adminbereich"))

  if (!ausleihe || !darfSehen || !ausleihe.ausgabeprotokollEntwurfPfad) {
    return new Response("Nicht gefunden", { status: 404 })
  }

  const pdf = await dateiLesen(ausleihe.ausgabeprotokollEntwurfPfad)

  return new Response(new Blob([new Uint8Array(pdf)]), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Uebergabeprotokoll-${ausleihe.vorgangsnummer}.pdf"`,
    },
  })
}
