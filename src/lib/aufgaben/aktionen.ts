"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { berechtigung, NichtBerechtigt } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { AufgabePrioritaet } from "@/generated/prisma/enums"
import { richTextSanitisieren } from "@/lib/rich-text"
import { aufgabeAnhaengePruefen, aufgabeAnhaengeSpeichern, aufgabeAnhangLoeschenIntern } from "@/lib/aufgaben/anhaenge"

function anhaengeAusFormData(formData: FormData): File[] {
  return formData.getAll("anhaenge").filter((wert): wert is File => wert instanceof File)
}

/**
 * Legt eine persönliche Aufgabe an. Keine Rollenprüfung nötig — jede
 * aktive Person darf sich eigene Aufgaben setzen (siehe Kommentar am
 * Model Aufgabe: Zuweisung an andere ist bewusst kein Teil dieses
 * Bausteins, das kommt mit "Projekte").
 */
export async function aufgabeErstellen(formData: FormData) {
  const kontext = await berechtigung()

  const titel = String(formData.get("titel") ?? "").trim()
  if (!titel) {
    redirect("/aufgaben?fehler=todoPflichtfeld")
  }

  const beschreibung = richTextSanitisieren(String(formData.get("beschreibung") ?? "")) || null

  const faelligEingabe = String(formData.get("faelligAm") ?? "")
  const faelligAm = faelligEingabe ? new Date(`${faelligEingabe}T00:00:00`) : null
  if (faelligAm && Number.isNaN(faelligAm.getTime())) {
    redirect("/aufgaben?fehler=todoPflichtfeld")
  }

  // "Geplant für" — Datum-only wie faelligAm, kein datetime-local nötig.
  // Bis zu diesem Datum taucht die Aufgabe nicht in aufgabenFuerPerson auf
  // (siehe Kommentar am Feld Aufgabe.geplantAm), verwaltbar bis dahin nur
  // über /geplante-aktionen.
  const geplantEingabe = String(formData.get("geplantAm") ?? "")
  const geplantAm = geplantEingabe ? new Date(`${geplantEingabe}T00:00:00`) : null
  if (geplantAm && Number.isNaN(geplantAm.getTime())) {
    redirect("/aufgaben?fehler=todoPflichtfeld")
  }

  const prioritaetEingabe = String(formData.get("prioritaet") ?? "")
  const prioritaet = Object.values(AufgabePrioritaet).includes(prioritaetEingabe as AufgabePrioritaet)
    ? (prioritaetEingabe as AufgabePrioritaet)
    : AufgabePrioritaet.MITTEL

  const neueAnhaenge = anhaengeAusFormData(formData)
  const anhaengeFehler = aufgabeAnhaengePruefen(neueAnhaenge)
  if (anhaengeFehler) {
    redirect(`/aufgaben?fehler=${anhaengeFehler}`)
  }

  const aufgabe = await prisma.aufgabe.create({
    data: { personId: kontext.personId, titel, beschreibung, prioritaet, faelligAm, geplantAm },
  })

  if (neueAnhaenge.length > 0) {
    await aufgabeAnhaengeSpeichern(aufgabe.id, neueAnhaenge)
  }

  revalidatePath("/")
  revalidatePath("/geplante-aktionen")
  // redirect() statt nur revalidatePath: das Formular bleibt sonst mit
  // Titel und Notizen-Editor stehen (Server Actions ohne Navigation
  // setzen weder unkontrollierte Felder noch den Editor-Zustand zurück)
  // — ein echter Sprung zurück auf dieselbe Seite baut das Formular neu
  // auf und leert es damit zuverlässig für die nächste Aufgabe.
  redirect("/aufgaben")
}

/**
 * Bearbeiten — Titel, Notizen, Fälligkeit, Priorität ändern und/oder
 * weitere Anhänge ergänzen. Nur die eigene Person darf ihre eigenen
 * Aufgaben bearbeiten.
 */
