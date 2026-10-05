import { prisma } from "@/lib/db"
import { berechtigung } from "@/lib/auth/berechtigung"
import { dateiLesen } from "@/lib/ablage"
import { fuhrparkRechte } from "@/lib/fuhrpark/zugriff"

/**
 * Liefert ein Schadensfoto aus — sichtbar für dieselben Personen wie das
 * Fahrzeugprofil (Werkstatt, "Fahrzeuge lesen", Halter), siehe
 * fahrzeugProfil. Sonst 404 statt 403, damit sich nicht erraten lässt, ob
 * es die Datei gibt.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ fotoId: string }> }) {
  const kontext = await berechtigung()
  const { fotoId } = await params

  const foto = await prisma.fahrzeugschadenFoto.findUnique({
    where: { id: fotoId },
    select: { pfad: true, mimetyp: true, schaden: { select: { fahrzeug: { select: { halterId: true } } } } },
  })

  const darfSehen =
    foto !== null &&
    (fuhrparkRechte(kontext).darfAlleSehen || foto.schaden.fahrzeug.halterId === kontext.personId)
  if (!foto || !darfSehen) return new Response("Nicht gefunden", { status: 404 })

  const datei = await dateiLesen(foto.pfad)

  return new Response(new Blob([new Uint8Array(datei)]), {
    headers: {
      "Content-Type": foto.mimetyp,
      // Nur im Browser anzeigen, nie als Seite ausführen; Foto soll nicht zwischengespeichert werden (Zugriffsrechte können sich ändern).
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  })
}
