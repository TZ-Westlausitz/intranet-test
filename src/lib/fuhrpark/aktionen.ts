"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { Prisma } from "@/generated/prisma/client"
import { Reifenart } from "@/generated/prisma/enums"
import { berlinerTagesbeginn } from "@/lib/datum"
import { fuhrparkRechte } from "./zugriff"

/** "2026-11-30" → Kalendertag als UTC-Mitternacht (Konvention, siehe src/lib/datum.ts); leer/ungültig → null. */
function kalendertagAusEingabe(wert: FormDataEntryValue | null): Date | null {
  const text = String(wert ?? "").trim()
  const treffer = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (!treffer) return null
  const datum = new Date(Date.UTC(Number(treffer[1]), Number(treffer[2]) - 1, Number(treffer[3])))
  return Number.isNaN(datum.getTime()) ? null : datum
}

/** "45.000,00" / "45000" → Cent; leer/ungültig → null. */
function centAusEuroEingabe(wert: FormDataEntryValue | null): number | null {
  const text = String(wert ?? "").trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
  if (!text) return null
  const zahl = Number(text)
  return Number.isFinite(zahl) && zahl >= 0 ? Math.round(zahl * 100) : null
}

function ganzzahlAusEingabe(wert: FormDataEntryValue | null): number | null {
  const text = String(wert ?? "").trim()
  if (!text) return null
  const zahl = Number(text)
  return Number.isInteger(zahl) && zahl >= 0 ? zahl : null
}

function textOderNull(wert: FormDataEntryValue | null): string | null {
  return String(wert ?? "").trim() || null
}

/** Liest und prüft die Fahrzeug-Formularfelder — für Anlegen UND Ändern dieselben. */
async function fahrzeugDatenAusFormular(formData: FormData) {
  const kennzeichen = String(formData.get("kennzeichen") ?? "").trim().toUpperCase()
  const bezeichnung = String(formData.get("bezeichnung") ?? "").trim()
  if (!kennzeichen || !bezeichnung) return { fehler: "pflichtfeld" as const }

  const standortId = textOderNull(formData.get("standortId"))
  if (standortId && (await prisma.standort.count({ where: { id: standortId, aktiv: true } })) === 0) {
    return { fehler: "standortUngueltig" as const }
  }

  // Halter: nur aktive Personen — ausgeschiedene tauchen nirgends mehr auf
  // (siehe Regel 4 / Deaktivierung), auch nicht als Verantwortliche.
  const halterId = textOderNull(formData.get("halterId"))
  if (halterId && (await prisma.person.count({ where: { benutzername: halterId, aktiv: true } })) === 0) {
    return { fehler: "halterUngueltig" as const }
  }

  const reifen = String(formData.get("reifenart") ?? "")
  const reifenart = (Object.values(Reifenart) as string[]).includes(reifen) ? (reifen as Reifenart) : null

  return {
    daten: {
      kennzeichen,
      bezeichnung,
      sitzplaetze: ganzzahlAusEingabe(formData.get("sitzplaetze")),
      merkmale: textOderNull(formData.get("merkmale")),
      standortId,
      halterId,
      zuordnungHinweis: textOderNull(formData.get("zuordnungHinweis")),
      huFaelligAm: kalendertagAusEingabe(formData.get("huFaelligAm")),
      serviceFaelligAm: kalendertagAusEingabe(formData.get("serviceFaelligAm")),
      reifenart,
      fuerPrivatausleiheFreigegeben: formData.get("fuerPrivatausleiheFreigegeben") === "on",
      bruttolistenpreisCent: centAusEuroEingabe(formData.get("bruttolistenpreis")),
      kraftstoffart: textOderNull(formData.get("kraftstoffart")),
      tankgroesseLiter: ganzzahlAusEingabe(formData.get("tankgroesseLiter")),
    },
  }
}

/** Wer Fahrzeugdaten ändern darf — dieselbe Regel wie fuhrparkRechte().darfBearbeiten. */
const BEARBEITEN = ["Werkstattleiter", "Adminbereich"]

function fuhrparkNachAenderung() {
  revalidatePath("/fuhrpark")
  revalidatePath("/fuhrpark/[fahrzeugId]", "page")
  revalidatePath("/fahrzeug-mieten")
  revalidatePath("/fahrzeuge")
}

