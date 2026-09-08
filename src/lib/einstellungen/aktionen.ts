"use server"

import { revalidatePath } from "next/cache"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { BAUSTEINE } from "@/lib/bausteine"

/**
 * Speichert, welches "Weiteres"-Modul auf der Startseite in Zeile 3,
 * Spalte 4 erscheint (siehe Kommentar an Person.startseiteWeiteresModul).
 * Nur die eigene Präferenz, keine besondere Berechtigung nötig — jede
 * angemeldete Person darf ihre eigene Startseite einstellen.
 */
export async function nutzeroberflaecheAktualisieren(formData: FormData) {
  const kontext = await berechtigung()

  const gewaehlt = String(formData.get("startseiteModul") ?? "")
  const weiteresEintrag = BAUSTEINE.find((baustein) => baustein.unterpunkte)
  const gueltig = weiteresEintrag?.unterpunkte?.some((punkt) => punkt.name === gewaehlt) ?? false

  await prisma.person.update({
    where: { benutzername: kontext.personId },
    data: { startseiteWeiteresModul: gueltig ? gewaehlt : null },
  })

  revalidatePath("/")
  revalidatePath("/einstellungen/nutzeroberflaeche")
}
