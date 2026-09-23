"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { berechtigung, NichtBerechtigt } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { ProjektStatus, ProjektmitgliedRolle } from "@/generated/prisma/enums"
import { richTextSanitisieren } from "@/lib/rich-text"
import { projektMitgliedschaftPruefen } from "@/lib/projekte/mitgliedschaft"
import { benachrichtigungErstellen } from "@/lib/benachrichtigungen/erstellen"

/**
 * Legt ein neues Projekt an — nur mit der Berechtigung "Projektmanager"
 * (siehe berechtigung(), Datensatz existiert im Adminbereich unter
 * Berechtigungen). Die anlegende Person wird automatisch Leitung, sonst
 * gäbe es ein Projekt ohne jede Leitung.
 */
export async function projektErstellen(formData: FormData) {
  const kontext = await berechtigung({ benoetigteBerechtigung: "Projektmanager" })

  const titel = String(formData.get("titel") ?? "").trim()
  const ziel = richTextSanitisieren(String(formData.get("ziel") ?? ""))
  const startEingabe = String(formData.get("start") ?? "")
  const endeEingabe = String(formData.get("ende") ?? "")

  if (!titel || !ziel || !startEingabe || !endeEingabe) {
    redirect("/aufgaben/projekte?fehler=pflichtfeld")
  }

  const start = new Date(`${startEingabe}T00:00:00`)
  const ende = new Date(`${endeEingabe}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(ende.getTime())) {
    redirect("/aufgaben/projekte?fehler=pflichtfeld")
  }
  if (ende < start) {
    redirect("/aufgaben/projekte?fehler=zeitraum")
  }

  const projekt = await prisma.projekt.create({
    data: {
      titel,
      ziel,
      start,
      ende,
      erstelltVonId: kontext.personId,
      mitglieder: { create: { personId: kontext.personId, rolle: ProjektmitgliedRolle.LEITUNG } },
    },
  })

  revalidatePath("/aufgaben/projekte")
  redirect(`/aufgaben/projekte/${projekt.id}`)
}

/**
 * Titel/Ziel/Zeitraum/Status ändern — nur die Leitung, auch nach Ablauf
 * (siehe mitgliedschaft.ts). Der Übergang PLANUNG → AKTIV läuft
 * ausschließlich über die eigene Aktion `projektStarten` (löst dort die
 * gebündelte Benachrichtigung aus) — wird hier `status=AKTIV` übermittelt,
 * während der aktuelle Stand noch PLANUNG ist, wird der Wert ignoriert
 * (Regel 5: keine reine UI-Ausblendung im Status-Dropdown, siehe
 * ProjektFormFelder — die Sperre gilt auch serverseitig).
 */
export async function projektAktualisieren(projektId: string, formData: FormData) {
  const kontext = await berechtigung()
  const { projekt: bisherigesProjekt } = await projektMitgliedschaftPruefen(projektId, kontext.personId, { nurLeitung: true })

  const titel = String(formData.get("titel") ?? "").trim()
  const ziel = richTextSanitisieren(String(formData.get("ziel") ?? ""))
  const startEingabe = String(formData.get("start") ?? "")
  const endeEingabe = String(formData.get("ende") ?? "")
  const statusEingabe = String(formData.get("status") ?? "")

  if (!titel || !ziel || !startEingabe || !endeEingabe) {
    redirect(`/aufgaben/projekte/${projektId}?fehler=pflichtfeld`)
  }

  const start = new Date(`${startEingabe}T00:00:00`)
  const ende = new Date(`${endeEingabe}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(ende.getTime()) || ende < start) {
    redirect(`/aufgaben/projekte/${projektId}?fehler=zeitraum`)
  }

  let status = Object.values(ProjektStatus).includes(statusEingabe as ProjektStatus)
    ? (statusEingabe as ProjektStatus)
    : ProjektStatus.PLANUNG
  if (status === ProjektStatus.AKTIV && bisherigesProjekt.status === ProjektStatus.PLANUNG) {
    status = ProjektStatus.PLANUNG
  }

  await prisma.projekt.update({ where: { id: projektId }, data: { titel, ziel, start, ende, status } })

  revalidatePath(`/aufgaben/projekte/${projektId}`)
  revalidatePath("/aufgaben/projekte")
}

/**
 * Der eigentliche Start nach der Planungsphase (siehe
 * projektZugriffTrotzPlanung): erst danach sehen die übrigen Mitglieder
 * das Projekt, und genau jetzt bekommen sie gebündelt eine Nachricht mit
 * ihren bis dahin zugewiesenen Aufgaben — statt vorher einzeln bei jeder
 * Änderung während der Planung (siehe projektMitgliedHinzufuegen unten und
 * projektAufgabeErstellen in aufgaben-aktionen.ts).
 */
