import { prisma } from "@/lib/db"

export async function neuesteBenachrichtigungen(personId: string, limit = 10) {
  return prisma.benachrichtigung.findMany({
    where: { personId },
    orderBy: { erstelltAm: "desc" },
    take: limit,
  })
}

export async function ungeleseneAnzahl(personId: string): Promise<number> {
  return prisma.benachrichtigung.count({ where: { personId, gelesenAm: null } })
}
