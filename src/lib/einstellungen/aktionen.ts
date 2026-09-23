"use server"

import { revalidatePath } from "next/cache"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { STARTSEITE_WEITERES_MODULE } from "@/lib/bausteine"
import { Farbschema } from "@/generated/prisma/enums"

/**
 * Speichert, welches "Weiteres"-Modul auf der Startseite in Zeile 3,
 * Spalte 4 erscheint (siehe Kommentar an Person.startseiteWeiteresModul).
 * Nur die eigene Präferenz, keine besondere Berechtigung nötig — jede
 * angemeldete Person darf ihre eigene Startseite einstellen.
 */
export async function nutzeroberflaecheAktualisieren(formData: FormData) {
  const kontext = await berechtigung()

  const gewaehlt = String(formData.get("startseiteModul") ?? "")
  const gueltig = STARTSEITE_WEITERES_MODULE.some((punkt) => punkt.name === gewaehlt)

  await prisma.person.update({
    where: { benutzername: kontext.personId },
    data: { startseiteWeiteresModul: gueltig ? gewaehlt : null },
  })

  revalidatePath("/")
  revalidatePath("/einstellungen")
}

/**
 * Speichert das persönliche Farbschema (Person.farbschema). Wirkt sich
 * über das `data-theme`-Attribut im Root-Layout (src/app/layout.tsx) aus
 * — deshalb `revalidatePath("/", "layout")` statt eines einzelnen Pfads
 * wie bei `nutzeroberflaecheAktualisieren` (Muster: adminModusUmschalten).
 */
export async function farbschemaAktualisieren(formData: FormData) {
  const kontext = await berechtigung()

  const gewaehlt = String(formData.get("farbschema") ?? "")
  if (gewaehlt !== Farbschema.HELL && gewaehlt !== Farbschema.DUNKEL) return

  await prisma.person.update({
    where: { benutzername: kontext.personId },
    data: { farbschema: gewaehlt },
  })

  revalidatePath("/", "layout")
}
