"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { Prisma } from "@/generated/prisma/client"
import { Reifenart, FahrzeugterminArt } from "@/generated/prisma/enums"
import { berlinerTagesbeginn, formatiereDatumAusDate } from "@/lib/datum"
import { benachrichtigungErstellen } from "@/lib/benachrichtigungen/erstellen"
import { FAHRZEUGTERMIN_ART_TEXT } from "./fristen"
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

/**
 * Markiert angenommene Terminvorschläge der genannten Arten als erledigt —
 * kein eigener "durchgeführt"-Knopf: Sobald die Werkstatt das nächste
 * Fälligkeitsdatum einträgt (TÜV/Service) bzw. die Reifenart ändert
 * (Reifenwechsel), gilt der zuletzt angenommene Termin dieser Art als
 * durchgeführt (siehe Kommentar am Model Fahrzeugterminvorschlag).
 */
async function terminvorschlaegeAlsErledigtMarkieren(fahrzeugId: string, arten: FahrzeugterminArt[]) {
  if (arten.length === 0) return
  await prisma.fahrzeugterminvorschlag.updateMany({
    where: { fahrzeugId, art: { in: arten }, status: "ANGENOMMEN" },
    data: { status: "ERLEDIGT", erledigtAm: berlinerTagesbeginn() },
  })
}

/** Fahrzeugdaten ändern — nur Werkstattleiter. */
export async function fahrzeugAktualisieren(fahrzeugId: string, formData: FormData) {
  await berechtigung({ benoetigteBerechtigung: BEARBEITEN })

  const ergebnis = await fahrzeugDatenAusFormular(formData)
  if ("fehler" in ergebnis) redirect(`/fuhrpark/${fahrzeugId}?fehler=${ergebnis.fehler}`)

  // "aktiv" gibt es nur im Bearbeiten-Formular: abgewählt = ausgemustert.
  const aktiv = formData.get("aktiv") === "on"

  const vorher = await prisma.fahrzeug.findUnique({
    where: { id: fahrzeugId },
    select: { huFaelligAm: true, serviceFaelligAm: true, reifenart: true },
  })

  try {
    await prisma.fahrzeug.update({ where: { id: fahrzeugId }, data: { ...ergebnis.daten, aktiv } })
  } catch (fehler) {
    if (fehler instanceof Prisma.PrismaClientKnownRequestError && fehler.code === "P2002") {
      redirect(`/fuhrpark/${fahrzeugId}?fehler=kennzeichenVergeben`)
    }
    throw fehler
  }

  if (vorher) {
    await terminvorschlaegeAlsErledigtMarkieren(
      fahrzeugId,
      (
        [
          vorher.huFaelligAm?.getTime() !== ergebnis.daten.huFaelligAm?.getTime() ? "TUEV" : null,
          vorher.serviceFaelligAm?.getTime() !== ergebnis.daten.serviceFaelligAm?.getTime() ? "SERVICE" : null,
          vorher.reifenart !== ergebnis.daten.reifenart ? "REIFENWECHSEL" : null,
        ] as const
      ).filter((art): art is FahrzeugterminArt => art !== null),
    )
  }

  fuhrparkNachAenderung()
  redirect(aktiv ? `/fuhrpark/${fahrzeugId}` : "/fuhrpark")
}

/**
 * Terminvorschlag (TÜV/Service/Reifenwechsel) an den Halter schicken — nur
 * Werkstattleiter, und nur wenn das Fahrzeug einen Halter hat. Ohne Halter
 * (z. B. ein Praxisfahrzeug) trägt die Werkstatt das Datum direkt im
 * "Fahrzeug bearbeiten"-Formular ein, ohne Abstimmungsweg.
 */
export async function fahrzeugTerminVorschlagen(fahrzeugId: string, formData: FormData) {
  const kontext = await berechtigung({ benoetigteBerechtigung: BEARBEITEN })

  const fahrzeug = await prisma.fahrzeug.findUnique({
    where: { id: fahrzeugId },
    select: { halterId: true, bezeichnung: true, kennzeichen: true },
  })
  if (!fahrzeug?.halterId) redirect(`/fuhrpark/${fahrzeugId}?fehler=keinHalter`)

  const artEingabe = String(formData.get("art") ?? "")
  const datum = kalendertagAusEingabe(formData.get("datum"))
  if (!(Object.values(FahrzeugterminArt) as string[]).includes(artEingabe) || !datum) {
    redirect(`/fuhrpark/${fahrzeugId}?fehler=terminPflichtfeld`)
  }
  const art = artEingabe as FahrzeugterminArt

  const vorschlag = await prisma.fahrzeugterminvorschlag.create({
    data: { fahrzeugId, art, datum, vorgeschlagenVonId: kontext.personId, empfaengerId: fahrzeug.halterId },
  })

  await benachrichtigungErstellen({
    personId: fahrzeug.halterId,
    text: `Terminvorschlag: ${FAHRZEUGTERMIN_ART_TEXT[art]} für ${fahrzeug.bezeichnung} (${fahrzeug.kennzeichen}) am ${formatiereDatumAusDate(datum)}.`,
    link: `/fuhrpark/${fahrzeugId}?vorschlag=${vorschlag.id}`,
  })

  fuhrparkNachAenderung()
  redirect(`/fuhrpark/${fahrzeugId}`)
}

