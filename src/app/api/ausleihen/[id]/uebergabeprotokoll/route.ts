import { prisma } from "@/lib/db"
import { berechtigung } from "@/lib/auth/berechtigung"
import { dateiLesen } from "@/lib/ablage"
import { Protokollrichtung } from "@/generated/prisma/enums"

/**
 * Liefert das aktuell aussagekräftigste unterschriebene Übergabeprotokoll
 * aus — RUECKNAHME, falls es schon existiert (das PDF davon enthält Ausgabe
 * UND Rücknahme, siehe uebergabeprotokollPdfErzeugen), sonst AUSGABE.
 * Anders als /ausgabeprotokollentwurf ein echter Nachweis, kein Entwurf.
 *
 * Dieselbe Zugriffsprüfung wie bei den anderen Protokoll-Routen: Entleiher/in
 * selbst oder Werkstattleitung/Verwaltung — sonst 404, nicht 403.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const kontext = await berechtigung()
  const { id } = await params

  const ausleihe = await prisma.ausleihe.findUnique({
    where: { id },
    include: { protokolle: true },
  })

  const darfSehen =
    ausleihe !== null &&
    (ausleihe.entleiherId === kontext.personId ||
      kontext.berechtigungen.includes("Werkstattleiter") ||
      kontext.berechtigungen.includes("Adminbereich"))

  if (!ausleihe || !darfSehen) {
    return new Response("Nicht gefunden", { status: 404 })
  }

  const protokoll =
    ausleihe.protokolle.find((p) => p.richtung === Protokollrichtung.RUECKNAHME) ??
    ausleihe.protokolle.find((p) => p.richtung === Protokollrichtung.AUSGABE)

  if (!protokoll) {
    return new Response("Nicht gefunden", { status: 404 })
  }

  const pdf = await dateiLesen(protokoll.pdfPfad)

  return new Response(new Blob([new Uint8Array(pdf)]), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Uebergabeprotokoll-${ausleihe.vorgangsnummer}.pdf"`,
    },
  })
}
