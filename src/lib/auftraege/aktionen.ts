"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { berechtigung, NichtBerechtigt } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { AufgabePrioritaet } from "@/generated/prisma/enums"
import { richTextSanitisieren } from "@/lib/rich-text"
import { benachrichtigungErstellen } from "@/lib/benachrichtigungen/erstellen"
import {
  auftragAnhaengePruefen,
  auftragAnhaengeSpeichern,
  auftragAnhangLoeschenIntern,
} from "@/lib/auftraege/anhaenge"

function anhaengeAusFormData(formData: FormData): File[] {
  return formData.getAll("anhaenge").filter((wert): wert is File => wert instanceof File)
}

/**
 * Legt einen Auftrag für eine ANDERE Person an — für die eigene Liste
 * gibt es Aufgabe (To-do), kein Selbstauftrag hier. Keine Rollenprüfung:
 * jede aktive Person darf jeder anderen einen Auftrag geben, genau wie
 * beim Einladen zu einem Termin.
 */
export async function auftragErstellen(formData: FormData) {
  const kontext = await berechtigung()

  const titel = String(formData.get("titel") ?? "").trim()
  const zugewiesenAnId = String(formData.get("zugewiesenAn") ?? "")
  if (!titel || !zugewiesenAnId) {
    redirect("/aufgaben/auftraege?fehler=pflichtfeld")
  }
  if (zugewiesenAnId === kontext.personId) {
    redirect("/aufgaben/auftraege?fehler=selbstauftrag")
  }

  const beschreibung = richTextSanitisieren(String(formData.get("beschreibung") ?? "")) || null

  const faelligEingabe = String(formData.get("faelligAm") ?? "")
  const faelligAm = faelligEingabe ? new Date(`${faelligEingabe}T00:00:00`) : null
  if (faelligAm && Number.isNaN(faelligAm.getTime())) {
    redirect("/aufgaben/auftraege?fehler=pflichtfeld")
  }

  const prioritaetEingabe = String(formData.get("prioritaet") ?? "")
  const prioritaet = Object.values(AufgabePrioritaet).includes(prioritaetEingabe as AufgabePrioritaet)
    ? (prioritaetEingabe as AufgabePrioritaet)
    : AufgabePrioritaet.MITTEL

  const neueAnhaenge = anhaengeAusFormData(formData)
  const anhaengeFehler = auftragAnhaengePruefen(neueAnhaenge)
  if (anhaengeFehler) {
    redirect(`/aufgaben/auftraege?fehler=${anhaengeFehler}`)
  }

  const auftrag = await prisma.auftrag.create({
    data: { erstelltVonId: kontext.personId, zugewiesenAnId, titel, beschreibung, prioritaet, faelligAm },
  })

  if (neueAnhaenge.length > 0) {
    await auftragAnhaengeSpeichern(auftrag.id, neueAnhaenge)
  }

  await benachrichtigungErstellen({
    personId: zugewiesenAnId,
    text: `${kontext.name} hat dir eine Aufgabe zugewiesen: "${titel}"`,
    link: "/aufgaben/auftraege",
  })

  revalidatePath("/")
  redirect("/aufgaben/auftraege")
}

/**
 * Erledigt-Umschalter — nur die zugewiesene Person darf abhaken (sie
 * macht die Arbeit), nicht die erstellende. Benachrichtigt die
 * erstellende Person beim Abhaken, damit sie mitbekommt, dass sich was
 * getan hat, ohne selbst nachschauen zu müssen.
 */
export async function auftragErledigtSetzen(auftragId: string, erledigt: boolean) {
  const kontext = await berechtigung()

  const auftrag = await prisma.auftrag.findUnique({ where: { id: auftragId } })
  if (!auftrag || auftrag.zugewiesenAnId !== kontext.personId) {
    throw new NichtBerechtigt("nicht der eigene Auftrag")
  }

  await prisma.auftrag.update({
    where: { id: auftragId },
    data: { erledigtAm: erledigt ? new Date() : null },
  })

  if (erledigt) {
    await benachrichtigungErstellen({
      personId: auftrag.erstelltVonId,
      text: `${kontext.name} hat "${auftrag.titel}" erledigt`,
      link: "/aufgaben/auftraege",
    })
  }

  revalidatePath("/aufgaben/auftraege")
  revalidatePath("/")
}

/** Löschen ist wie bei Aufgabe/Termin der erstellenden Person vorbehalten. */
export async function auftragLoeschen(auftragId: string) {
  const kontext = await berechtigung()

  const auftrag = await prisma.auftrag.findUnique({ where: { id: auftragId } })
  if (!auftrag || auftrag.erstelltVonId !== kontext.personId) {
    throw new NichtBerechtigt("nur die erstellende Person darf den Auftrag löschen")
  }

  await prisma.auftrag.delete({ where: { id: auftragId } })

  await benachrichtigungErstellen({
    personId: auftrag.zugewiesenAnId,
    text: `${kontext.name} hat die Aufgabe "${auftrag.titel}" zurückgezogen`,
  })

  revalidatePath("/aufgaben/auftraege")
  revalidatePath("/")
}

/** Anhänge lassen sich nur nachträglich löschen, nicht ergänzen — dieselbe Regel wie bei Aufgabe. */
export async function auftragAnhangLoeschen(anhangId: string) {
  const kontext = await berechtigung()

  const anhang = await prisma.auftragAnhang.findUnique({ where: { id: anhangId }, include: { auftrag: true } })
  if (!anhang || anhang.auftrag.erstelltVonId !== kontext.personId) {
    throw new NichtBerechtigt("nur die erstellende Person darf Anhänge entfernen")
  }

  await auftragAnhangLoeschenIntern(anhangId)

  revalidatePath("/aufgaben/auftraege")
}

/**
 * Rückfrage zu einem Auftrag — sichtbar für dieselben Personen wie der
 * Auftrag selbst (erstellende + zugewiesene Person), dasselbe Muster wie
 * terminKommentarErstellen beim Kalender. Benachrichtigt die jeweils
 * ANDERE der beiden Personen, nicht die kommentierende selbst.
 */
export async function auftragKommentarErstellen(auftragId: string, formData: FormData) {
  const kontext = await berechtigung()

  const auftrag = await prisma.auftrag.findUnique({ where: { id: auftragId } })
  const darfSehen =
    auftrag && (auftrag.erstelltVonId === kontext.personId || auftrag.zugewiesenAnId === kontext.personId)

  if (!auftrag || !darfSehen) {
    throw new NichtBerechtigt("Auftrag nicht sichtbar")
  }

  const neueAnhaenge = anhaengeAusFormData(formData)
  const anhaengeFehler = auftragAnhaengePruefen(neueAnhaenge)
  if (anhaengeFehler) {
    redirect(`/aufgaben/auftraege?fehler=${anhaengeFehler}`)
  }

  const text = String(formData.get("text") ?? "").trim()
  if (!text) return

  const kommentar = await prisma.auftragKommentar.create({ data: { auftragId, personId: kontext.personId, text } })

  if (neueAnhaenge.length > 0) {
    await auftragAnhaengeSpeichern(auftragId, neueAnhaenge, kommentar.id)
  }

  const empfaengerId = auftrag.erstelltVonId === kontext.personId ? auftrag.zugewiesenAnId : auftrag.erstelltVonId
  await benachrichtigungErstellen({
    personId: empfaengerId,
    text: `${kontext.name} hat zu "${auftrag.titel}" kommentiert`,
    link: "/aufgaben/auftraege",
  })

  revalidatePath("/aufgaben/auftraege")
}
