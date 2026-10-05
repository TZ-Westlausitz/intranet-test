"use server"

import { randomBytes } from "node:crypto"
import { revalidatePath } from "next/cache"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"

/**
 * Erzeugt einen neuen geheimen Abo-Link für die EIGENE Person — beim ersten
 * Mal und jedes Mal, wenn der Link "neu erzeugt" wird (der alte ist dann
 * sofort ungültig, z. B. wenn er in falsche Hände geraten ist). 32 Zufalls-
 * Byte, nicht erratbar. `kontext.personId` kommt aus der Sitzung, nie aus dem
 * Formular.
 */
export async function kalenderAboErzeugen() {
  const kontext = await berechtigung()
  await prisma.person.update({
    where: { benutzername: kontext.personId },
    data: { kalenderAboToken: randomBytes(32).toString("base64url") },
  })
  revalidatePath("/kalender")
}

/** Beendet das Abo: der Link liefert danach nichts mehr (404). */
export async function kalenderAboBeenden() {
  const kontext = await berechtigung()
  await prisma.person.update({ where: { benutzername: kontext.personId }, data: { kalenderAboToken: null } })
  revalidatePath("/kalender")
}
