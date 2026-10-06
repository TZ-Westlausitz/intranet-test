import NextAuth from "next-auth"

import { authConfig } from "@/lib/auth/auth.config"

// Bewusst nur die edge-sichere Basiskonfiguration — ohne Provider, ohne
// Prisma. Die Middleware entscheidet lediglich "angemeldet oder nicht".
// Alles Weitere (aktiv? welche Rolle?) prüft `berechtigung()` in den
// Server Actions gegen die Datenbank.
export default NextAuth(authConfig).auth

export const config = {
  // Alles außer Next.js-Interna und statischen Dateien. sw.js (Service Worker
  // für Push) muss ohne Anmeldung ladbar sein, sonst scheitert die Registrierung.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw\\.js$|.*\\.(?:png|jpg|svg|ico|webmanifest)$).*)"],
}
