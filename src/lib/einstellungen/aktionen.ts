"use server"

import { revalidatePath } from "next/cache"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { Farbschema } from "@/generated/prisma/enums"

// Die frühere `nutzeroberflaecheAktualisieren` (ein wählbares "Weiteres"-
// Modul) ist seit 2026-09-28 durch das modulare Startseiten-Raster ersetzt
// — siehe src/lib/startseite/aktionen.ts (modulPlatzieren/modulEntfernen/
// rasterAufStandardZuruecksetzen) und src/lib/startseite/raster.ts.

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
