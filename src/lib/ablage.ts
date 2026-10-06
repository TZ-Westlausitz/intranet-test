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

/**
 * Supabase Storage akzeptiert nur ASCII-Zeichen in Schlüsseln — ein Umlaut
 * oder Sonderzeichen im Dateinamen ("Gespräch Norman.pdf", "Foto (1).jpg")
 * ergibt "InvalidKey" und damit einen Absturz beim Speichern. Der Schlüssel
 * wird deshalb nur für Supabase umgeschrieben: Umlaute ausgeschrieben (ä →
 * ae, ß → ss), alles andere Ungewöhnliche zu "_". Der Dateiname selbst
 * bleibt unverändert in der Datenbank (Spalte `dateiname`) und beim
 * Herunterladen sichtbar; in den Pfaden steht davor immer eine
 * UUID, Kollisionen sind ausgeschlossen. Gewöhnliche Pfade ändern sich nicht,
 * bereits abgelegte Dateien bleiben also lesbar.
 */
function supabaseSchluessel(relativerPfad: string): string {
  return relativerPfad
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("Ä", "Ae")
    .replaceAll("Ö", "Oe")
    .replaceAll("Ü", "Ue")
    .replaceAll("ß", "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9._\-/@]/g, "_")
}

export async function dateiAblegen(relativerPfad: string, inhalt: Uint8Array): Promise<void> {
  if (supabase) {
    const { error } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).upload(supabaseSchluessel(relativerPfad), inhalt, {
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
    const { data, error } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).download(supabaseSchluessel(relativerPfad))
    if (error) throw error
    return Buffer.from(await data.arrayBuffer())
  }

  return readFile(path.join(/* turbopackIgnore: true */ ABLAGE_WURZEL, relativerPfad))
}

/** Ignoriert "gibt es nicht" — Aufräumen soll nicht daran scheitern. */
export async function dateiLoeschen(relativerPfad: string): Promise<void> {
  if (supabase) {
    await supabase.storage.from(SUPABASE_STORAGE_BUCKET).remove([supabaseSchluessel(relativerPfad)])
    return
  }

  try {
    await unlink(path.join(/* turbopackIgnore: true */ ABLAGE_WURZEL, relativerPfad))
  } catch (fehler) {
    if ((fehler as NodeJS.ErrnoException).code !== "ENOENT") throw fehler
  }
}
