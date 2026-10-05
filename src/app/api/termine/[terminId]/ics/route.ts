import { berechtigung } from "@/lib/auth/berechtigung"
import { terminFuerExport } from "@/lib/termine/abfragen"
import { kalenderFeedBauen } from "@/lib/kalender-abo/ics"
import { contentDispositionHeader } from "@/lib/http"
import { richTextZuTextMitUmbruechen } from "@/lib/rich-text"

/**
 * Einzelnen Termin als Kalenderdatei (.ics) herunterladen — "Zum Kalender
 * hinzufügen" im Termin-Pop-Up. Nur für Personen, die den Termin auch im
 * Intranet sehen dürfen (Erstellerin/Ersteller und Eingeladene), sonst 404.
 * Anders als der Abo-Feed gehen hier Beschreibung und Erinnerungen mit: die
 * angemeldete Person lädt die Datei selbst herunter.
 */
export async function GET(request: Request, { params }: { params: Promise<{ terminId: string }> }) {
  const kontext = await berechtigung()
  const { terminId } = await params

  const termin = await terminFuerExport(kontext.personId, terminId)
  if (!termin) return new Response("Nicht gefunden", { status: 404 })

  const inhalt = kalenderFeedBauen(
    [
      {
        id: termin.id,
        titel: termin.titel,
        ort: termin.ort,
        beginn: termin.beginn,
        ende: termin.ende,
        ganztaegig: termin.ganztaegig,
        beschreibung: termin.beschreibung ? richTextZuTextMitUmbruechen(termin.beschreibung) : null,
        erinnerungenMinuten: termin.erinnerungen.map((e) => e.minutenVorher),
      },
    ],
    new URL(request.url).origin,
    { einzeln: true },
  )

  const dateiname = `${termin.titel.replace(/[\\/:*?"<>|\r\n]+/g, " ").trim().slice(0, 60) || "Termin"}.ics`
  return new Response(inhalt, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": contentDispositionHeader(dateiname, "attachment"),
      "Cache-Control": "private, no-store",
    },
  })
}
