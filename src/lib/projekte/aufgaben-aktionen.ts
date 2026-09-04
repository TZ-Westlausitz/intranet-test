"use server"

import { revalidatePath } from "next/cache"

import { berechtigung, NichtBerechtigt } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { AufgabePrioritaet, AufgabeStatus, ProjektmitgliedRolle, ProjektStatus } from "@/generated/prisma/enums"
import { richTextSanitisieren } from "@/lib/rich-text"
import { projektMitgliedschaftPruefen } from "@/lib/projekte/mitgliedschaft"
import { aufgabeAnhaengePruefen, aufgabeAnhaengeSpeichern } from "@/lib/aufgaben/anhaenge"
import { benachrichtigungErstellen } from "@/lib/benachrichtigungen/erstellen"

function anhaengeAusFormData(formData: FormData): File[] {
  return formData.getAll("anhaenge").filter((wert): wert is File => wert instanceof File)
}

/**
 * Legt eine Aufgabe INNERHALB eines Projekts an — jedes aktive Mitglied
 * darf das, nicht nur die Leitung (siehe Rechte-Tabelle im Plan). Wird
 * gleich jemand zugewiesen, muss diese Person ebenfalls aktives Mitglied
 * sein — sonst bliebe die Aufgabe für sie unsichtbar (siehe
 * projektSichtbarFuer/projektMitgliedschaftPruefen).
 */
export async function projektAufgabeErstellen(projektId: string, formData: FormData) {
  const kontext = await berechtigung()
  await projektMitgliedschaftPruefen(projektId, kontext.personId, { erfordertSchreibrecht: true })

  const titel = String(formData.get("titel") ?? "").trim()
  if (!titel) return

  const beschreibung = richTextSanitisieren(String(formData.get("beschreibung") ?? "")) || null

  const zwischenzielId = String(formData.get("zwischenzielId") ?? "") || null
  if (zwischenzielId) {
    const zwischenziel = await prisma.zwischenziel.findUnique({ where: { id: zwischenzielId } })
    if (!zwischenziel || zwischenziel.projektId !== projektId) return
  }

  const faelligEingabe = String(formData.get("faelligAm") ?? "")
  const faelligAm = faelligEingabe ? new Date(`${faelligEingabe}T00:00:00`) : null
  if (faelligAm && Number.isNaN(faelligAm.getTime())) return

  const prioritaetEingabe = String(formData.get("prioritaet") ?? "")
  const prioritaet = Object.values(AufgabePrioritaet).includes(prioritaetEingabe as AufgabePrioritaet)
    ? (prioritaetEingabe as AufgabePrioritaet)
    : AufgabePrioritaet.MITTEL

  const zugewiesenAnId = String(formData.get("zugewiesenAn") ?? "") || null
  if (zugewiesenAnId) {
    const mitglied = await prisma.projektmitglied.findUnique({
      where: { projektId_personId: { projektId, personId: zugewiesenAnId } },
    })
    if (!mitglied || mitglied.ausgeschiedenAm !== null) {
      throw new NichtBerechtigt("zugewiesene Person ist kein aktives Mitglied dieses Projekts")
    }
  }

  const neueAnhaenge = anhaengeAusFormData(formData)
  const anhaengeFehler = aufgabeAnhaengePruefen(neueAnhaenge)
  if (anhaengeFehler) return

  const aufgabe = await prisma.aufgabe.create({
    data: {
      projektId,
      zwischenzielId,
      titel,
      beschreibung,
      prioritaet,
      faelligAm,
      erstelltVonId: kontext.personId,
      zugewiesenAnId,
      // Auch direkt zugewiesen startet OFFEN — erst wenn die zugewiesene
      // Person selbst Kenntnis nimmt (projektAufgabeKenntnisnahme), wird
      // sichtbar, dass sie sich jetzt darum kümmert.
      status: AufgabeStatus.OFFEN,
    },
  })

  if (neueAnhaenge.length > 0) {
    await aufgabeAnhaengeSpeichern(aufgabe.id, neueAnhaenge)
  }

  // Während der Planung noch keine Benachrichtigung — die kommt gebündelt
  // beim "Projekt starten" (projektStarten in aktionen.ts), sonst würde
  // jede Zuweisung schon beim Aufbau des Projekts einzeln benachrichtigen.
  if (zugewiesenAnId && zugewiesenAnId !== kontext.personId) {
    const projekt = await prisma.projekt.findUnique({ where: { id: projektId } })
    if (projekt?.status !== ProjektStatus.PLANUNG) {
      await benachrichtigungErstellen({
        personId: zugewiesenAnId,
        text: `${kontext.name} hat dir im Projekt "${projekt?.titel}" die Aufgabe "${titel}" zugewiesen`,
        link: `/aufgaben/projekte/${projektId}`,
      })
    }
  }

  revalidatePath(`/aufgaben/projekte/${projektId}`)
}

