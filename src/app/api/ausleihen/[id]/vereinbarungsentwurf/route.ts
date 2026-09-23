import { prisma } from "@/lib/db"
import { berechtigung } from "@/lib/auth/berechtigung"
import { dateiLesen } from "@/lib/ablage"

/**
 * Liefert den vorbereiteten (noch nicht unterschriebenen) PDF-Entwurf der
 * Nutzungsvereinbarung aus — für den Werkstattleiter bei der Übergabe.
 *
 * Echter Route Handler statt Server Action, weil hier eine Datei
 * ausgeliefert wird (siehe CLAUDE.md, Abschnitt Server Actions).
 * Dieselbe Zugriffsprüfung wie auf /ausleihen/[id]: Entleiher/in selbst
 * oder Werkstattleitung/Verwaltung — sonst 404, nicht 403, damit sich über
 * den Statuscode nicht erraten lässt, welche IDs existieren.
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

  if (!ausleihe || !darfSehen || !ausleihe.vereinbarungsentwurfPfad) {
    return new Response("Nicht gefunden", { status: 404 })
  }

  const pdf = await dateiLesen(ausleihe.vereinbarungsentwurfPfad)

  return new Response(new Blob([new Uint8Array(pdf)]), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Nutzungsvereinbarung-${ausleihe.vorgangsnummer}.pdf"`,
    },
  })
}
