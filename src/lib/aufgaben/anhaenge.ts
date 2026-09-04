import { randomUUID } from "node:crypto"

import { dateiAblegen, dateiLoeschen } from "@/lib/ablage"
import { prisma } from "@/lib/db"

/** Reicht für Dokumente/Fotos zu einer Aufgabe — kein Videoschnittplatz. */
const MAX_DATEIGROESSE_BYTES = 15 * 1024 * 1024

const ERLAUBTE_MIMETYPEN = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
])

/**
 * Prüft hochgeladene Dateien, BEVOR irgendetwas gespeichert wird — ein
 * leerer Dateiauswahl-Slot wird stillschweigend übersprungen, ein zu
 * großer oder falscher Dateityp bricht mit einer Fehlermeldung ab.
 * Dieselbe Logik wie bei Termin-Anhängen (terminAnhaengePruefen), hier
 * bewusst als eigene, kleine Kopie statt geteilter Abstraktion — leichter
 * nachzuvollziehen für jemanden, der nur diese eine Datei liest.
 */
export function aufgabeAnhaengePruefen(dateien: File[]): "zuGross" | "typUngueltig" | null {
  for (const datei of dateien) {
    if (datei.size === 0) continue
    if (datei.size > MAX_DATEIGROESSE_BYTES) return "zuGross"
    if (!ERLAUBTE_MIMETYPEN.has(datei.type)) return "typUngueltig"
  }
  return null
}

/** Legt geprüfte Anhänge ab (Regel 7: Datei aufs Volume, nur der Pfad in die DB). */
export async function aufgabeAnhaengeSpeichern(aufgabeId: string, dateien: File[]) {
  for (const datei of dateien) {
    if (datei.size === 0) continue

    const pfad = `aufgaben/${aufgabeId}/${randomUUID()}-${datei.name}`
    const bytes = new Uint8Array(await datei.arrayBuffer())
    await dateiAblegen(pfad, bytes)

    await prisma.aufgabeAnhang.create({
      data: {
        aufgabeId,
        dateiname: datei.name,
        pfad,
        mimetyp: datei.type || "application/octet-stream",
        groesseBytes: datei.size,
      },
    })
  }
}

/** Entfernt einen einzelnen Anhang — sowohl den DB-Eintrag als auch die Datei selbst. */
export async function aufgabeAnhangLoeschenIntern(anhangId: string) {
  const anhang = await prisma.aufgabeAnhang.findUnique({ where: { id: anhangId } })
  if (!anhang) return

  await prisma.aufgabeAnhang.delete({ where: { id: anhangId } })
  await dateiLoeschen(anhang.pfad)
}
