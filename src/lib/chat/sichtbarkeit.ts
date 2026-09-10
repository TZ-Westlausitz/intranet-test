import { Prisma } from "@/generated/prisma/client"

import { prisma } from "@/lib/db"

/**
 * Eine Konversation ist sichtbar, wenn die Person entweder direkt
 * Teilnehmer ist (Direktnachricht) ODER aktuelles Mitglied der Gruppe, an
 * die die Konversation hängt (Gruppenchat) — Muster `formularSichtbarFuer`.
 * Zugriffskontrolle statt Ende-zu-Ende-Verschlüsselung (siehe Plan/Memory
 * chat-baustein): darüber hinaus ist der Inhalt normaler, für berechtigte
 * Datenbankzugriffe lesbarer Text, wie bei jedem anderen Baustein hier.
 */
export function chatSichtbarFuer(personId: string): Prisma.ChatKonversationWhereInput {
  return {
    OR: [{ teilnehmer: { some: { personId } } }, { gruppe: { mitglieder: { some: { personId } } } }],
  }
}

/**
 * Aktuelle Teilnehmer-IDs einer Konversation — bei Gruppenchat live aus
 * `PersonGruppe` aufgelöst (kein Snapshot: verlässt jemand die Gruppe,
 * verliert er sofort die Sicht, siehe chatSichtbarFuer; ein neues
 * Mitglied sieht nur Nachrichten ab dem Beitritt, weil ältere schon
 * `erstelltAm`-gefiltert sind, nicht weil sie extra ausgeblendet würden).
 * Für Benachrichtigungs-Fan-out beim Senden.
 */
export async function konversationTeilnehmerIds(konversation: { id: string; gruppeId: string | null }): Promise<string[]> {
  if (konversation.gruppeId) {
    const mitglieder = await prisma.personGruppe.findMany({
      where: { gruppeId: konversation.gruppeId },
      select: { personId: true },
    })
    return mitglieder.map((m) => m.personId)
  }
  const teilnehmer = await prisma.chatKonversationTeilnehmer.findMany({
    where: { konversationId: konversation.id },
    select: { personId: true },
  })
  return teilnehmer.map((t) => t.personId)
}

/** Kanonischer, sortierter Schlüssel für eine Direktnachricht — siehe ChatKonversation.direktSchluessel. */
export function direktSchluesselBilden(personId1: string, personId2: string): string {
  return [personId1, personId2].sort().join(":")
}
