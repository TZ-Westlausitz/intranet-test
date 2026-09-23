"use server"

import { revalidatePath } from "next/cache"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"

/** Siehe Kommentar am Model Gruppe: freie Mehrfachzuordnung, unabhängig von Abteilung/Standort/Rolle. */
export async function gruppeErstellen(formData: FormData) {
  await berechtigung({ benoetigteBerechtigung: "Adminbereich" })

  const name = String(formData.get("name") ?? "").trim()
  if (!name) return

  await prisma.gruppe.upsert({ where: { name }, update: {}, create: { name } })

  revalidatePath("/admin/gruppen")
  revalidatePath("/admin")
}

export async function gruppeUmbenennen(gruppeId: string, formData: FormData) {
  await berechtigung({ benoetigteBerechtigung: "Adminbereich" })

  const name = String(formData.get("name") ?? "").trim()
  if (!name) return

  await prisma.gruppe.update({ where: { id: gruppeId }, data: { name } })

  revalidatePath("/admin/gruppen")
}

/** Kein Löschen: bestehende Mitgliedschaften (PersonGruppe) müssen ihre Gruppe behalten. */
export async function gruppeAktivSetzen(gruppeId: string, aktiv: boolean) {
  await berechtigung({ benoetigteBerechtigung: "Adminbereich" })

  await prisma.gruppe.update({ where: { id: gruppeId }, data: { aktiv } })

  revalidatePath("/admin/gruppen")
  revalidatePath("/admin")
}
