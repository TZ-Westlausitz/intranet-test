"use server"

import { berechtigung } from "@/lib/auth/berechtigung"
import { personKontaktDetail } from "@/lib/kontakte/abfragen"

/** Lädt ein Personenprofil für das Lese-Pop-up (KontaktAnzeigenDialog) — clientseitig direkt aufgerufen, keine Navigation nötig. */
export async function personDetailLaden(personId: string) {
  await berechtigung()
  return personKontaktDetail(personId)
}
