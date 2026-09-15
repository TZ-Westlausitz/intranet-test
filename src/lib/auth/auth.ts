import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"

import { authConfig } from "./auth.config"
import { prisma } from "@/lib/db"

/**
 * Vergleichshash für Benutzernamen, die es nicht gibt.
 *
 * Ohne ihn wäre die Anmeldung für unbekannte Benutzernamen messbar
 * schneller als für bekannte — damit ließe sich herausfinden, welche
 * Benutzernamen existieren. bcrypt.compare läuft deshalb immer, auch
 * wenn von vornherein feststeht, dass die Anmeldung scheitert.
 */
const LEERLAUF_HASH = bcrypt.hashSync("kein-konto", 10)

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        benutzername: { label: "Benutzername" },
        passwort: { label: "Passwort", type: "password" },
      },

      async authorize(credentials) {
        const benutzername = String(credentials?.benutzername ?? "").trim()
        const passwort = String(credentials?.passwort ?? "")

        if (!benutzername || !passwort) return null

        const person = await prisma.person.findUnique({
          where: { benutzername },
        })

        const stimmt = await bcrypt.compare(
          passwort,
          person?.passwortHash ?? LEERLAUF_HASH,
        )

        // Bewusst eine einzige Bedingung und eine einzige Rückgabe: Wer sich
        // nicht anmelden kann, erfährt nicht warum. Kein "Konto gesperrt",
        // kein "Benutzername unbekannt".
        if (!person || !person.aktiv || !person.passwortHash || !stimmt) {
          return null
        }

        // Admin-Modus startet bei jeder neuen Anmeldung deaktiviert — er
        // soll nicht unbemerkt über Geräte/Sitzungen hinweg aktiv bleiben.
        if (person.adminModusAktiv) {
          await prisma.person.update({
            where: { benutzername: person.benutzername },
            data: { adminModusAktiv: false },
          })
        }

        return {
          id: person.benutzername,
          name: `${person.vorname} ${person.nachname}`,
        }
      },
    }),
  ],
})
