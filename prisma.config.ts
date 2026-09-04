import "dotenv/config"
import { defineConfig, env } from "prisma/config"

/**
 * Ab Prisma 7 lebt die Verbindungs-URL hier statt im Schema.
 * Diese Datei gehört in den Projektstamm, nicht in den prisma-Ordner.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },

  datasource: {
    url: env("DATABASE_URL"),
  },
})