export async function aufgabeAktualisieren(aufgabeId: string, formData: FormData) {
  const kontext = await berechtigung()

  const aufgabe = await prisma.aufgabe.findUnique({ where: { id: aufgabeId } })
  if (!aufgabe || aufgabe.projektId) {
    throw new NichtBerechtigt("keine persönliche Aufgabe — Projekt-Aufgaben laufen über projektAufgabeErstellen/-StatusSetzen")
  }
  if (aufgabe.personId !== kontext.personId) {
    throw new NichtBerechtigt("nicht die eigene Aufgabe")
  }

  const titel = String(formData.get("titel") ?? "").trim()
  if (!titel) {
    redirect("/aufgaben?fehler=todoPflichtfeld")
  }

  const beschreibung = richTextSanitisieren(String(formData.get("beschreibung") ?? "")) || null

  const faelligEingabe = String(formData.get("faelligAm") ?? "")
  const faelligAm = faelligEingabe ? new Date(`${faelligEingabe}T00:00:00`) : null
  if (faelligAm && Number.isNaN(faelligAm.getTime())) {
    redirect("/aufgaben?fehler=todoPflichtfeld")
  }

  // "Geplant für" nur anfassen, solange die Aufgabe noch nicht aktiv ist —
  // sonst bleibt sie unverändert, egal was im (dann gar nicht erst
  // angezeigten) Formularfeld steht (Regel 5: nie dem Formularwert
  // vertrauen, wenn er gar nicht gelten darf). Ein geleertes Feld bei
  // einer noch nicht aktiven Aufgabe heißt "jetzt sofort aktivieren".
  const jetzt = new Date()
  const nochNichtAktiv = aufgabe.geplantAm !== null && aufgabe.geplantAm > jetzt
  const geplantAmUpdate = nochNichtAktiv
    ? (() => {
        const eingabe = String(formData.get("geplantAm") ?? "")
        const geplantAmNeu = eingabe ? new Date(`${eingabe}T00:00:00`) : null
        if (geplantAmNeu && Number.isNaN(geplantAmNeu.getTime())) {
          redirect("/aufgaben?fehler=todoPflichtfeld")
        }
        return { geplantAm: geplantAmNeu }
      })()
    : {}

  const prioritaetEingabe = String(formData.get("prioritaet") ?? "")
  const prioritaet = Object.values(AufgabePrioritaet).includes(prioritaetEingabe as AufgabePrioritaet)
    ? (prioritaetEingabe as AufgabePrioritaet)
    : AufgabePrioritaet.MITTEL

  const neueAnhaenge = anhaengeAusFormData(formData)
  const anhaengeFehler = aufgabeAnhaengePruefen(neueAnhaenge)
  if (anhaengeFehler) {
    redirect(`/aufgaben?fehler=${anhaengeFehler}`)
  }

  await prisma.aufgabe.update({
    where: { id: aufgabeId },
    data: { titel, beschreibung, prioritaet, faelligAm, ...geplantAmUpdate },
  })

  if (neueAnhaenge.length > 0) {
    await aufgabeAnhaengeSpeichern(aufgabeId, neueAnhaenge)
  }

  revalidatePath("/aufgaben")
  revalidatePath("/")
  revalidatePath("/geplante-aktionen")
}

/**
 * Erledigt-Umschalter — nur die eigene Person darf ihre eigenen Aufgaben
 * abhaken, es gibt keine geteilte Sicht auf fremde To-dos (siehe Model
 * Aufgabe).
 */
export async function aufgabeErledigtSetzen(aufgabeId: string, erledigt: boolean) {
  const kontext = await berechtigung()

  const aufgabe = await prisma.aufgabe.findUnique({ where: { id: aufgabeId } })
  if (!aufgabe || aufgabe.projektId) {
    throw new NichtBerechtigt("keine persönliche Aufgabe — Projekt-Aufgaben laufen über projektAufgabeStatusSetzen")
  }
  if (aufgabe.personId !== kontext.personId) {
    throw new NichtBerechtigt("nicht die eigene Aufgabe")
  }

  await prisma.aufgabe.update({
    where: { id: aufgabeId },
    data: { erledigtAm: erledigt ? new Date() : null },
  })

  revalidatePath("/aufgaben")
  revalidatePath("/")
}

export async function aufgabeLoeschen(aufgabeId: string) {
  const kontext = await berechtigung()

  const aufgabe = await prisma.aufgabe.findUnique({ where: { id: aufgabeId } })
  if (!aufgabe || aufgabe.projektId) {
    throw new NichtBerechtigt("keine persönliche Aufgabe — Projekt-Aufgaben laufen über projektAufgabeLoeschen")
  }
  if (aufgabe.personId !== kontext.personId) {
    throw new NichtBerechtigt("nicht die eigene Aufgabe")
  }

  await prisma.aufgabe.delete({ where: { id: aufgabeId } })

  revalidatePath("/aufgaben")
  revalidatePath("/")
  revalidatePath("/geplante-aktionen")
}

/** Entfernt einen einzelnen Anhang — Anhänge lassen sich nur nachträglich löschen, nicht ergänzen (siehe Aufgaben-Seite). */
export async function aufgabeAnhangLoeschen(anhangId: string) {
  const kontext = await berechtigung()

  const anhang = await prisma.aufgabeAnhang.findUnique({ where: { id: anhangId }, include: { aufgabe: true } })
  if (!anhang || anhang.aufgabe.projektId) {
    throw new NichtBerechtigt("kein Anhang einer persönlichen Aufgabe")
  }
  if (anhang.aufgabe.personId !== kontext.personId) {
    throw new NichtBerechtigt("nicht die eigene Aufgabe")
  }

  await aufgabeAnhangLoeschenIntern(anhangId)

  revalidatePath("/aufgaben")
  revalidatePath("/geplante-aktionen")
}
