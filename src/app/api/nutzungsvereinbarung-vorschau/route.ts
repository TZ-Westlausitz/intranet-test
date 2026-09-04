import { NextRequest } from "next/server"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { formatiereDatum } from "@/lib/datum"
import { nutzungsvereinbarungPdfErzeugen } from "@/lib/pdf/nutzungsvereinbarung"

/**
 * Live-Vorschau des ausgefüllten Nutzungsvereinbarung-PDFs beim Tippen in
 * "Fahrzeug mieten". Echter Route Handler statt Server Action, weil hier
 * eine Datei ausgeliefert wird (siehe CLAUDE.md: "Server Actions statt
 * eigener API-Routen, außer wo ein echter Endpunkt gebraucht wird —
 * PDF-Auslieferung, Health Check").
 *
 * Mieter/in kommt bewusst aus der Session (`berechtigung()`), nicht aus der
 * Anfrage — sonst könnte man im PDF einen fremden Namen als Mieter/in
 * unterschieben. Fahrzeug kommt aus der Datenbank per ID, nicht als
 * Freitext aus der URL. Nur Fahrer und Zeitraum sind das, was gerade
 * getippt wird.
 */
export async function GET(request: NextRequest) {
  const kontext = await berechtigung()

  const { searchParams } = new URL(request.url)
  const fahrzeugId = searchParams.get("fahrzeugId") ?? ""
  const fahrer = searchParams.get("fahrer") ?? ""
  const geplantVon = searchParams.get("geplantVon") ?? ""
  const geplantBis = searchParams.get("geplantBis") ?? ""

  const fahrzeug = await prisma.fahrzeug.findUnique({ where: { id: fahrzeugId } })
  if (!fahrzeug) {
    return new Response("Fahrzeug nicht gefunden", { status: 404 })
  }

  const zeitraumText =
    geplantVon && geplantBis
      ? `${formatiereDatum(geplantVon)} – ${formatiereDatum(geplantBis)}`
      : ""

  const pdfBytes = await nutzungsvereinbarungPdfErzeugen({
    mieterName: kontext.name,
    fahrerAbweichend: fahrer,
    fahrzeugText: `${fahrzeug.bezeichnung} (${fahrzeug.kennzeichen})`,
    zeitraumText,
  })

  return new Response(new Blob([new Uint8Array(pdfBytes)]), {
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "no-store",
    },
  })
}
