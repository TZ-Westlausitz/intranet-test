"use server"

import { revalidatePath } from "next/cache"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"

/**
 * Schaltet den Admin-Modus (siehe Kontext.adminModusAktiv) für die
 * anfragende Person um — nur Berechtigung "Admin" darf das (Regel 5),
 * eine Stufe höher als "Adminbereich" (reiner /admin-Zugriff).
 * `revalidatePath("/", "layout")` statt eines gezielten Pfads, weil der
 * Modus die Desktop-Menüleiste im Root-Layout selbst einfärbt und auf
 * mehreren Seiten (Newsfeed, Aufgaben, Projekte) die Datenquelle
 * umschaltet — die betroffenen Stellen sind zu verteilt für einen
 * einzelnen `revalidatePath`-Aufruf.
 */
export async function adminModusUmschalten(formData: FormData) {
  const kontext = await berechtigung({ benoetigteBerechtigung: "Admin" })
  const aktiv = formData.get("aktiv") === "on"
  await prisma.person.update({ where: { benutzername: kontext.personId }, data: { adminModusAktiv: aktiv } })
  revalidatePath("/", "layout")
}
