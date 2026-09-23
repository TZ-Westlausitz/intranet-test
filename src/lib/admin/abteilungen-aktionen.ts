"use server"

import { revalidatePath } from "next/cache"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"

/** Nur der Adminbereich verwaltet Abteilungen — sie hängen am Rechtemodell (Zugehoerigkeit). */
export async function abteilungErstellen(formData: FormData) {
  await berechtigung({ benoetigteBerechtigung: "Adminbereich" })

  const name = String(formData.get("name") ?? "").trim()
  const kuerzel = String(formData.get("kuerzel") ?? "").trim().toLowerCase() || null
  if (!name) return

  await prisma.abteilung.upsert({ where: { name }, update: {}, create: { name, kuerzel } })

  revalidatePath("/admin/gruppen")
  revalidatePath("/admin")
}

/**
 * `kuerzel` steht hier mit dabei, weil daraus der Benutzername neuer
 * Personen dieser Abteilung zusammengesetzt wird (siehe personErstellen) —
 * ohne Kürzel kann in dieser Abteilung niemand mehr angelegt werden.
 */
export async function abteilungUmbenennen(abteilungId: string, formData: FormData) {
  await berechtigung({ benoetigteBerechtigung: "Adminbereich" })

  const name = String(formData.get("name") ?? "").trim()
  const kuerzel = String(formData.get("kuerzel") ?? "").trim().toLowerCase() || null
  if (!name) return

  await prisma.abteilung.update({ where: { id: abteilungId }, data: { name, kuerzel } })

  revalidatePath("/admin/gruppen")
}

/** Kein Löschen: bestehende Zugehoerigkeiten müssen ihre Abteilung behalten. */
export async function abteilungAktivSetzen(abteilungId: string, aktiv: boolean) {
  await berechtigung({ benoetigteBerechtigung: "Adminbereich" })

  await prisma.abteilung.update({ where: { id: abteilungId }, data: { aktiv } })

  revalidatePath("/admin/gruppen")
  revalidatePath("/admin")
}
