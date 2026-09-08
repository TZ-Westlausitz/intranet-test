"use server"

import { revalidatePath } from "next/cache"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { Rolle } from "@/generated/prisma/enums"

/** Siehe Kommentar am Model InfoKategorie: feste, im Adminbereich gepflegte Liste statt Freitext. */
export async function infoKategorieErstellen(formData: FormData) {
  await berechtigung([Rolle.ADMINISTRATION])

  const name = String(formData.get("name") ?? "").trim()
  if (!name) return

  await prisma.infoKategorie.upsert({ where: { name }, update: {}, create: { name } })

  revalidatePath("/admin/info-kategorien")
}

export async function infoKategorieUmbenennen(kategorieId: string, formData: FormData) {
  await berechtigung([Rolle.ADMINISTRATION])

  const name = String(formData.get("name") ?? "").trim()
  if (!name) return

  await prisma.infoKategorie.update({ where: { id: kategorieId }, data: { name } })

  revalidatePath("/admin/info-kategorien")
}

/** Kein Löschen: bestehende Infos (Info.kategorieId) müssen ihre Kategorie behalten. */
export async function infoKategorieAktivSetzen(kategorieId: string, aktiv: boolean) {
  await berechtigung([Rolle.ADMINISTRATION])

  await prisma.infoKategorie.update({ where: { id: kategorieId }, data: { aktiv } })

  revalidatePath("/admin/info-kategorien")
}
