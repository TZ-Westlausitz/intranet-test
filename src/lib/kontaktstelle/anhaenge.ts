import { randomUUID } from "node:crypto"

import { dateiAblegen } from "@/lib/ablage"
import { prisma } from "@/lib/db"

/** Reicht für Belege/Fotos zu einer Meldung — Muster formularAnhangPruefen. */
const MAX_DATEIGROESSE_BYTES = 15 * 1024 * 1024

const ERLAUBTE_MIMETYPEN = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic"])

export function meldungAnhangPruefen(datei: File): "zuGross" | "typUngueltig" | null {
  if (datei.size === 0) return null
  if (datei.size > MAX_DATEIGROESSE_BYTES) return "zuGross"
  if (!ERLAUBTE_MIMETYPEN.has(datei.type)) return "typUngueltig"
  return null
}

/**
 * Legt einen Anhang ab (Regel 7: Datei aufs Volume, nur der Pfad in die
 * DB) — `kommentarId` nur bei einem Anhang zu einer Rückfrage gesetzt,
 * sonst bleibt er weg (Anhang zur Erstmeldung). Bewusst kein
 * Identitätsfeld: Autorschaft ergibt sich aus `meldung`/`kommentar`, siehe
 * Kommentar am Modell.
 */
export async function meldungAnhangSpeichern(meldungId: string, datei: File, kommentarId?: string) {
  const pfad = `kontaktstelle/${meldungId}/${randomUUID()}-${datei.name}`
  const bytes = new Uint8Array(await datei.arrayBuffer())
  await dateiAblegen(pfad, bytes)

  await prisma.meldungAnhang.create({
    data: {
      meldungId,
      kommentarId,
      dateiname: datei.name,
      pfad,
      mimetyp: datei.type || "application/octet-stream",
      groesseBytes: datei.size,
    },
  })
}
