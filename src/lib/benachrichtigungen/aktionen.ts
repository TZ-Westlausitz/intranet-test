"use server"

import { revalidatePath } from "next/cache"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"

/**
 * Markiert alle eigenen Benachrichtigungen als gelesen — aufgerufen, wenn
 * die Glocke aufgeklappt wird. `"layout"` statt des Default-Typs, weil die
 * Glocke im Root-Layout steckt und für JEDE Seite frisch gerendert werden
 * muss, nicht nur für die gerade aktive Route.
 */
export async function benachrichtigungenAlsGelesenMarkieren() {
  const kontext = await berechtigung()

  await prisma.benachrichtigung.updateMany({
    where: { personId: kontext.personId, gelesenAm: null },
    data: { gelesenAm: new Date() },
  })

  revalidatePath("/", "layout")
}
