import { prisma } from "@/lib/db"
import { berechtigung } from "@/lib/auth/berechtigung"
import { dateiLesen } from "@/lib/ablage"

/**
 * Liefert das Profilbild einer Person aus — sichtbar für jede angemeldete
 * Person, genau wie die Kontakte-Übersicht selbst org-weit sichtbar ist
 * (keine zusätzliche Sichtbarkeitsprüfung wie bei Info-Anhängen nötig).
 * 404, wenn kein Bild gesetzt ist — der Aufrufer (InfoAvatar) fragt das
 * über `profilbildPfad` ohnehin vorher ab und zeigt sonst den
 * Initialen-Kreis, diese Route wird also nur bei tatsächlich vorhandenem
 * Bild angefragt.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ personId: string }> }) {
  await berechtigung()
  const { personId } = await params
  // Der Benutzername enthält ein "@" — siehe Kommentar in
  // /kontakte/[personId], hier aus demselben Grund nötig.
  const echterPersonId = decodeURIComponent(personId)

  const person = await prisma.person.findUnique({
    where: { benutzername: echterPersonId },
    select: { profilbildPfad: true, profilbildMimetyp: true },
  })
  if (!person?.profilbildPfad) {
    return new Response("Nicht gefunden", { status: 404 })
  }

  const datei = await dateiLesen(person.profilbildPfad)

  return new Response(new Blob([new Uint8Array(datei)]), {
    headers: {
      "Content-Type": person.profilbildMimetyp ?? "application/octet-stream",
      // Kurz cachen statt dauerhaft: derselbe Pfad wird bei einem neuen
      // Upload überschrieben (siehe Kommentar am Model Person), ohne
      // dieses Zeitlimit würde der Browser sonst ein altes Bild u. U.
      // sehr lange weiter anzeigen.
      "Cache-Control": "private, max-age=300, must-revalidate",
    },
  })
}
