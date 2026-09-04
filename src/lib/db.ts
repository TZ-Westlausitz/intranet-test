import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "@/generated/prisma/client"

/**
 * Ab Prisma 7 wird der Client an einen selbst gewählten Ort erzeugt
 * (siehe `output` im Schema) und braucht einen Treiber-Adapter für die
 * Verbindung. Der Import kommt deshalb NICHT mehr aus "@prisma/client".
 *
 * Sollte der Importpfad hier nicht auflösen: schau nach, was
 * `npx prisma generate` unter src/generated/prisma tatsächlich abgelegt
 * hat, und passe den Pfad an. Der Ordner sagt dir die Wahrheit.
 */

const globalerClient = globalThis as unknown as { prisma?: PrismaClient }

function neuerClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  })

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  })
}

// Next.js lädt Module im Entwicklungsmodus bei jeder Änderung neu. Ohne den
// Umweg über globalThis entsteht bei jedem Hot Reload ein neuer Client, bis
// PostgreSQL keine Verbindungen mehr annimmt. Der Fehler sieht dann nach
// einem Datenbankproblem aus und ist keines.
export const prisma = globalerClient.prisma ?? neuerClient()

if (process.env.NODE_ENV !== "production") {
  globalerClient.prisma = prisma
}