/** Selbstzuweisung — OFFEN → ANGENOMMEN. Nur möglich, solange noch niemand übernommen hat. */
export async function projektAufgabeAnnehmen(projektId: string, aufgabeId: string) {
  const kontext = await berechtigung()
  await projektMitgliedschaftPruefen(projektId, kontext.personId, { erfordertSchreibrecht: true })

  const aufgabe = await prisma.aufgabe.findUnique({ where: { id: aufgabeId } })
  if (!aufgabe || aufgabe.projektId !== projektId) {
    throw new NichtBerechtigt("Aufgabe nicht gefunden")
  }
  if (aufgabe.zugewiesenAnId !== null) {
    throw new NichtBerechtigt("Aufgabe ist bereits vergeben")
  }

  await prisma.aufgabe.update({
    where: { id: aufgabeId },
    data: { zugewiesenAnId: kontext.personId, status: AufgabeStatus.ANGENOMMEN },
  })

  revalidatePath(`/aufgaben/projekte/${projektId}`)
}

/**
 * Für eine bereits zugewiesene Aufgabe: OFFEN → ANGENOMMEN. Anders als
 * projektAufgabeAnnehmen (Selbstzuweisung einer noch niemandem gehörenden
 * Aufgabe) bleibt zugewiesenAnId hier unverändert — nur die zugewiesene
 * Person selbst darf das, absichtlich nicht die Leitung: der Sinn ist
 * genau, sichtbar zu machen, dass SIE sich jetzt darum kümmert.
 */
export async function projektAufgabeKenntnisnahme(projektId: string, aufgabeId: string) {
  const kontext = await berechtigung()
  await projektMitgliedschaftPruefen(projektId, kontext.personId, { erfordertSchreibrecht: true })

  const aufgabe = await prisma.aufgabe.findUnique({ where: { id: aufgabeId } })
  if (!aufgabe || aufgabe.projektId !== projektId) {
    throw new NichtBerechtigt("Aufgabe nicht gefunden")
  }
  if (aufgabe.zugewiesenAnId !== kontext.personId) {
    throw new NichtBerechtigt("nur die zugewiesene Person kann die Aufgabe annehmen")
  }
  if (aufgabe.status !== AufgabeStatus.OFFEN) {
    throw new NichtBerechtigt("Aufgabe ist nicht mehr offen")
  }

  await prisma.aufgabe.update({
    where: { id: aufgabeId },
    data: { status: AufgabeStatus.ANGENOMMEN },
  })

  revalidatePath(`/aufgaben/projekte/${projektId}`)
}

/**
 * ANGENOMMEN → IN_ARBEIT — nur die zugewiesene Person oder die Leitung.
 * Bewusst ein eigener Schritt (nicht in projektAufgabeStatusSetzen mit
 * hineingenommen): damit für die übrigen Mitglieder sichtbar bleibt, wann
 * jemand tatsächlich zu arbeiten beginnt, statt direkt von "angenommen"
 * auf "erledigt" zu springen.
 */
