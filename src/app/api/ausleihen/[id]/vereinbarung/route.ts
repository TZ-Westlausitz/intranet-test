import { prisma } from "@/lib/db"
import { berechtigung } from "@/lib/auth/berechtigung"
import { dateiLesen } from "@/lib/ablage"
import { Rolle } from "@/generated/prisma/enums"

/**
 * Liefert die unterschriebene Nutzungsvereinbarung aus — anders als
 * /vereinbarungsentwurf ein echter Nachweis, kein Entwurf.
 *
 * Dieselbe Zugriffsprüfung wie beim Entwurf: Entleiher/in selbst oder
 * Werkstattleitung/Verwaltung — sonst 404, nicht 403 (siehe dort).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const kontext = await berechtigung()
  const { id } = await params

  const ausleihe = await prisma.ausleihe.findUnique({
    where: { id },
    include: { vereinbarung: true },
  })

  const darfSehen =
    ausleihe !== null &&
    (ausleihe.entleiherId === kontext.personId ||
      kontext.rollen.includes(Rolle.WERKSTATTLEITER) ||
      kontext.rollen.includes(Rolle.ADMINISTRATION))

  if (!ausleihe || !darfSehen || !ausleihe.vereinbarung) {
    return new Response("Nicht gefunden", { status: 404 })
  }

  const pdf = await dateiLesen(ausleihe.vereinbarung.pdfPfad)

  return new Response(new Blob([new Uint8Array(pdf)]), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Nutzungsvereinbarung-${ausleihe.vorgangsnummer}.pdf"`,
    },
  })
}
