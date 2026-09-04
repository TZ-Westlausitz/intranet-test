"use server"

import { revalidatePath } from "next/cache"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { Rolle } from "@/generated/prisma/enums"

/** Siehe Kommentar am Model Berechtigung: feature-bezogene Freischaltung, unabhängig von Rolle und Gruppe. */
export async function berechtigungErstellen(formData: FormData) {
  await berechtigung([Rolle.ADMINISTRATION])

  const name = String(formData.get("name") ?? "").trim()
  if (!name) return

  await prisma.berechtigung.upsert({ where: { name }, update: {}, create: { name } })

  revalidatePath("/admin/berechtigungen")
  revalidatePath("/admin")
}

export async function berechtigungUmbenennen(berechtigungId: string, formData: FormData) {
  await berechtigung([Rolle.ADMINISTRATION])

  const name = String(formData.get("name") ?? "").trim()
  if (!name) return

  await prisma.berechtigung.update({ where: { id: berechtigungId }, data: { name } })

  revalidatePath("/admin/berechtigungen")
}

/** Kein Löschen: bestehende Zuweisungen (PersonBerechtigung) müssen ihre Berechtigung behalten. */
export async function berechtigungAktivSetzen(berechtigungId: string, aktiv: boolean) {
  await berechtigung([Rolle.ADMINISTRATION])

  await prisma.berechtigung.update({ where: { id: berechtigungId }, data: { aktiv } })

  revalidatePath("/admin/berechtigungen")
  revalidatePath("/admin")
}
