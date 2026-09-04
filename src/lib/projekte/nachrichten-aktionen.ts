"use server"

import { revalidatePath } from "next/cache"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { projektMitgliedschaftPruefen } from "@/lib/projekte/mitgliedschaft"

/** Nachricht im projektweiten Thread — schlichter Text, kein Rich-Text (siehe Kommentar am Model Projektnachricht). */
export async function projektNachrichtErstellen(projektId: string, formData: FormData) {
  const kontext = await berechtigung()
  await projektMitgliedschaftPruefen(projektId, kontext.personId, { erfordertSchreibrecht: true })

  const text = String(formData.get("text") ?? "").trim()
  if (!text) return

  await prisma.projektnachricht.create({ data: { projektId, personId: kontext.personId, text } })

  revalidatePath(`/aufgaben/projekte/${projektId}`)
}
