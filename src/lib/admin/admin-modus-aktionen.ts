"use server"

import { revalidatePath } from "next/cache"

import { Rolle } from "@/generated/prisma/enums"
import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"

/**
 * Schaltet den Admin-Modus (siehe Kontext.adminModusAktiv) für die
 * anfragende Person um — nur Rolle ADMINISTRATION darf das (Regel 5).
 * `revalidatePath("/", "layout")` statt eines gezielten Pfads, weil der
 * Modus die Desktop-Menüleiste im Root-Layout selbst einfärbt und auf
 * mehreren Seiten (Newsfeed, Aufgaben, Projekte) die Datenquelle
 * umschaltet — die betroffenen Stellen sind zu verteilt für einen
 * einzelnen `revalidatePath`-Aufruf.
 */
export async function adminModusUmschalten(formData: FormData) {
  const kontext = await berechtigung([Rolle.ADMINISTRATION])
  const aktiv = formData.get("aktiv") === "on"
  await prisma.person.update({ where: { benutzername: kontext.personId }, data: { adminModusAktiv: aktiv } })
  revalidatePath("/", "layout")
}
