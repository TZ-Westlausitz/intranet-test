"use server"

import { revalidatePath } from "next/cache"

import { berechtigung, NichtBerechtigt } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { projektMitgliedschaftPruefen } from "@/lib/projekte/mitgliedschaft"

/** Legt ein Zwischenziel an — nur die Leitung, nur solange das Projekt schreibbar ist. Reiht sich anhand der Frist automatisch richtig ein (siehe Kommentar am Model). */
export async function zwischenzielErstellen(projektId: string, formData: FormData) {
  const kontext = await berechtigung()
  await projektMitgliedschaftPruefen(projektId, kontext.personId, { nurLeitung: true, erfordertSchreibrecht: true })

  const titel = String(formData.get("titel") ?? "").trim()
  const fristEingabe = String(formData.get("frist") ?? "")
  if (!titel || !fristEingabe) return

  const frist = new Date(`${fristEingabe}T00:00:00`)
  if (Number.isNaN(frist.getTime())) return

  await prisma.zwischenziel.create({ data: { projektId, titel, frist } })

  revalidatePath(`/aufgaben/projekte/${projektId}`)
}

export async function zwischenzielAktualisieren(projektId: string, zwischenzielId: string, formData: FormData) {
  const kontext = await berechtigung()
  await projektMitgliedschaftPruefen(projektId, kontext.personId, { nurLeitung: true, erfordertSchreibrecht: true })

  const zwischenziel = await prisma.zwischenziel.findUnique({ where: { id: zwischenzielId } })
  if (!zwischenziel || zwischenziel.projektId !== projektId) {
    throw new NichtBerechtigt("Zwischenziel nicht gefunden")
  }

  const titel = String(formData.get("titel") ?? "").trim()
  const fristEingabe = String(formData.get("frist") ?? "")
  if (!titel || !fristEingabe) return

  const frist = new Date(`${fristEingabe}T00:00:00`)
  if (Number.isNaN(frist.getTime())) return

  await prisma.zwischenziel.update({ where: { id: zwischenzielId }, data: { titel, frist } })

  revalidatePath(`/aufgaben/projekte/${projektId}`)
}

/** Löscht ein Zwischenziel — zugeordnete Aufgaben bleiben erhalten, zwischenzielId wird geleert (siehe onDelete: SetNull im Schema). */
export async function zwischenzielLoeschen(projektId: string, zwischenzielId: string) {
  const kontext = await berechtigung()
  await projektMitgliedschaftPruefen(projektId, kontext.personId, { nurLeitung: true, erfordertSchreibrecht: true })

  const zwischenziel = await prisma.zwischenziel.findUnique({ where: { id: zwischenzielId } })
  if (!zwischenziel || zwischenziel.projektId !== projektId) {
    throw new NichtBerechtigt("Zwischenziel nicht gefunden")
  }

  await prisma.zwischenziel.delete({ where: { id: zwischenzielId } })

  revalidatePath(`/aufgaben/projekte/${projektId}`)
}
