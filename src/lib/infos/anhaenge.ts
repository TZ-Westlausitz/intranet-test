import { randomUUID } from "node:crypto"

import { dateiAblegen, dateiLoeschen } from "@/lib/ablage"
import { prisma } from "@/lib/db"

/** Reicht für Dokumente/Fotos zu einer Info — kein Videoschnittplatz. */
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
 * Logik wie bei Termin-/Auftrags-Anhängen, hier bewusst als eigene kleine
 * Kopie statt geteilter Abstraktion (siehe termine/anhaenge.ts).
 */
export function infoAnhaengePruefen(dateien: File[]): "zuGross" | "typUngueltig" | null {
  for (const datei of dateien) {
    if (datei.size === 0) continue
    if (datei.size > MAX_DATEIGROESSE_BYTES) return "zuGross"
    if (!ERLAUBTE_MIMETYPEN.has(datei.type)) return "typUngueltig"
  }
  return null
}

/**
 * Legt geprüfte Anhänge ab (Regel 7: Datei aufs Volume, nur der Pfad in die
 * DB). `kommentarId` gesetzt = Anhang gehört zu einer Rückfrage statt direkt
 * zur Info (siehe Kommentar am Model InfoAnhang). Gibt die erzeugten Zeilen
 * zurück (in derselben Reihenfolge wie `dateien`, leere Dateien
 * übersprungen) — genutzt von infoErstellen, um eingefügte Inline-Bilder
 * nach dem Speichern per erzeugter ID im Fließtext aufzulösen.
 */
export async function infoAnhaengeSpeichern(
  infoId: string,
  dateien: File[],
  hochgeladenVonId: string,
  kommentarId?: string,
  eingebettet = false,
) {
  const erzeugt = []
  for (const datei of dateien) {
    if (datei.size === 0) continue

    const pfad = `infos/${infoId}/${randomUUID()}-${datei.name}`
    const bytes = new Uint8Array(await datei.arrayBuffer())
    await dateiAblegen(pfad, bytes)

    const anhang = await prisma.infoAnhang.create({
      data: {
        infoId,
        kommentarId,
        dateiname: datei.name,
        pfad,
        mimetyp: datei.type || "application/octet-stream",
        groesseBytes: datei.size,
        hochgeladenVonId,
        eingebettet,
      },
    })
    erzeugt.push(anhang)
  }
  return erzeugt
}

/** Entfernt einen einzelnen Anhang — sowohl den DB-Eintrag als auch die Datei selbst. */
export async function infoAnhangLoeschenIntern(anhangId: string) {
  const anhang = await prisma.infoAnhang.findUnique({ where: { id: anhangId } })
  if (!anhang) return

  await prisma.infoAnhang.delete({ where: { id: anhangId } })
  await dateiLoeschen(anhang.pfad)
}
