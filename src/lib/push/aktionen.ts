"use server"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { pushSenden, pushVerfuegbar } from "@/lib/push/senden"

type AboEingabe = { endpoint: string; keys: { p256dh: string; auth: string } }

/**
 * Meldet das aktuelle Gerät für Push-Mitteilungen an (Einstellungen →
 * "Mitteilungen auf diesem Gerät"). Eine Person kann beliebig viele Geräte
 * anmelden; meldet sich ein Gerät, das vorher einer anderen Person gehörte
 * (geteiltes Handy), wird es der aktuellen Person zugeordnet — jedes Gerät
 * gehört immer genau einer Person.
 */
export async function pushAboSpeichern(abo: AboEingabe): Promise<void> {
  const kontext = await berechtigung()

  const endpoint = String(abo?.endpoint ?? "")
  const p256dh = String(abo?.keys?.p256dh ?? "")
  const auth = String(abo?.keys?.auth ?? "")
  if (!endpoint.startsWith("https://") || endpoint.length > 2000 || !p256dh || !auth) {
    throw new Error("Ungültiges Push-Abo")
  }

  await prisma.pushAbo.upsert({
    where: { endpoint },
    create: { personId: kontext.personId, endpoint, p256dh, auth },
    update: { personId: kontext.personId, p256dh, auth },
  })
}

/** Meldet ein Gerät wieder ab — nur eigene Geräte. */
export async function pushAboLoeschen(endpoint: string): Promise<void> {
  const kontext = await berechtigung()
  await prisma.pushAbo.deleteMany({ where: { endpoint: String(endpoint), personId: kontext.personId } })
}

/**
 * Schickt eine Test-Mitteilung an alle eigenen Geräte. Liefert, wie viele
 * Geräte erreicht wurden (0 = kein Gerät angemeldet oder Versand nicht
 * eingerichtet).
 */
export async function pushTestSenden(): Promise<{ eingerichtet: boolean; zugestellt: number }> {
  const kontext = await berechtigung()
  if (!pushVerfuegbar()) return { eingerichtet: false, zugestellt: 0 }
  const zugestellt = await pushSenden(kontext.personId, "/einstellungen", "Test: Mitteilungen funktionieren")
  return { eingerichtet: true, zugestellt }
}