/** Neues Fahrzeug im Fuhrpark anlegen — nur Werkstattleiter. */
export async function fahrzeugAnlegen(formData: FormData) {
  await berechtigung({ benoetigteBerechtigung: BEARBEITEN })

  const ergebnis = await fahrzeugDatenAusFormular(formData)
  if ("fehler" in ergebnis) redirect(`/fuhrpark/neu?fehler=${ergebnis.fehler}`)

  let neueId: string
  try {
    const fahrzeug = await prisma.fahrzeug.create({ data: ergebnis.daten, select: { id: true } })
    neueId = fahrzeug.id
  } catch (fehler) {
    if (fehler instanceof Prisma.PrismaClientKnownRequestError && fehler.code === "P2002") {
      redirect("/fuhrpark/neu?fehler=kennzeichenVergeben")
    }
    throw fehler
  }

  fuhrparkNachAenderung()
  redirect(`/fuhrpark/${neueId}`)
}

/** Fahrzeugdaten ändern — nur Werkstattleiter. */
export async function fahrzeugAktualisieren(fahrzeugId: string, formData: FormData) {
  await berechtigung({ benoetigteBerechtigung: BEARBEITEN })

  const ergebnis = await fahrzeugDatenAusFormular(formData)
  if ("fehler" in ergebnis) redirect(`/fuhrpark/${fahrzeugId}?fehler=${ergebnis.fehler}`)

  // "aktiv" gibt es nur im Bearbeiten-Formular: abgewählt = ausgemustert.
  const aktiv = formData.get("aktiv") === "on"

  try {
    await prisma.fahrzeug.update({ where: { id: fahrzeugId }, data: { ...ergebnis.daten, aktiv } })
  } catch (fehler) {
    if (fehler instanceof Prisma.PrismaClientKnownRequestError && fehler.code === "P2002") {
      redirect(`/fuhrpark/${fahrzeugId}?fehler=kennzeichenVergeben`)
    }
    throw fehler
  }

  fuhrparkNachAenderung()
  redirect(aktiv ? `/fuhrpark/${fahrzeugId}` : "/fuhrpark")
}

/**
 * Schaden am Fahrzeug erfassen — auch außerhalb einer Mietfahrt. Darf die
 * Werkstatt und der Halter des Fahrzeugs (der sieht ja "sein" Auto und
 * merkt einen Parkrempler als Erster).
 */
export async function fahrzeugschadenErfassen(fahrzeugId: string, formData: FormData) {
  const kontext = await berechtigung()

  const fahrzeug = await prisma.fahrzeug.findUnique({ where: { id: fahrzeugId }, select: { halterId: true } })
  const darf = fuhrparkRechte(kontext).darfBearbeiten || (fahrzeug !== null && fahrzeug.halterId === kontext.personId)
  if (!fahrzeug || !darf) redirect("/fuhrpark")

  const position = String(formData.get("position") ?? "").trim()
  const beschreibung = String(formData.get("beschreibung") ?? "").trim()
  if (!position || !beschreibung) redirect(`/fuhrpark/${fahrzeugId}?fehler=schadenPflichtfeld`)

  // Ohne Datum: heute.
  const festgestelltAm = kalendertagAusEingabe(formData.get("festgestelltAm")) ?? berlinerTagesbeginn()

  await prisma.fahrzeugschaden.create({
    data: { fahrzeugId, position, beschreibung, festgestelltAm, gemeldetVonId: kontext.personId },
  })

  fuhrparkNachAenderung()
  redirect(`/fuhrpark/${fahrzeugId}`)
}

/** Schaden als behoben markieren bzw. wieder öffnen — nur Werkstattleiter. */
export async function fahrzeugschadenBehobenSetzen(schadenId: string, behoben: boolean) {
  await berechtigung({ benoetigteBerechtigung: BEARBEITEN })

  const schaden = await prisma.fahrzeugschaden.update({
    where: { id: schadenId },
    data: { behobenAm: behoben ? berlinerTagesbeginn() : null },
    select: { fahrzeugId: true },
  })

  fuhrparkNachAenderung()
  redirect(`/fuhrpark/${schaden.fahrzeugId}`)
}
