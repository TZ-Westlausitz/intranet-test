import { randomUUID } from "node:crypto"

import { dateiAblegen, dateiLoeschen } from "@/lib/ablage"
import { prisma } from "@/lib/db"

/** Reicht für Belege/Fotos zu einer Formular-Einreichung — kein Videoschnittplatz. */
const MAX_DATEIGROESSE_BYTES = 15 * 1024 * 1024

const ERLAUBTE_MIMETYPEN = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic"])

/** Prüft eine hochgeladene Datei, BEVOR irgendetwas gespeichert wird — Muster wissensAnhaengePruefen. */
export function formularAnhangPruefen(datei: File): "zuGross" | "typUngueltig" | null {
  if (datei.size === 0) return null
  if (datei.size > MAX_DATEIGROESSE_BYTES) return "zuGross"
  if (!ERLAUBTE_MIMETYPEN.has(datei.type)) return "typUngueltig"
  return null
}

/** Legt die Datei-Antwort zu einem DATEI-Element ab (Regel 7: Datei aufs Volume, nur der Pfad in die DB). */
export async function formularAnhangSpeichern(einreichungId: string, elementId: string, datei: File) {
  const pfad = `formulare/${einreichungId}/${randomUUID()}-${datei.name}`
  const bytes = new Uint8Array(await datei.arrayBuffer())
  await dateiAblegen(pfad, bytes)

  await prisma.formularEinreichungAnhang.create({
    data: {
      einreichungId,
      elementId,
      dateiname: datei.name,
      pfad,
      mimetyp: datei.type || "application/octet-stream",
      groesseBytes: datei.size,
    },
  })
}

/** Entfernt einen Anhang samt Datei — nur intern gebraucht, falls eine Einreichung insgesamt aufgeräumt werden muss. */
export async function formularAnhangLoeschenIntern(anhangId: string) {
  const anhang = await prisma.formularEinreichungAnhang.findUnique({ where: { id: anhangId } })
  if (!anhang) return

  await prisma.formularEinreichungAnhang.delete({ where: { id: anhangId } })
  await dateiLoeschen(anhang.pfad)
}
