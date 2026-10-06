"use server"

import { revalidatePath } from "next/cache"

import { berechtigung, NichtBerechtigt } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { kalendertagAusEingabe } from "@/lib/datum"
import { projektMitgliedschaftPruefen } from "@/lib/projekte/mitgliedschaft"

const NOTIZ_MAX_LAENGE = 2000

/** Optionale Notiz: schlichter Text, getrimmt und gekürzt; leer = keine Notiz. */
function notizAusFormData(formData: FormData): string | null {
  return String(formData.get("notiz") ?? "").trim().slice(0, NOTIZ_MAX_LAENGE) || null
}

/** Legt ein Zwischenziel an — nur die Leitung, nur solange das Projekt schreibbar ist. Reiht sich anhand der Frist automatisch richtig ein (siehe Kommentar am Model). */
export async function zwischenzielErstellen(projektId: string, formData: FormData) {
  const kontext = await berechtigung()
  await projektMitgliedschaftPruefen(projektId, kontext.personId, { nurLeitung: true, erfordertSchreibrecht: true })

  const titel = String(formData.get("titel") ?? "").trim()
  const fristEingabe = String(formData.get("frist") ?? "")
  if (!titel || !fristEingabe) return

  const frist = kalendertagAusEingabe(fristEingabe)
  if (!frist) return

  await prisma.zwischenziel.create({ data: { projektId, titel, frist, notiz: notizAusFormData(formData) } })

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

  const frist = kalendertagAusEingabe(fristEingabe)
  if (!frist) return

  await prisma.zwischenziel.update({ where: { id: zwischenzielId }, data: { titel, frist, notiz: notizAusFormData(formData) } })

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
