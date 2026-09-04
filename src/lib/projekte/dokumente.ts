import { randomUUID } from "node:crypto"

import { dateiAblegen, dateiLoeschen } from "@/lib/ablage"
import { prisma } from "@/lib/db"

/** Wie bei den übrigen Anhang-Tabellen (siehe src/lib/aufgaben/anhaenge.ts). */
const MAX_DATEIGROESSE_BYTES = 15 * 1024 * 1024

/**
 * Breiter als die übrigen Anhang-Tabellen: in einem Projekt wird teils
 * gemeinsam an Dokumenten/Tabellen gearbeitet, deshalb zusätzlich Word und
 * Excel (siehe Kommentar am Model ProjektDokument).
 */
const ERLAUBTE_MIMETYPEN = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
])

export function projektDokumentAnhaengePruefen(dateien: File[]): "zuGross" | "typUngueltig" | null {
  for (const datei of dateien) {
    if (datei.size === 0) continue
    if (datei.size > MAX_DATEIGROESSE_BYTES) return "zuGross"
    if (!ERLAUBTE_MIMETYPEN.has(datei.type)) return "typUngueltig"
  }
  return null
}

export async function projektDokumenteSpeichern(projektId: string, dateien: File[], hochgeladenVonId: string) {
  for (const datei of dateien) {
    if (datei.size === 0) continue

    const pfad = `projekte/${projektId}/${randomUUID()}-${datei.name}`
    const bytes = new Uint8Array(await datei.arrayBuffer())
    await dateiAblegen(pfad, bytes)

    await prisma.projektDokument.create({
      data: {
        projektId,
        dateiname: datei.name,
        pfad,
        mimetyp: datei.type || "application/octet-stream",
        groesseBytes: datei.size,
        hochgeladenVonId,
      },
    })
  }
}

/** Entfernt ein Projektdokument — sowohl den DB-Eintrag als auch die Datei selbst. */
export async function projektDokumentLoeschenIntern(dokumentId: string) {
  const dokument = await prisma.projektDokument.findUnique({ where: { id: dokumentId } })
  if (!dokument) return

  await prisma.projektDokument.delete({ where: { id: dokumentId } })
  await dateiLoeschen(dokument.pfad)
}
