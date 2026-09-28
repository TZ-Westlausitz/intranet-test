"use server"

import { revalidatePath } from "next/cache"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { parseRaster, platzierungPasst, STARTSEITE_MODUL_KATALOG, type StartseiteModulId } from "@/lib/startseite/raster"

/** Nur die eigene Präferenz — keine besondere Berechtigung nötig, jede angemeldete Person stellt ihre eigene Startseite ein (Muster: nutzeroberflaecheAktualisieren). */
async function eigenesRaster(personId: string) {
  const person = await prisma.person.findUniqueOrThrow({
    where: { benutzername: personId },
    select: { startseiteRaster: true },
  })
  return parseRaster(person.startseiteRaster)
}

/**
 * Platziert ein Modul an einer Rasterposition — verschiebt es dabei
 * automatisch von einer eventuellen bisherigen Position (jedes Modul kommt
 * nur einmal im Raster vor). Ungültige Ziele (belegt, außerhalb des
 * Rasters, GROSS an einer Stelle ohne Platz) werden stillschweigend
 * verworfen, statt einen fehlerhaften Zustand zu speichern — das
 * Einstellungen-Pop-up bietet ohnehin nur passende Ziele an.
 */
export async function modulPlatzieren(position: number, modul: StartseiteModulId) {
  const kontext = await berechtigung()
  if (!STARTSEITE_MODUL_KATALOG.some((m) => m.id === modul)) return

  const bestehend = (await eigenesRaster(kontext.personId)).filter((p) => p.modul !== modul)
  if (!platzierungPasst(bestehend, position, modul)) return

  const neuesRaster = [...bestehend, { position, modul }]
  await prisma.person.update({
    where: { benutzername: kontext.personId },
    data: { startseiteRaster: JSON.stringify(neuesRaster) },
  })

  revalidatePath("/")
  revalidatePath("/einstellungen")
}

/** Entfernt ein Modul wieder aus dem Raster — die Zelle(n) werden frei (Kreuz-Knopf im Einstellungen-Pop-up). */
export async function modulEntfernen(modul: StartseiteModulId) {
  const kontext = await berechtigung()
  const bestehend = await eigenesRaster(kontext.personId)
  const neuesRaster = bestehend.filter((p) => p.modul !== modul)

  await prisma.person.update({
    where: { benutzername: kontext.personId },
    data: { startseiteRaster: JSON.stringify(neuesRaster) },
  })

  revalidatePath("/")
  revalidatePath("/einstellungen")
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
