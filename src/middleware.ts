import NextAuth from "next-auth"

import { authConfig } from "@/lib/auth/auth.config"

// Bewusst nur die edge-sichere Basiskonfiguration — ohne Provider, ohne
// Prisma. Die Middleware entscheidet lediglich "angemeldet oder nicht".
// Alles Weitere (aktiv? welche Rolle?) prüft `berechtigung()` in den
// Server Actions gegen die Datenbank.
export default NextAuth(authConfig).auth

export const config = {
  // Alles außer Next.js-Interna und statischen Dateien.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico|webmanifest)$).*)"],
}
