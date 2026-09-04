import type { NextAuthConfig } from "next-auth"

/**
 * EDGE-SICHERE Basiskonfiguration.
 *
 * Diese Datei wird von der Middleware geladen, die im Edge-Runtime läuft.
 * Dort gibt es weder Prisma noch bcrypt. Deshalb steht hier KEIN Provider
 * und KEIN Datenbankzugriff — beides kommt in `auth.ts` dazu, die nur im
 * Node-Runtime geladen wird.
 *
 * Wenn du hier etwas importierst, das Prisma oder bcrypt anfasst, bricht die
 * Middleware mit einer schwer lesbaren Meldung. Das ist die häufigste Ursache
 * für "es lief lokal und dann plötzlich nicht mehr".
 */
export const authConfig = {
  // Der Credentials-Provider unterstützt ausschließlich JWT — keine
  // Datenbank-Sessions. Siehe CLAUDE.md, Abschnitt "Auth — bekannte Falle".
  session: {
    strategy: "jwt",
    maxAge: Number(process.env.AUTH_SESSION_MAXAGE ?? 900),
  },

  pages: {
    signIn: "/anmelden",
  },

  // Wird in auth.ts gefüllt.
  providers: [],

  callbacks: {
    /**
     * Läuft in der Middleware. Kann nur prüfen, OB jemand angemeldet ist —
     * nicht, ob das Konto noch aktiv ist oder welche Rolle es hat. Das
     * erledigt `berechtigung()` in jeder Server Action gegen die Datenbank.
     */
    authorized({ auth, request }) {
      const angemeldet = Boolean(auth?.user)
      const pfad = request.nextUrl.pathname

      const oeffentlich =
        pfad.startsWith("/anmelden") || pfad.startsWith("/api/auth")

      if (oeffentlich) return true
      return angemeldet
    },

    /**
     * Im Token steht NUR die Person-ID.
     *
     * Rollen und Standorte bewusst nicht: `berechtigung()` fragt die
     * Datenbank ohnehin bei jeder Anfrage ab (wegen der Aktiv-Prüfung).
     * Stünden die Rollen zusätzlich im Token, gäbe es zwei Wahrheitsquellen —
     * und eine Rollenänderung würde erst beim nächsten Token-Wechsel wirken.
     */
    jwt({ token, user }) {
      if (user?.id) token.personId = user.id
      return token
    },

    session({ session, token }) {
      if (token.personId && session.user) {
        session.user.id = token.personId as string
      }
      return session
    },
  },
} satisfies NextAuthConfig
