import type { Prisma } from "@/generated/prisma/client"

/**
 * Nächste menschenlesbare Vorgangsnummer für ein Jahr, z. B. "2026-0007".
 * Bewusst vom höchsten VORHANDENEN Wert abgeleitet, nicht von der Anzahl:
 * Nach dem Löschen einer Ausleihe (Testphase-Löschen, siehe
 * reservierungen/page.tsx) entstehen sonst Lücken, und "Anzahl + 1" kollidiert
 * dann mit einer schon vergebenen Nummer (`Ausleihe_vorgangsnummer_key`).
 *
 * Kein Schutz gegen echte Gleichzeitigkeit nötig — ein Werkstattleiter, ein
 * paar Vorgänge im Jahr.
 */
export async function naechsteVorgangsnummer(tx: Prisma.TransactionClient, jahr: number): Promise<string> {
  const letzte = await tx.ausleihe.findFirst({
    where: { vorgangsnummer: { startsWith: `${jahr}-` } },
    orderBy: { vorgangsnummer: "desc" },
    select: { vorgangsnummer: true },
  })
  const letzteNummer = letzte ? Number.parseInt(letzte.vorgangsnummer.split("-")[1] ?? "0", 10) : 0
  return `${jahr}-${String(letzteNummer + 1).padStart(4, "0")}`
}
