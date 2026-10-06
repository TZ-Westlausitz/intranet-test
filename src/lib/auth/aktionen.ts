"use server"

import { redirect } from "next/navigation"
import bcrypt from "bcryptjs"

import { signOut } from "./auth"
import { berechtigung } from "./berechtigung"
import { prisma } from "@/lib/db"
import { passwortRegelnPruefen } from "@/lib/auth/passwort-regeln"

/**
 * Eigene Datei statt einer Inline-Funktion in BenutzerMenu: BenutzerMenu
 * ist eine Client-Komponente (braucht den Auf/Zu-Zustand des Menüs), und
 * "use server"-Funktionen können nicht in einer "use client"-Datei stehen.
 */
export async function abmelden() {
  await signOut({ redirectTo: "/anmelden" })
}

/**
 * Erzwungener Passwortwechsel nach dem ersten Login (bzw. nach einem
 * Zurücksetzen durch die Admin) — siehe personErstellen/
 * personPasswortZuruecksetzen und den Umleitungs-Teil in berechtigung().
 *
 * Kein erneutes Anmelden nötig, um die Sperre wieder loszuwerden: da
 * `berechtigung()` bei JEDER Anfrage neu gegen die Datenbank prüft (siehe
 * Kommentar dort), reicht es, `passwortWechselErforderlich` hier auf false
 * zu setzen — die nächste Anfrage sieht das sofort, ganz ohne neues Token.
 */
export async function eigenesPasswortFestlegen(formData: FormData) {
  const kontext = await berechtigung({ erlaubeVorPasswortwechsel: true })

  const neuesPasswort = String(formData.get("neuesPasswort") ?? "")
  const wiederholung = String(formData.get("passwortWiederholung") ?? "")

  // Regeln siehe passwort-regeln.ts; jeweils der erste Verstoß wird gemeldet.
  const regeln = passwortRegelnPruefen(neuesPasswort)
  if (!regeln.laenge) redirect("/passwort-aendern?fehler=kurz")
  if (!regeln.gross) redirect("/passwort-aendern?fehler=gross")
  if (!regeln.klein) redirect("/passwort-aendern?fehler=klein")
  if (!regeln.zahl) redirect("/passwort-aendern?fehler=zahl")
  // Das gemeinsame Startpasswort ist als eigenes Passwort tabu — sonst hätten
  // mehrere Konten dasselbe. Nur der Server kennt es (Umgebungsvariable).
  if (process.env.STANDARD_STARTPASSWORT && neuesPasswort === process.env.STANDARD_STARTPASSWORT) {
    redirect("/passwort-aendern?fehler=startpasswort")
  }
  if (neuesPasswort !== wiederholung) {
    redirect("/passwort-aendern?fehler=ungleich")
  }

  await prisma.person.update({
    where: { benutzername: kontext.personId },
    data: {
      passwortHash: await bcrypt.hash(neuesPasswort, 10),
      passwortWechselErforderlich: false,
    },
  })

  redirect("/")
}
