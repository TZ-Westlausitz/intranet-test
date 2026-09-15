import { mkdir, readFile, unlink, writeFile } from "node:fs/promises"
import path from "node:path"

import { createClient } from "@supabase/supabase-js"

/**
 * Ablage für Dateien (PDFs, später Unterschriften, Schadensfotos) —
 * Regel 7: Dateien gehören nicht in die Datenbank, nur der Pfad.
 *
 * Zwei mögliche Ziele, automatisch anhand der gesetzten Umgebungsvariablen
 * gewählt:
 * - Ohne SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY: lokales Dateisystem.
 *   `ABLAGE_PFAD` zeigt im On-Premise-Betrieb auf ein gemountetes Volume
 *   (siehe README, Abschnitt "Sicherung"). Lokal ohne die Variable liegt
 *   alles unter ./storage im Projekt — deshalb in der .gitignore.
 * - Mit beiden Variablen gesetzt: Supabase Storage (Bucket
 *   SUPABASE_STORAGE_BUCKET, Standard "ablage") — für den Geräte-Test auf
 *   Vercel, wo das lokale Dateisystem flüchtig ist und Uploads sonst beim
 *   nächsten Kaltstart verschwinden würden.
 */
const ABLAGE_WURZEL = process.env.ABLAGE_PFAD ?? path.join(process.cwd(), "storage")

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "ablage"

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null

export async function dateiAblegen(relativerPfad: string, inhalt: Uint8Array): Promise<void> {
  if (supabase) {
    const { error } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).upload(relativerPfad, inhalt, {
      upsert: true,
    })
    if (error) throw error
    return
  }

  // turbopackIgnore: dieser Zweig läuft auf Vercel nie (dort sind die
  // Supabase-Variablen immer gesetzt) — ohne den Hinweis würde Turbopack
  // wegen des dynamischen Pfads sicherheitshalber das ganze Projekt
  // (inklusive public/) ins Server-Bundle tracen.
  const zielpfad = path.join(/* turbopackIgnore: true */ ABLAGE_WURZEL, relativerPfad)
  await mkdir(path.dirname(zielpfad), { recursive: true })
  await writeFile(zielpfad, inhalt)
}

export async function dateiLesen(relativerPfad: string): Promise<Buffer> {
  if (supabase) {
    const { data, error } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).download(relativerPfad)
    if (error) throw error
    return Buffer.from(await data.arrayBuffer())
  }

  return readFile(path.join(/* turbopackIgnore: true */ ABLAGE_WURZEL, relativerPfad))
}

/** Ignoriert "gibt es nicht" — Aufräumen soll nicht daran scheitern. */
export async function dateiLoeschen(relativerPfad: string): Promise<void> {
  if (supabase) {
    await supabase.storage.from(SUPABASE_STORAGE_BUCKET).remove([relativerPfad])
    return
  }

  try {
    await unlink(path.join(/* turbopackIgnore: true */ ABLAGE_WURZEL, relativerPfad))
  } catch (fehler) {
    if ((fehler as NodeJS.ErrnoException).code !== "ENOENT") throw fehler
  }
}
