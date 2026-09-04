import { mkdir, readFile, unlink, writeFile } from "node:fs/promises"
import path from "node:path"

/**
 * Ablage für Dateien (PDFs, später Unterschriften, Schadensfotos) —
 * Regel 7: Dateien gehören nicht in die Datenbank, nur der Pfad.
 *
 * `ABLAGE_PFAD` zeigt im Betrieb auf ein gemountetes Volume (siehe
 * README, Abschnitt "Sicherung"). Lokal ohne die Variable liegt alles
 * unter ./storage im Projekt — deshalb in der .gitignore.
 */
const ABLAGE_WURZEL = process.env.ABLAGE_PFAD ?? path.join(process.cwd(), "storage")

export async function dateiAblegen(relativerPfad: string, inhalt: Uint8Array): Promise<void> {
  const zielpfad = path.join(ABLAGE_WURZEL, relativerPfad)
  await mkdir(path.dirname(zielpfad), { recursive: true })
  await writeFile(zielpfad, inhalt)
}

export async function dateiLesen(relativerPfad: string): Promise<Buffer> {
  return readFile(path.join(ABLAGE_WURZEL, relativerPfad))
}

/** Ignoriert "gibt es nicht" — Aufräumen soll nicht daran scheitern. */
export async function dateiLoeschen(relativerPfad: string): Promise<void> {
  try {
    await unlink(path.join(ABLAGE_WURZEL, relativerPfad))
  } catch (fehler) {
    if ((fehler as NodeJS.ErrnoException).code !== "ENOENT") throw fehler
  }
}
