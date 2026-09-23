"use server"

import { revalidatePath } from "next/cache"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"

/** Siehe Kommentar am Model Ort: feinere Orte innerhalb eines Standorts, für eine spätere Orts-Auswahl statt Freitext. */
export async function ortErstellen(formData: FormData) {
  await berechtigung({ benoetigteBerechtigung: "Adminbereich" })

  const name = String(formData.get("name") ?? "").trim()
  if (!name) return

  await prisma.ort.upsert({ where: { name }, update: {}, create: { name } })

  revalidatePath("/admin/orte")
  revalidatePath("/admin")
}

export async function ortUmbenennen(ortId: string, formData: FormData) {
  await berechtigung({ benoetigteBerechtigung: "Adminbereich" })

  const name = String(formData.get("name") ?? "").trim()
  if (!name) return

  await prisma.ort.update({ where: { id: ortId }, data: { name } })

  revalidatePath("/admin/orte")
}

export async function ortAktivSetzen(ortId: string, aktiv: boolean) {
  await berechtigung({ benoetigteBerechtigung: "Adminbereich" })

  await prisma.ort.update({ where: { id: ortId }, data: { aktiv } })

  revalidatePath("/admin/orte")
  revalidatePath("/admin")
}
