import { randomUUID } from "node:crypto"

import { dateiAblegen, dateiLoeschen } from "@/lib/ablage"
import { prisma } from "@/lib/db"

/** Reicht für Dokumente/Fotos zu einem Auftrag — kein Videoschnittplatz. */
const MAX_DATEIGROESSE_BYTES = 15 * 1024 * 1024

const ERLAUBTE_MIMETYPEN = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
])

/**
 * Prüft hochgeladene Dateien, BEVOR irgendetwas gespeichert wird — genau
 * dieselbe Logik wie bei Aufgabe/Termin-Anhängen, hier bewusst als eigene
 * kleine Kopie statt geteilter Abstraktion (siehe aufgaben/anhaenge.ts).
 */
export function auftragAnhaengePruefen(dateien: File[]): "zuGross" | "typUngueltig" | null {
  for (const datei of dateien) {
    if (datei.size === 0) continue
    if (datei.size > MAX_DATEIGROESSE_BYTES) return "zuGross"
    if (!ERLAUBTE_MIMETYPEN.has(datei.type)) return "typUngueltig"
  }
  return null
}

/**
 * Legt geprüfte Anhänge ab (Regel 7: Datei aufs Volume, nur der Pfad in
 * die DB). `kommentarId` gesetzt = Anhang gehört zu einer Rückfrage statt
 * direkt zum Auftrag (siehe Kommentar am Model AuftragAnhang).
 */
export async function auftragAnhaengeSpeichern(auftragId: string, dateien: File[], kommentarId?: string) {
  for (const datei of dateien) {
    if (datei.size === 0) continue

    const pfad = `auftraege/${auftragId}/${randomUUID()}-${datei.name}`
    const bytes = new Uint8Array(await datei.arrayBuffer())
    await dateiAblegen(pfad, bytes)

    await prisma.auftragAnhang.create({
      data: {
        auftragId,
        kommentarId,
        dateiname: datei.name,
        pfad,
        mimetyp: datei.type || "application/octet-stream",
        groesseBytes: datei.size,
      },
    })
  }
}

/** Entfernt einen einzelnen Anhang — sowohl den DB-Eintrag als auch die Datei selbst. */
export async function auftragAnhangLoeschenIntern(anhangId: string) {
  const anhang = await prisma.auftragAnhang.findUnique({ where: { id: anhangId } })
  if (!anhang) return

  await prisma.auftragAnhang.delete({ where: { id: anhangId } })
  await dateiLoeschen(anhang.pfad)
}
