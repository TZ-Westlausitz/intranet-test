"use server"

import { revalidatePath } from "next/cache"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { formularSichtbarFuer } from "@/lib/formulare/sichtbarkeit"
import {
  brauchtUnterauswahl,
  FORMULARE_MAX_SHORTCUTS,
  KONTAKTE_MAX,
  KONTAKTE_MIN,
  leereZellen,
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
 * WISSENSBEREICH und FORMULARE bei BREIT, siehe kontakteModulPlatzieren/
 * wissensbereichModulPlatzieren/formulareModulPlatzieren) an einer
 * Rasterposition — verschiebt es dabei automatisch von einer
 * eventuellen bisherigen Position (jedes Modul kommt nur einmal im Raster
 * vor). Ungültige Ziele (belegt, außerhalb des Rasters, Form passt dort
 * nicht) werden stillschweigend verworfen, statt einen fehlerhaften
 * Zustand zu speichern — das Einstellungen-Pop-up bietet ohnehin nur
 * passende Ziele an.
 */
export async function modulPlatzieren(position: number, modul: StartseiteModulId, form: StartseiteForm) {
  const kontext = await berechtigung()
  if (!STARTSEITE_MODUL_KATALOG.some((m) => m.id === modul) || brauchtUnterauswahl(modul, form)) return

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

/** Platziert oder bearbeitet die FORMULARE-Kachel bei der Form BREIT mit Vorlagen-Auswahl — liest `formData` ("vorlagen"), bis zu 5, nur Vorlagen, die für die Person tatsächlich verfügbar sind (Muster: verfuegbareFormulare). */
export async function formulareModulPlatzieren(position: number, form: StartseiteForm, formData: FormData) {
  const kontext = await berechtigung()
  if (
    !platzierungPasst(
      (await eigenesRaster(kontext.personId)).filter((p) => p.modul !== "FORMULARE"),
      position,
      "FORMULARE",
      form
    )
  ) {
    return
  }

  const gewaehlt = formData.getAll("vorlagen").map(String)
  if (gewaehlt.length === 0 || gewaehlt.length > FORMULARE_MAX_SHORTCUTS) return

  const verfuegbareVorlagen = await prisma.formularVorlage.findMany({
    where: { id: { in: gewaehlt }, aktiv: true, istEntwurf: false, ...formularSichtbarFuer(kontext.personId) },
    select: { id: true },
  })
  const gueltigeIds = new Set(verfuegbareVorlagen.map((v) => v.id))
  const formularIds = gewaehlt.filter((id) => gueltigeIds.has(id))
  if (formularIds.length === 0) return

  const bestehend = (await eigenesRaster(kontext.personId)).filter((p) => p.modul !== "FORMULARE")
  await rasterSpeichern(kontext.personId, [...bestehend, { position, modul: "FORMULARE", form, formularIds }])
}

/** Entfernt ein Modul wieder aus dem Raster — die Zelle(n) werden frei (Kreuz-Knopf im Einstellungen-Pop-up). */
export async function modulEntfernen(modul: StartseiteModulId) {
  const kontext = await berechtigung()
  const bestehend = (await eigenesRaster(kontext.personId)).filter((p) => p.modul !== modul)
  await rasterSpeichern(kontext.personId, bestehend)
}

/**
 * Füllt beim Verlassen der Einstellungen-Seite automatisch alle noch
 * freien Rasterzellen auf (Rückmeldung 2026-09-30: "alle 8 Plätze sollen
 * immer eine Belegung haben, nie frei bleiben dürfen") — mit noch nicht
 * verwendeten Modulen in zufälliger Reihenfolge, jeweils als KLEIN und
 * ohne Unterauswahl (Kontakte/Wissensbereich brauchen erst eine Auswahl,
 * Newsfeed kennt gar kein KLEIN — beides käme für eine automatische
 * Befüllung nicht ohne Weiteres in Frage). Bleiben mehr Lücken als
 * geeignete Module übrig, bleibt der Rest ausnahmsweise frei, statt ein
 * ungültiges Raster zu speichern. Aufgerufen von
 * StartseiteRasterEinstellung beim Unmount (Navigation weg von der Seite).
 */
export async function rasterLueckenFuellen() {
  const kontext = await berechtigung()
  const bestehend = await eigenesRaster(kontext.personId)
  const luecken = leereZellen(bestehend)
  if (luecken.length === 0) return

  const verwendet = new Set(bestehend.map((p) => p.modul))
  const kandidaten = STARTSEITE_MODUL_KATALOG.filter(
    (m) => !verwendet.has(m.id) && m.formen.includes("KLEIN") && !brauchtUnterauswahl(m.id, "KLEIN"),
  ).map((m) => m.id)
  for (let i = kandidaten.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[kandidaten[i], kandidaten[j]] = [kandidaten[j], kandidaten[i]]
  }

  const neu = [...bestehend]
  for (const position of luecken) {
    const modul = kandidaten.pop()
    if (!modul) break
    neu.push({ position, modul, form: "KLEIN" })
  }

  await rasterSpeichern(kontext.personId, neu)
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