/**
 * Halter nimmt einen Terminvorschlag an — legt einen echten Kalendertermin
 * an, an dem beide Seiten (vorschlagende und annehmende Person) als
 * zugesagt teilnehmen, und markiert den Vorschlag als ANGENOMMEN.
 */
export async function fahrzeugTerminAnnehmen(vorschlagId: string) {
  const kontext = await berechtigung()

  const vorschlag = await prisma.fahrzeugterminvorschlag.findUnique({
    where: { id: vorschlagId },
    include: { fahrzeug: { select: { id: true, bezeichnung: true, kennzeichen: true } } },
  })
  if (!vorschlag || vorschlag.empfaengerId !== kontext.personId || vorschlag.status !== "VORGESCHLAGEN") {
    redirect("/fuhrpark")
  }

  const titel = `${FAHRZEUGTERMIN_ART_TEXT[vorschlag.art]}: ${vorschlag.fahrzeug.bezeichnung} (${vorschlag.fahrzeug.kennzeichen})`
  // Dieselbe Person kann Vorschlagende:r und Halter:in zugleich sein (eigenes
  // Fahrzeug der Werkstatt) — dedupliziert, sonst verletzt der zweite
  // Teilnehmer-Eintrag den Unique-Index (terminId, personId).
  const teilnehmerIds = [...new Set([vorschlag.vorgeschlagenVonId, vorschlag.empfaengerId])]

  await prisma.$transaction(async (tx) => {
    const termin = await tx.termin.create({
      data: {
        titel,
        ganztaegig: true,
        beginn: vorschlag.datum,
        ende: vorschlag.datum,
        erstelltVonId: vorschlag.vorgeschlagenVonId,
        teilnehmer: { create: teilnehmerIds.map((personId) => ({ personId, status: "ZUGESAGT" as const })) },
      },
      select: { id: true },
    })
    await tx.fahrzeugterminvorschlag.update({
      where: { id: vorschlagId },
      data: { status: "ANGENOMMEN", terminId: termin.id, entschiedenAm: berlinerTagesbeginn() },
    })
  })

  await benachrichtigungErstellen({
    personId: vorschlag.vorgeschlagenVonId,
    text: `${kontext.name} hat den Termin (${titel}, ${formatiereDatumAusDate(vorschlag.datum)}) angenommen.`,
    link: `/fuhrpark/${vorschlag.fahrzeugId}`,
  })

  fuhrparkNachAenderung()
  revalidatePath("/kalender")
  redirect(`/fuhrpark/${vorschlag.fahrzeugId}`)
}

/**
 * Halter lehnt den vorgeschlagenen Termin ab und bittet um einen neuen —
 * kein Kalendereintrag, nur eine Benachrichtigung zurück an die Werkstatt.
 */
export async function fahrzeugTerminNeuenSuchen(vorschlagId: string) {
  const kontext = await berechtigung()

  const vorschlag = await prisma.fahrzeugterminvorschlag.findUnique({
    where: { id: vorschlagId },
    include: { fahrzeug: { select: { id: true, bezeichnung: true, kennzeichen: true } } },
  })
  if (!vorschlag || vorschlag.empfaengerId !== kontext.personId || vorschlag.status !== "VORGESCHLAGEN") {
    redirect("/fuhrpark")
  }

  await prisma.fahrzeugterminvorschlag.update({
    where: { id: vorschlagId },
    data: { status: "ABGELEHNT", entschiedenAm: berlinerTagesbeginn() },
  })

  const titel = `${FAHRZEUGTERMIN_ART_TEXT[vorschlag.art]}: ${vorschlag.fahrzeug.bezeichnung} (${vorschlag.fahrzeug.kennzeichen})`
  await benachrichtigungErstellen({
    personId: vorschlag.vorgeschlagenVonId,
    text: `${kontext.name} kann den vorgeschlagenen Termin (${titel}, ${formatiereDatumAusDate(vorschlag.datum)}) nicht wahrnehmen — bitte einen neuen Termin vorschlagen.`,
    link: `/fuhrpark/${vorschlag.fahrzeugId}`,
  })

  fuhrparkNachAenderung()
  redirect(`/fuhrpark/${vorschlag.fahrzeugId}`)
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

  // Dieselbe Skizze wie im Übergabeprotokoll (Schadensskizze) liefert einen
  // oder mehrere Punkte als JSON — genau wie dort in
  // uebergabeprotokoll-unterschreiben/page.tsx in Schaden-Zeilen übersetzt
  // (position = Zone am Fahrzeug, beschreibung = "Art: Freitext").
  let schadenspunkte: { zone: string; art: string; beschreibung: string }[] = []
  try {
    const eingabe = JSON.parse(String(formData.get("schadenspunkte") ?? "[]"))
    if (Array.isArray(eingabe)) schadenspunkte = eingabe
  } catch {
    schadenspunkte = []
  }
  if (schadenspunkte.length === 0) redirect(`/fuhrpark/${fahrzeugId}?fehler=schadenPflichtfeld`)

  // Ohne Datum: heute.
  const festgestelltAm = kalendertagAusEingabe(formData.get("festgestelltAm")) ?? berlinerTagesbeginn()

  await prisma.fahrzeugschaden.createMany({
    data: schadenspunkte.map((punkt) => ({
      fahrzeugId,
      position: punkt.zone,
      beschreibung: `${punkt.art}: ${punkt.beschreibung}`,
      festgestelltAm,
      gemeldetVonId: kontext.personId,
    })),
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
