import { randomUUID } from "node:crypto"

import { dateiAblegen } from "@/lib/ablage"
import { prisma } from "@/lib/db"

/** Reicht für Fotos/Dokumente/Sprachnachrichten im Chat — kein Videoschnittplatz. Muster infos/anhaenge.ts. */
const MAX_DATEIGROESSE_BYTES = 15 * 1024 * 1024

/**
 * Audio-Typen für Sprachnachrichten (Rückmeldung 2026-09-10) — je nach
 * Browser liefert `MediaRecorder` unterschiedliche Formate (Chrome/
 * Firefox meist "audio/webm", Safari nur "audio/mp4"), siehe
 * ChatKonversationAnsicht/sprachaufnahmeMimetyp.
 */
const ERLAUBTE_MIMETYPEN = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "audio/webm",
  "audio/mp4",
  "audio/ogg",
  "audio/mpeg",
])

/** Prüft hochgeladene Dateien, BEVOR irgendetwas gespeichert wird — Muster infoAnhaengePruefen. */
export function chatAnhaengePruefen(dateien: File[]): "zuGross" | "typUngueltig" | null {
  for (const datei of dateien) {
    if (datei.size === 0) continue
    if (datei.size > MAX_DATEIGROESSE_BYTES) return "zuGross"
    if (!ERLAUBTE_MIMETYPEN.has(datei.type)) return "typUngueltig"
  }
  return null
}

/** Legt geprüfte Anhänge zu einer bereits angelegten Nachricht ab (Regel 7). */
export async function chatAnhaengeSpeichern(nachrichtId: string, dateien: File[]) {
  const erzeugt = []
  for (const datei of dateien) {
    if (datei.size === 0) continue

    const pfad = `chat/${nachrichtId}/${randomUUID()}-${datei.name}`
    const bytes = new Uint8Array(await datei.arrayBuffer())
    await dateiAblegen(pfad, bytes)

    const anhang = await prisma.chatNachrichtAnhang.create({
      data: {
        nachrichtId,
        dateiname: datei.name,
        pfad,
        mimetyp: datei.type || "application/octet-stream",
        groesseBytes: datei.size,
      },
    })
    erzeugt.push(anhang)
  }
  return erzeugt
}
