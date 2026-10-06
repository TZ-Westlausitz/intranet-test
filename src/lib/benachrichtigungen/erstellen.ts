import { prisma } from "@/lib/db"
import { pushSenden } from "@/lib/push/senden"

/**
 * Bewusst KEIN "use server" hier: Jede exportierte Funktion in einer
 * "use server"-Datei wird automatisch als vom Client aufrufbare Server
 * Action freigegeben — das wäre hier falsch, weil diese Funktion für
 * BELIEBIGE personId aufrufbar wäre, ohne dass die aufrufende Person
 * etwas damit zu tun haben muss. Sie ist nur als interner Baustein für
 * andere Server Actions gedacht (z. B. terminTeilnahmeAntworten), die die
 * Berechtigung selbst schon geprüft haben.
 */
export async function benachrichtigungErstellen(daten: { personId: string; text: string; link?: string }) {
  await prisma.benachrichtigung.create({ data: daten })

  // Zusätzlich aufs Handy, falls die Person Push-Mitteilungen aktiviert hat —
  // mit neutralem Text, nicht dem Glocken-Text (siehe src/lib/push/senden.ts).
  // Ein Fehler dort darf nie die auslösende Aktion kippen.
  try {
    await pushSenden(daten.personId, daten.link)
  } catch (fehler) {
    console.error("Push-Versand fehlgeschlagen", fehler)
  }
}