export async function projektAufgabeInArbeitSetzen(projektId: string, aufgabeId: string) {
  const kontext = await berechtigung()
  const { mitglied } = await projektMitgliedschaftPruefen(projektId, kontext.personId, { erfordertSchreibrecht: true })

  const aufgabe = await prisma.aufgabe.findUnique({ where: { id: aufgabeId } })
  if (!aufgabe || aufgabe.projektId !== projektId) {
    throw new NichtBerechtigt("Aufgabe nicht gefunden")
  }

  const darfAendern = aufgabe.zugewiesenAnId === kontext.personId || mitglied.rolle === ProjektmitgliedRolle.LEITUNG
  if (!darfAendern) {
    throw new NichtBerechtigt("nur die zugewiesene Person oder die Leitung darf den Status ändern")
  }
  if (aufgabe.status !== AufgabeStatus.ANGENOMMEN) {
    throw new NichtBerechtigt("Aufgabe ist nicht im Status Angenommen")
  }

  await prisma.aufgabe.update({ where: { id: aufgabeId }, data: { status: AufgabeStatus.IN_ARBEIT } })

  revalidatePath(`/aufgaben/projekte/${projektId}`)
}

/**
 * Wechselt zwischen IN_ARBEIT und ERLEDIGT — nur die zugewiesene Person
 * oder die Leitung. `erledigtAm` läuft synchron mit, damit
 * personId-unabhängige Auswertungen (Fortschritt) dieselbe Spalte wie bei
 * persönlichen To-dos nutzen können. "Wieder öffnen" geht zurück auf
 * IN_ARBEIT, nicht auf ANGENOMMEN — ERLEDIGT impliziert, dass tatsächlich
 * daran gearbeitet wurde.
 */
export async function projektAufgabeStatusSetzen(projektId: string, aufgabeId: string, erledigt: boolean) {
  const kontext = await berechtigung()
  const { mitglied } = await projektMitgliedschaftPruefen(projektId, kontext.personId, { erfordertSchreibrecht: true })

  const aufgabe = await prisma.aufgabe.findUnique({ where: { id: aufgabeId } })
  if (!aufgabe || aufgabe.projektId !== projektId) {
    throw new NichtBerechtigt("Aufgabe nicht gefunden")
  }

  const darfAendern = aufgabe.zugewiesenAnId === kontext.personId || mitglied.rolle === ProjektmitgliedRolle.LEITUNG
  if (!darfAendern) {
    throw new NichtBerechtigt("nur die zugewiesene Person oder die Leitung darf den Status ändern")
  }
  const erwarteterStatus = erledigt ? AufgabeStatus.IN_ARBEIT : AufgabeStatus.ERLEDIGT
  if (aufgabe.status !== erwarteterStatus) {
    throw new NichtBerechtigt("Aufgabe ist nicht im erwarteten Status")
  }

  await prisma.aufgabe.update({
    where: { id: aufgabeId },
    data: {
      status: erledigt ? AufgabeStatus.ERLEDIGT : AufgabeStatus.IN_ARBEIT,
      erledigtAm: erledigt ? new Date() : null,
    },
  })

  revalidatePath(`/aufgaben/projekte/${projektId}`)
}

/** Löschen bleibt der Leitung oder der erstellenden Person vorbehalten — dasselbe Muster wie bei Auftrag. */
export async function projektAufgabeLoeschen(projektId: string, aufgabeId: string) {
  const kontext = await berechtigung()
  const { mitglied } = await projektMitgliedschaftPruefen(projektId, kontext.personId, { erfordertSchreibrecht: true })

  const aufgabe = await prisma.aufgabe.findUnique({ where: { id: aufgabeId } })
  if (!aufgabe || aufgabe.projektId !== projektId) {
    throw new NichtBerechtigt("Aufgabe nicht gefunden")
  }

  const darfLoeschen = aufgabe.erstelltVonId === kontext.personId || mitglied.rolle === ProjektmitgliedRolle.LEITUNG
  if (!darfLoeschen) {
    throw new NichtBerechtigt("nur die erstellende Person oder die Leitung darf löschen")
  }

  await prisma.aufgabe.delete({ where: { id: aufgabeId } })

  revalidatePath(`/aufgaben/projekte/${projektId}`)
}
