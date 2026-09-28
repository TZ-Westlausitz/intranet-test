"use server"

import { revalidatePath } from "next/cache"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import {
  brauchtUnterauswahl,
  KONTAKTE_MAX,
  KONTAKTE_MIN,
  parseRaster,
  platzierungPasst,
  STARTSEITE_MODUL_KATALOG,
  WISSENSBEREICH_MAX_ORDNER_HOCH,
  type StartseiteForm,
  type StartseiteModulId,
  type StartseitePlatzierung,
} from "@/lib/startseite/raster"

/** Nur die eigene Präferenz — keine besondere Berechtigung nötig, jede angemeldete Person stellt ihre eigene Startseite ein (Muster: nutzeroberflaecheAktualisieren). */
async function eigenesRaster(personId: string) {
  const person = await prisma.person.findUniqueOrThrow({
    where: { benutzername: personId },
    select: { startseiteRaster: true },
  })
  return parseRaster(person.startseiteRaster)
}

async function rasterSpeichern(personId: string, raster: StartseitePlatzierung[]) {
  await prisma.person.update({
    where: { benutzername: personId },
    data: { startseiteRaster: JSON.stringify(raster) },
  })
  revalidatePath("/")
  revalidatePath("/einstellungen")
}

/**
 * Platziert ein Modul OHNE Unterauswahl (alles außer KONTAKTE/
 * WISSENSBEREICH, siehe kontakteModulPlatzieren/wissensbereichModulPlatzieren)
 * an einer Rasterposition — verschiebt es dabei automatisch von einer
 * eventuellen bisherigen Position (jedes Modul kommt nur einmal im Raster
 * vor). Ungültige Ziele (belegt, außerhalb des Rasters, Form passt dort
 * nicht) werden stillschweigend verworfen, statt einen fehlerhaften
 * Zustand zu speichern — das Einstellungen-Pop-up bietet ohnehin nur
 * passende Ziele an.
 */
export async function modulPlatzieren(position: number, modul: StartseiteModulId, form: StartseiteForm) {
  const kontext = await berechtigung()
  if (!STARTSEITE_MODUL_KATALOG.some((m) => m.id === modul) || brauchtUnterauswahl(modul)) return

  const bestehend = (await eigenesRaster(kontext.personId)).filter((p) => p.modul !== modul)
  if (!platzierungPasst(bestehend, position, modul, form)) return

  await rasterSpeichern(kontext.personId, [...bestehend, { position, modul, form }])
}

/** Platziert oder bearbeitet die KONTAKTE-Kachel — liest die gewählten Personen aus `formData` ("teilnehmer", Muster PersonenAuswahl), 3–5 Stück, nur tatsächlich aktive Personen. */
export async function kontakteModulPlatzieren(position: number, form: StartseiteForm, formData: FormData) {
  const kontext = await berechtigung()
  if (!platzierungPasst((await eigenesRaster(kontext.personId)).filter((p) => p.modul !== "KONTAKTE"), position, "KONTAKTE", form)) {
    return
  }

  const gewaehlt = formData.getAll("teilnehmer").map(String)
  if (gewaehlt.length < KONTAKTE_MIN || gewaehlt.length > KONTAKTE_MAX) return

  const aktivePersonen = await prisma.person.findMany({
    where: { benutzername: { in: gewaehlt }, aktiv: true },
    select: { benutzername: true },
  })
  const gueltigeIds = new Set(aktivePersonen.map((p) => p.benutzername))
  const personenIds = gewaehlt.filter((id) => gueltigeIds.has(id))
  if (personenIds.length < KONTAKTE_MIN) return

  const bestehend = (await eigenesRaster(kontext.personId)).filter((p) => p.modul !== "KONTAKTE")
  await rasterSpeichern(kontext.personId, [...bestehend, { position, modul: "KONTAKTE", form, personenIds }])
}

/** Platziert oder bearbeitet die WISSENSBEREICH-Kachel mit Ordner-Auswahl — liest `formData` ("ordner"), 1 Ordner (KLEIN/BREIT) oder bis zu 3 (HOCH), nur tatsächlich aktive Ordner. */
export async function wissensbereichModulPlatzieren(position: number, form: StartseiteForm, formData: FormData) {
  const kontext = await berechtigung()
  if (
    !platzierungPasst(
      (await eigenesRaster(kontext.personId)).filter((p) => p.modul !== "WISSENSBEREICH"),
      position,
      "WISSENSBEREICH",
      form
    )
  ) {
    return
  }

  const gewaehlt = formData.getAll("ordner").map(String)
  const maxOrdner = form === "HOCH" ? WISSENSBEREICH_MAX_ORDNER_HOCH : 1
  if (gewaehlt.length === 0 || gewaehlt.length > maxOrdner) return

  const aktiveOrdner = await prisma.wissensOrdner.findMany({
    where: { id: { in: gewaehlt }, aktiv: true },
    select: { id: true },
  })
  const gueltigeIds = new Set(aktiveOrdner.map((o) => o.id))
  const ordnerIds = gewaehlt.filter((id) => gueltigeIds.has(id))
  if (ordnerIds.length === 0) return

  const bestehend = (await eigenesRaster(kontext.personId)).filter((p) => p.modul !== "WISSENSBEREICH")
  await rasterSpeichern(kontext.personId, [...bestehend, { position, modul: "WISSENSBEREICH", form, ordnerIds }])
}

/** Entfernt ein Modul wieder aus dem Raster — die Zelle(n) werden frei (Kreuz-Knopf im Einstellungen-Pop-up). */
export async function modulEntfernen(modul: StartseiteModulId) {
  const kontext = await berechtigung()
  const bestehend = (await eigenesRaster(kontext.personId)).filter((p) => p.modul !== modul)
  await rasterSpeichern(kontext.personId, bestehend)
}

/** Setzt auf STARTSEITE_STANDARD zurück (siehe raster.ts) — technisch einfach `null`, dann greift beim Lesen der Fallback. */
export async function rasterAufStandardZuruecksetzen() {
  const kontext = await berechtigung()
  await prisma.person.update({
    where: { benutzername: kontext.personId },
    data: { startseiteRaster: null },
  })
  revalidatePath("/")
  revalidatePath("/einstellungen")
}