export async function projektStarten(projektId: string) {
  const kontext = await berechtigung()
  const { projekt } = await projektMitgliedschaftPruefen(projektId, kontext.personId, { nurLeitung: true })

  if (projekt.status !== ProjektStatus.PLANUNG) {
    throw new NichtBerechtigt("Projekt ist nicht mehr in der Planung")
  }

  await prisma.projekt.update({ where: { id: projektId }, data: { status: ProjektStatus.AKTIV } })

  const [mitglieder, aufgaben] = await Promise.all([
    prisma.projektmitglied.findMany({
      where: { projektId, ausgeschiedenAm: null, personId: { not: kontext.personId } },
    }),
    prisma.aufgabe.findMany({ where: { projektId }, select: { titel: true, zugewiesenAnId: true } }),
  ])

  for (const mitglied of mitglieder) {
    const eigeneAufgaben = aufgaben.filter((a) => a.zugewiesenAnId === mitglied.personId)
    const text =
      eigeneAufgaben.length === 0
        ? `Das Projekt "${projekt.titel}" ist gestartet.`
        : `Das Projekt "${projekt.titel}" ist gestartet. Deine Aufgaben: ${eigeneAufgaben.map((a) => a.titel).join(", ")}`
    await benachrichtigungErstellen({ personId: mitglied.personId, text, link: `/aufgaben/projekte/${projektId}` })
  }

  revalidatePath(`/aufgaben/projekte/${projektId}`)
  revalidatePath("/aufgaben/projekte")
}

/**
 * Fügt eine oder mehrere Personen als Mitglied hinzu (Mehrfachauswahl über
 * PersonenAuswahl) — nur die Leitung. Ein Wiedereintritt reaktiviert die
 * bestehende Zeile (setzt ausgeschiedenAm zurück auf null), statt eine
 * zweite anzulegen (siehe @@unique am Model Projektmitglied).
 */
export async function projektMitgliedHinzufuegen(projektId: string, formData: FormData) {
  const kontext = await berechtigung()
  await projektMitgliedschaftPruefen(projektId, kontext.personId, { nurLeitung: true })

  const neuePersonenIds = formData.getAll("mitglieder").map(String)
  if (neuePersonenIds.length === 0) return

  await prisma.$transaction(
    neuePersonenIds.map((personId) =>
      prisma.projektmitglied.upsert({
        where: { projektId_personId: { projektId, personId } },
        update: { ausgeschiedenAm: null },
        create: { projektId, personId, rolle: ProjektmitgliedRolle.MITGLIED },
      }),
    ),
  )

  // Während der Planung noch keine Benachrichtigung — die kommt gebündelt
  // beim "Projekt starten" (projektStarten), sonst würde jede Person schon
  // beim Aufbau des Projekts einzeln benachrichtigt.
  const projekt = await prisma.projekt.findUnique({ where: { id: projektId } })
  if (projekt?.status !== ProjektStatus.PLANUNG) {
    for (const personId of neuePersonenIds) {
      await benachrichtigungErstellen({
        personId,
        text: `${kontext.name} hat dich zum Projekt "${projekt?.titel}" hinzugefügt`,
        link: `/aufgaben/projekte/${projektId}`,
      })
    }
  }

  revalidatePath(`/aufgaben/projekte/${projektId}`)
}

/**
 * Entfernt ein Mitglied (setzt ausgeschiedenAm, löscht nicht — alte
 * Aufgaben/Nachrichten bleiben mit Namen sichtbar). Blockt das Entfernen
 * der letzten verbleibenden aktiven Leitung, sonst hätte das Projekt
 * niemanden mehr, der es verwalten kann.
 */
export async function projektMitgliedEntfernen(projektId: string, mitgliedId: string) {
  const kontext = await berechtigung()
  await projektMitgliedschaftPruefen(projektId, kontext.personId, { nurLeitung: true })

  const mitglied = await prisma.projektmitglied.findUnique({ where: { id: mitgliedId } })
  if (!mitglied || mitglied.projektId !== projektId) {
    throw new NichtBerechtigt("Mitglied nicht gefunden")
  }

  if (mitglied.rolle === ProjektmitgliedRolle.LEITUNG) {
    const weitereLeitung = await prisma.projektmitglied.count({
      where: { projektId, rolle: ProjektmitgliedRolle.LEITUNG, ausgeschiedenAm: null, id: { not: mitgliedId } },
    })
    if (weitereLeitung === 0) {
      throw new NichtBerechtigt("letzte Leitung kann nicht entfernt werden")
    }
  }

  await prisma.projektmitglied.update({ where: { id: mitgliedId }, data: { ausgeschiedenAm: new Date() } })

  revalidatePath(`/aufgaben/projekte/${projektId}`)
}

/** Befördert/degradiert zwischen Leitung und Mitglied — dieselbe Sperre wie beim Entfernen der letzten Leitung. */
export async function projektMitgliedRolleSetzen(projektId: string, mitgliedId: string, rolle: ProjektmitgliedRolle) {
  const kontext = await berechtigung()
  await projektMitgliedschaftPruefen(projektId, kontext.personId, { nurLeitung: true })

  const mitglied = await prisma.projektmitglied.findUnique({ where: { id: mitgliedId } })
  if (!mitglied || mitglied.projektId !== projektId) {
    throw new NichtBerechtigt("Mitglied nicht gefunden")
  }

  if (mitglied.rolle === ProjektmitgliedRolle.LEITUNG && rolle === ProjektmitgliedRolle.MITGLIED) {
    const weitereLeitung = await prisma.projektmitglied.count({
      where: { projektId, rolle: ProjektmitgliedRolle.LEITUNG, ausgeschiedenAm: null, id: { not: mitgliedId } },
    })
    if (weitereLeitung === 0) {
      throw new NichtBerechtigt("letzte Leitung kann nicht herabgestuft werden")
    }
  }

  await prisma.projektmitglied.update({ where: { id: mitgliedId }, data: { rolle } })

  revalidatePath(`/aufgaben/projekte/${projektId}`)
}
