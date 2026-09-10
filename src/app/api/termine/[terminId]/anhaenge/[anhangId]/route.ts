import { prisma } from "@/lib/db"
import { berechtigung } from "@/lib/auth/berechtigung"
import { dateiLesen } from "@/lib/ablage"
import { contentDispositionHeader } from "@/lib/http"

/**
 * Liefert einen Termin-Anhang aus — sichtbar für dieselben Personen wie
 * der Termin selbst (erstellende Person + Eingeladene), siehe
 * `sichtbarFuer` in termine/abfragen.ts. Bei fehlender Sicht 404, nicht
 * 403, wie bei der Nutzungsvereinbarung (kein Hinweis, ob die ID existiert).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ terminId: string; anhangId: string }> },
) {
  const kontext = await berechtigung()
  const { terminId, anhangId } = await params

  const anhang = await prisma.terminAnhang.findUnique({
    where: { id: anhangId },
    include: { termin: { include: { teilnehmer: { select: { personId: true } } } } },
  })

  const darfSehen =
    anhang !== null &&
    anhang.terminId === terminId &&
    (anhang.termin.erstelltVonId === kontext.personId ||
      anhang.termin.teilnehmer.some((t) => t.personId === kontext.personId))

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
