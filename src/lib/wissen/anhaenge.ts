import { randomUUID } from "node:crypto"

import { dateiAblegen, dateiLoeschen } from "@/lib/ablage"
import { prisma } from "@/lib/db"

/** Reicht für Dokumente/Fotos zu einem Wissensartikel — kein Videoschnittplatz. */
const MAX_DATEIGROESSE_BYTES = 15 * 1024 * 1024

const ERLAUBTE_MIMETYPEN = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
])

/**
 * Prüft hochgeladene Dateien, BEVOR irgendetwas gespeichert wird — dieselbe
 * Logik wie bei Info-Anhängen, hier bewusst als eigene kleine Kopie statt
 * geteilter Abstraktion (siehe infos/anhaenge.ts).
 */
export function wissensAnhaengePruefen(dateien: File[]): "zuGross" | "typUngueltig" | null {
  for (const datei of dateien) {
    if (datei.size === 0) continue
    if (datei.size > MAX_DATEIGROESSE_BYTES) return "zuGross"
    if (!ERLAUBTE_MIMETYPEN.has(datei.type)) return "typUngueltig"
  }
  return null
}

/** Legt geprüfte Anhänge ab (Regel 7: Datei aufs Volume, nur der Pfad in die DB). */
export async function wissensAnhaengeSpeichern(artikelId: string, dateien: File[], hochgeladenVonId: string) {
  for (const datei of dateien) {
    if (datei.size === 0) continue

    const pfad = `wissen/${artikelId}/${randomUUID()}-${datei.name}`
    const bytes = new Uint8Array(await datei.arrayBuffer())
    await dateiAblegen(pfad, bytes)

    await prisma.wissensAnhang.create({
      data: {
        artikelId,
        dateiname: datei.name,
        pfad,
        mimetyp: datei.type || "application/octet-stream",
        groesseBytes: datei.size,
        hochgeladenVonId,
      },
    })
  }
}

/** Entfernt einen einzelnen Anhang — sowohl den DB-Eintrag als auch die Datei selbst. */
export async function wissensAnhangLoeschenIntern(anhangId: string) {
  const anhang = await prisma.wissensAnhang.findUnique({ where: { id: anhangId } })
  if (!anhang) return

  await prisma.wissensAnhang.delete({ where: { id: anhangId } })
  await dateiLoeschen(anhang.pfad)
}
