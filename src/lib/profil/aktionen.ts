"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { Prisma } from "@/generated/prisma/client"
import { dateiAblegen } from "@/lib/ablage"
import { profilbildPruefen } from "@/lib/profil/profilbild"

/**
 * Speichert die freiwilligen Kontaktangaben im eigenen Profil (E-Mail,
 * Telefon, Weitere Informationen — Vorbild Altsystem "Überblick") — jede
 * angemeldete Person darf nur ihre EIGENEN Daten ändern, `kontext.personId`
 * kommt deshalb aus der Sitzung, nie aus dem Formular selbst.
 *
 * `email` hat ein Unique-Constraint (siehe Model Person) — versucht
 * jemand eine bereits vergebene Adresse, fängt der Prisma-Fehler P2002 das
 * ab und leitet mit einer verständlichen Fehlermeldung zurück, statt die
 * Seite mit einem Serverfehler abstürzen zu lassen.
 */
export async function profilAktualisieren(formData: FormData) {
  const kontext = await berechtigung()

  const email = String(formData.get("email") ?? "").trim() || null
  const telefon = String(formData.get("telefon") ?? "").trim() || null
  const weitereInformationen = String(formData.get("weitereInformationen") ?? "").trim() || null

  try {
    await prisma.person.update({
      where: { benutzername: kontext.personId },
      data: { email, telefon, weitereInformationen },
    })
  } catch (fehler) {
    if (fehler instanceof Prisma.PrismaClientKnownRequestError && fehler.code === "P2002") {
      redirect("/profil?fehler=emailVergeben")
    }
    throw fehler
  }

  revalidatePath("/profil")
  revalidatePath("/kontakte")
  revalidatePath("/kontakte/[personId]", "page")
  redirect("/profil")
}

/**
 * Speichert ein neues Profilbild — immer derselbe Pfad je Person (siehe
 * Kommentar am Model Person), ein erneuter Upload überschreibt schlicht
 * die vorhandene Datei, kein gesonderter Löschschritt nötig. Betrifft
 * potenziell jede Stelle, die InfoAvatar zeigt (Newsfeed, Kontakte,
 * Pop-ups), deshalb die entsprechend breite revalidatePath-Liste.
 */
export async function profilbildAktualisieren(formData: FormData) {
  const kontext = await berechtigung()

  const datei = formData.get("profilbild")
  if (!(datei instanceof File) || datei.size === 0) return

  const fehlerCode = profilbildPruefen(datei)
  if (fehlerCode) redirect(`/profil?fehler=${fehlerCode}`)

  const pfad = `personen/${kontext.personId}/profilbild`
  await dateiAblegen(pfad, new Uint8Array(await datei.arrayBuffer()))

  await prisma.person.update({
    where: { benutzername: kontext.personId },
    data: { profilbildPfad: pfad, profilbildMimetyp: datei.type || "application/octet-stream" },
  })

  revalidatePath("/profil")
  revalidatePath("/newsfeed")
  revalidatePath("/kontakte")
  revalidatePath("/kontakte/[personId]", "page")
  revalidatePath("/")
  redirect("/profil")
}
