import "next-auth"
import "next-auth/jwt"

// Ohne diese Erweiterungen kennt TypeScript weder `session.user.id` noch
// `token.personId` und meldet Fehler in auth.config.ts. Die Datei enthält
// nur Typen und landet nicht im erzeugten Code.

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    personId?: string
  }
}
