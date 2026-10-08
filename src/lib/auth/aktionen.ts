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

export type PasswortAendernErgebnis = { ok: boolean; fehler?: string }

/**
 * Freiwillige Passwortänderung aus dem Profil (Rückmeldung 2026-10-08) —
 * getrennt vom erzwungenen Wechsel oben (eigenesPasswortFestlegen), weil hier
 * zusätzlich das AKTUELLE Passwort verlangt wird: ein Token allein (z. B. an
 * einem unbeaufsichtigten, angemeldeten Gerät) soll nicht reichen, um das
 * Konto zu übernehmen. Gibt Fehlertexte zurück statt umzuleiten, damit die
 * Eingaben im Formular stehen bleiben (siehe PasswortAendernKarte).
 *
 * Andere angemeldete Geräte bleiben angemeldet: Das Token enthält nur die
 * Person-ID, es gibt keine Sitzungsliste, die man ungültig machen könnte
 * (siehe CLAUDE.md, Abschnitt Auth).
 */
export async function eigenesPasswortAendern(
  _vorher: PasswortAendernErgebnis | null,
  formData: FormData,
): Promise<PasswortAendernErgebnis> {
  const kontext = await berechtigung()

  const aktuell = String(formData.get("aktuellesPasswort") ?? "")
  const neu = String(formData.get("neuesPasswort") ?? "")
  const wiederholung = String(formData.get("passwortWiederholung") ?? "")

  const person = await prisma.person.findUnique({
    where: { benutzername: kontext.personId },
    select: { passwortHash: true },
  })
  // Immer vergleichen (auch ohne Hash), wie bei der Anmeldung: gleiche Antwortzeit.
  const stimmt = await bcrypt.compare(aktuell, person?.passwortHash ?? LEERLAUF_HASH)
  if (!person?.passwortHash || !stimmt) return { ok: false, fehler: "Das aktuelle Passwort stimmt nicht." }

  const regeln = passwortRegelnPruefen(neu)
  if (!regeln.laenge) return { ok: false, fehler: "Das neue Passwort muss mindestens 10 Zeichen lang sein." }
  if (!regeln.gross) return { ok: false, fehler: "Das neue Passwort braucht mindestens einen Großbuchstaben." }
  if (!regeln.klein) return { ok: false, fehler: "Das neue Passwort braucht mindestens einen Kleinbuchstaben." }
  if (!regeln.zahl) return { ok: false, fehler: "Das neue Passwort braucht mindestens eine Zahl." }
  if (process.env.STANDARD_STARTPASSWORT && neu === process.env.STANDARD_STARTPASSWORT) {
    return { ok: false, fehler: "Bitte wähle ein eigenes Passwort. Das Startpasswort darf nicht verwendet werden." }
  }
  if (neu === aktuell) return { ok: false, fehler: "Das neue Passwort muss sich vom aktuellen unterscheiden." }
  if (neu !== wiederholung) return { ok: false, fehler: "Die beiden neuen Passwörter stimmen nicht überein." }

  await prisma.person.update({
    where: { benutzername: kontext.personId },
    data: { passwortHash: await bcrypt.hash(neu, 10), passwortWechselErforderlich: false },
  })

  return { ok: true }
}

/** Scheinhash für den Vergleich, wenn kein Passwort hinterlegt ist (siehe Anmeldung in auth.ts). */
const LEERLAUF_HASH = bcrypt.hashSync("kein-konto", 10)
