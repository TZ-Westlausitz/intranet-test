import { randomUUID } from "node:crypto"

import { dateiAblegen, dateiLoeschen } from "@/lib/ablage"
import { prisma } from "@/lib/db"

/**
 * Der Browser verkleinert jedes Foto vor dem Hochladen und speichert es als
 * JPEG (siehe SchadenFotoAuswahl) — grob unter 1 MB. Die Obergrenze hier ist
 * nur die Sicherung gegen Umgehung, nicht die erwartete Größe.
 */
const MAX_DATEIGROESSE_BYTES = 8 * 1024 * 1024
/** Pro Erfassung bzw. pro Nachtrag — mehr braucht niemand für einen Schaden. */
export const MAX_FOTOS_PRO_VORGANG = 8

export type FotoFehler = "fotoZuGross" | "fotoTyp" | "fotoAnzahl"

/**
 * REGEL 10: keine Ortungsdaten. Nimmt ein JPEG und lässt die Segmente weg,
 * in denen Kameras Metadaten ablegen — EXIF/XMP (APP1, dort steht u. a. die
 * GPS-Position), IPTC (APP13) und Kommentare (COM). Bild und Farbprofil
 * bleiben unverändert (kein erneutes Komprimieren). `null`, wenn die Datei
 * kein lesbares JPEG ist.
 *
 * Der Browser hat die Metadaten beim Verkleinern bereits entfernt — das hier
 * ist die serverseitige Absicherung, denn eine Prüfung allein im Client
 * lässt sich umgehen. Die EXIF-Drehung geht dabei verloren; beim Browser-
 * Weg ist sie schon in die Pixel eingerechnet.
 */
export function jpegOhneMetadaten(bytes: Uint8Array): Uint8Array | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null

  const teile: Uint8Array[] = [bytes.subarray(0, 2)]
  let position = 2

  while (position + 4 <= bytes.length) {
    if (bytes[position] !== 0xff) return null
    const marke = bytes[position + 1]

    // Füllbytes zwischen Segmenten.
    if (marke === 0xff) {
      position++
      continue
    }
    // Start der Bilddaten: ab hier bis zum Ende unverändert übernehmen.
    if (marke === 0xda) {
      teile.push(bytes.subarray(position))
      const laenge = teile.reduce((summe, t) => summe + t.length, 0)
      const ergebnis = new Uint8Array(laenge)
      let versatz = 0
      for (const t of teile) {
        ergebnis.set(t, versatz)
        versatz += t.length
      }
      return ergebnis
    }

    const segmentLaenge = (bytes[position + 2] << 8) | bytes[position + 3]
    if (segmentLaenge < 2 || position + 2 + segmentLaenge > bytes.length) return null

    const istMetadaten = marke === 0xe1 || marke === 0xed || marke === 0xfe
    if (!istMetadaten) teile.push(bytes.subarray(position, position + 2 + segmentLaenge))
    position += 2 + segmentLaenge
  }

  return null
}

/**
 * Prüft die Foto-Auswahl und entfernt die Metadaten, BEVOR irgendetwas
 * gespeichert wird — so bricht ein ungültiges Foto ab, ohne dass schon ein
 * halber Schaden angelegt wurde. Leere Auswahl-Slots (manche Browser hängen
 * bei `multiple`-Feldern einen an) werden ignoriert.
 */
export async function schadenFotosVorbereiten(
  dateien: File[],
): Promise<{ fehler: FotoFehler } | { fehler: null; fotos: Uint8Array[] }> {
  const echte = dateien.filter((datei) => datei.size > 0)
  if (echte.length > MAX_FOTOS_PRO_VORGANG) return { fehler: "fotoAnzahl" }

  const fotos: Uint8Array[] = []
  for (const datei of echte) {
    if (datei.size > MAX_DATEIGROESSE_BYTES) return { fehler: "fotoZuGross" }
    if (datei.type !== "image/jpeg") return { fehler: "fotoTyp" }
    const sauber = jpegOhneMetadaten(new Uint8Array(await datei.arrayBuffer()))
    if (!sauber) return { fehler: "fotoTyp" }
    fotos.push(sauber)
  }
  return { fehler: null, fotos }
}

/**
 * Legt die vorbereiteten Fotos zu den angegebenen Schadensstellen ab — jede
 * Stelle bekommt ihre eigene Datei, damit sich ein Foto an einer Stelle
 * unabhängig von den anderen löschen lässt.
 */
export async function schadenFotosSpeichern(schadenIds: string[], fotos: Uint8Array[], hochgeladenVonId: string) {
  for (const schadenId of schadenIds) {
    for (const bytes of fotos) {
      const pfad = `fahrzeugschaeden/${schadenId}/${randomUUID()}.jpg`
      await dateiAblegen(pfad, bytes)
      await prisma.fahrzeugschadenFoto.create({
        data: { schadenId, pfad, mimetyp: "image/jpeg", groesseBytes: bytes.length, hochgeladenVonId },
      })
    }
  }
}

/** Entfernt ein Foto — DB-Eintrag und Datei. */
export async function schadenFotoLoeschen(fotoId: string) {
  const foto = await prisma.fahrzeugschadenFoto.findUnique({ where: { id: fotoId } })
  if (!foto) return
  await prisma.fahrzeugschadenFoto.delete({ where: { id: fotoId } })
  await dateiLoeschen(foto.pfad)
}
