import { randomUUID } from "node:crypto"

import { dateiAblegen } from "@/lib/ablage"
import { prisma } from "@/lib/db"

/** Reicht für inline in die Beschreibung eingefügte Bilder — kein Videoschnittplatz. */
const MAX_DATEIGROESSE_BYTES = 15 * 1024 * 1024

const ERLAUBTE_MIMETYPEN = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"])

/** Muster: infoAnhaengePruefen. */
export function formularVorlageBilderPruefen(dateien: File[]): "zuGross" | "typUngueltig" | null {
  for (const datei of dateien) {
    if (datei.size === 0) continue
    if (datei.size > MAX_DATEIGROESSE_BYTES) return "zuGross"
    if (!ERLAUBTE_MIMETYPEN.has(datei.type)) return "typUngueltig"
  }
  return null
}

/** Legt Inline-Bilder für die Beschreibung ab (Regel 7) — Muster infoAnhaengeSpeichern, gibt die erzeugten Zeilen in derselben Reihenfolge zurück. */
export async function formularVorlageBilderSpeichern(vorlageId: string, dateien: File[]) {
  const erzeugt = []
  for (const datei of dateien) {
    if (datei.size === 0) continue

    const pfad = `formulare/vorlagen/${vorlageId}/${randomUUID()}-${datei.name}`
    const bytes = new Uint8Array(await datei.arrayBuffer())
    await dateiAblegen(pfad, bytes)

    const bild = await prisma.formularVorlageBild.create({
      data: {
        vorlageId,
        dateiname: datei.name,
        pfad,
        mimetyp: datei.type || "application/octet-stream",
        groesseBytes: datei.size,
      },
    })
    erzeugt.push(bild)
  }
  return erzeugt
}
