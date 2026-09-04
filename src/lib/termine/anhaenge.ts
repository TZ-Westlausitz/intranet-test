import { randomUUID } from "node:crypto"

import { dateiAblegen, dateiLoeschen } from "@/lib/ablage"
import { prisma } from "@/lib/db"

/** Reicht für Dokumente/Fotos zu einem Termin — kein Videoschnittplatz. */
const MAX_DATEIGROESSE_BYTES = 15 * 1024 * 1024

const ERLAUBTE_MIMETYPEN = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
])

/**
 * Prüft die zum Termin hochgeladenen Dateien, BEVOR irgendetwas
 * gespeichert wird — ein leerer Dateiauswahl-Slot (Browser hängt bei
 * `multiple`-Inputs manchmal eine leere Datei an) wird stillschweigend
 * übersprungen, ein zu großer oder falscher Dateityp bricht mit einer
 * Fehlermeldung ab wie jede andere Formularvalidierung in diesem Projekt.
 */
export function terminAnhaengePruefen(dateien: File[]): "zuGross" | "typUngueltig" | null {
  for (const datei of dateien) {
    if (datei.size === 0) continue
    if (datei.size > MAX_DATEIGROESSE_BYTES) return "zuGross"
    if (!ERLAUBTE_MIMETYPEN.has(datei.type)) return "typUngueltig"
  }
  return null
}

/**
 * Legt geprüfte Anhänge ab (Regel 7: Datei aufs Volume, nur der Pfad in
 * die DB). `kommentarId` gesetzt = Anhang gehört zu einer einzelnen
 * Rückfrage statt direkt zum Termin (siehe Kommentar am Model TerminAnhang).
 */
export async function terminAnhaengeSpeichern(
  terminId: string,
  dateien: File[],
  hochgeladenVonId: string,
  kommentarId?: string,
) {
  for (const datei of dateien) {
    if (datei.size === 0) continue

    const pfad = `termine/${terminId}/${randomUUID()}-${datei.name}`
    const bytes = new Uint8Array(await datei.arrayBuffer())
    await dateiAblegen(pfad, bytes)

    await prisma.terminAnhang.create({
      data: {
        terminId,
        kommentarId,
        dateiname: datei.name,
        pfad,
        mimetyp: datei.type || "application/octet-stream",
        groesseBytes: datei.size,
        hochgeladenVonId,
      },
    })
  }
}

/** Entfernt ausgewählte Anhänge — sowohl den DB-Eintrag als auch die Datei selbst. */
export async function terminAnhaengeLoeschen(terminId: string, anhangIds: string[]) {
  if (anhangIds.length === 0) return

  const anhaenge = await prisma.terminAnhang.findMany({ where: { id: { in: anhangIds }, terminId } })
  await prisma.terminAnhang.deleteMany({ where: { id: { in: anhangIds }, terminId } })

  for (const anhang of anhaenge) {
    await dateiLoeschen(anhang.pfad)
  }
}
