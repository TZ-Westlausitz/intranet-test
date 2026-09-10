"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { berechtigung, NichtBerechtigt } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { AufgabePrioritaet, AuftragStatus } from "@/generated/prisma/enums"
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
 * Liest und prüft die Felder, die sich echtes Anlegen/Finalisieren und
 * Entwurf-Speichern teilen — `entwurf: true` (siehe
 * auftragAlsEntwurfSpeichern, Rückmeldung 2026-09-09) schaltet die
 * Titel-/Zuweisen-Pflicht ab, der Selbstauftrag-Check bleibt aber IMMER
 * aktiv (auch ein Entwurf soll das nicht klammheimlich zulassen).
 */
function auftragFelderLesenOderFehler(formData: FormData, personId: string, entwurf: boolean) {
  const titel = String(formData.get("titel") ?? "").trim()
  const zugewiesenAnId = String(formData.get("zugewiesenAn") ?? "") || null
  if (!entwurf && (!titel || !zugewiesenAnId)) {
    redirect("/aufgaben?fehler=pflichtfeld")
  }
  if (zugewiesenAnId === personId) {
    redirect("/aufgaben?fehler=selbstauftrag")
  }

  const beschreibung = richTextSanitisieren(String(formData.get("beschreibung") ?? "")) || null

  const faelligEingabe = String(formData.get("faelligAm") ?? "")
  const faelligAm = faelligEingabe ? new Date(`${faelligEingabe}T00:00:00`) : null
  if (faelligAm && Number.isNaN(faelligAm.getTime())) {
    redirect("/aufgaben?fehler=pflichtfeld")
  }

  // "Geplant für" — Datum-only wie faelligAm, kein datetime-local nötig.
  // Bis zu diesem Datum sieht die zugewiesene Person den Auftrag NICHT
  // (siehe Kommentar am Feld Auftrag.geplantAm), verwaltbar bis dahin nur
  // über /geplante-aktionen.
  const geplantEingabe = String(formData.get("geplantAm") ?? "")
  const jetzt = new Date()
  const geplantAm = geplantEingabe ? new Date(`${geplantEingabe}T00:00:00`) : null
  if (geplantAm && Number.isNaN(geplantAm.getTime())) {
    redirect("/aufgaben?fehler=pflichtfeld")
  }
  const istGeplant = geplantAm !== null && geplantAm > jetzt

  const prioritaetEingabe = String(formData.get("prioritaet") ?? "")
  const prioritaet = Object.values(AufgabePrioritaet).includes(prioritaetEingabe as AufgabePrioritaet)
    ? (prioritaetEingabe as AufgabePrioritaet)
    : AufgabePrioritaet.MITTEL

  const neueAnhaenge = anhaengeAusFormData(formData)
  const anhaengeFehler = auftragAnhaengePruefen(neueAnhaenge)
  if (anhaengeFehler) {
    redirect(`/aufgaben?fehler=${anhaengeFehler}`)
  }

  return { titel, zugewiesenAnId, beschreibung, faelligAm, geplantAm, istGeplant, prioritaet, neueAnhaenge }
}

/**
 * Legt einen Auftrag an ODER finalisiert einen vorhandenen Entwurf
 * (`entwurfId` gesetzt, siehe auftragEntwurfFinalisieren) — bei
 * `istEntwurf: false` bekommt die zugewiesene Person hier zum ERSTEN Mal
 * überhaupt eine Benachrichtigung, ein Entwurf hatte sie ja rein privat
 * gehalten.
 */
async function auftragSpeichern(
  kontext: { personId: string; name: string },
  felder: ReturnType<typeof auftragFelderLesenOderFehler>,
  istEntwurf: boolean,
  entwurfId?: string,
) {
  const daten = {
    erstelltVonId: kontext.personId,
    zugewiesenAnId: felder.zugewiesenAnId,
    titel: felder.titel || "Entwurf ohne Titel",
    beschreibung: felder.beschreibung,
    prioritaet: felder.prioritaet,
    faelligAm: felder.faelligAm,
    geplantAm: felder.geplantAm,
    istEntwurf,
  }
  const auftrag = entwurfId
    ? await prisma.auftrag.update({ where: { id: entwurfId }, data: daten })
    : await prisma.auftrag.create({ data: daten })

  if (felder.neueAnhaenge.length > 0) {
    await auftragAnhaengeSpeichern(auftrag.id, felder.neueAnhaenge)
  }

  // Bei "Geplant für" bekommt die zugewiesene Person noch keine
  // Benachrichtigung — sie kann den Auftrag ja noch gar nicht sehen
  // (dieselbe Begründung wie bei infoErstellen).
  if (!istEntwurf && !felder.istGeplant && felder.zugewiesenAnId) {
    await benachrichtigungErstellen({
      personId: felder.zugewiesenAnId,
      text: `${kontext.name} hat dir eine Aufgabe zugewiesen: "${felder.titel}"`,
      link: "/aufgaben",
    })
  }

  revalidatePath("/")
  revalidatePath("/geplante-aktionen")
  redirect("/aufgaben")
}

/**
 * Legt einen Auftrag für eine ANDERE Person an — für die eigene Liste
 * gibt es Aufgabe (To-do), kein Selbstauftrag hier. Keine Rollenprüfung:
 * jede aktive Person darf jeder anderen einen Auftrag geben, genau wie
 * beim Einladen zu einem Termin.
 */
export async function auftragErstellen(formData: FormData) {
  const kontext = await berechtigung()
  const felder = auftragFelderLesenOderFehler(formData, kontext.personId, false)
  await auftragSpeichern(kontext, felder, false)
}

/**
 * Vervollständigt einen eigenen Entwurf (siehe auftragAlsEntwurfSpeichern)
 * zu einem echten Auftrag — dieselbe Pflichtprüfung wie beim frischen
 * Anlegen (Titel + Zuweisen). Nur die erstellende Person darf das.
 */
export async function auftragEntwurfFinalisieren(entwurfId: string, formData: FormData) {
  const kontext = await berechtigung()

  const entwurf = await prisma.auftrag.findUnique({
    where: { id: entwurfId },
    select: { erstelltVonId: true, istEntwurf: true },
  })
  if (!entwurf?.istEntwurf || entwurf.erstelltVonId !== kontext.personId) {
    throw new NichtBerechtigt("Entwurf nicht gefunden")
  }

  const felder = auftragFelderLesenOderFehler(formData, kontext.personId, false)
  await auftragSpeichern(kontext, felder, false, entwurfId)
}

/**
 * Speichert den "+ Auftrag"-Dialog als NEUEN Entwurf — ausgelöst, wenn er
 * ohne normales Zuweisen geschlossen wird (Abbrechen/Escape, siehe
 * AuftragErstellenDialog/EntwurfBestaetigenDialog) und sich die Person
 * dagegen entscheidet, die Eingaben zu verwerfen. Ohne die
 * Pflichtprüfungen von auftragErstellen, ohne Benachrichtigung. Für einen
 * bereits bestehenden Entwurf (erneutes Entwurf-Speichern beim "Weiter
 * bearbeiten") siehe auftragEntwurfAktualisieren — zwei getrennte
 * Funktionen statt eines optionalen führenden Parameters, weil Server
 * Actions als `<form action>`/`formAction` FormData immer als LETZTES
 * Argument nach gebundenen Parametern bekommen (siehe `.bind(null, id)`
 * überall sonst in diesem Projekt).
 */
export async function auftragAlsEntwurfSpeichern(formData: FormData) {
  const kontext = await berechtigung()
  const felder = auftragFelderLesenOderFehler(formData, kontext.personId, true)
  await auftragSpeichern(kontext, felder, true)
}

/** Speichert einen BEREITS BESTEHENDEN Entwurf erneut — siehe auftragAlsEntwurfSpeichern. */
export async function auftragEntwurfAktualisieren(entwurfId: string, formData: FormData) {
  const kontext = await berechtigung()

  const entwurf = await prisma.auftrag.findUnique({
    where: { id: entwurfId },
    select: { erstelltVonId: true, istEntwurf: true },
  })
  if (!entwurf?.istEntwurf || entwurf.erstelltVonId !== kontext.personId) {
    throw new NichtBerechtigt("Entwurf nicht gefunden")
  }

  const felder = auftragFelderLesenOderFehler(formData, kontext.personId, true)
  await auftragSpeichern(kontext, felder, true, entwurfId)
}

/**
 * OFFEN → ANGENOMMEN — nur die zugewiesene Person, nur solange noch
 * niemand angenommen hat. Erst danach lässt sich der Auftrag erledigen
 * (siehe auftragErledigtSetzen) — kein Überspringen dieses Schritts.
 */
export async function auftragAnnehmen(auftragId: string) {
  const kontext = await berechtigung()

  const auftrag = await prisma.auftrag.findUnique({ where: { id: auftragId } })
  if (!auftrag || auftrag.zugewiesenAnId !== kontext.personId) {
    throw new NichtBerechtigt("nicht der eigene Auftrag")
  }
  if (auftrag.status !== AuftragStatus.OFFEN) {
    throw new NichtBerechtigt("Auftrag ist nicht mehr offen")
  }

  await prisma.auftrag.update({ where: { id: auftragId }, data: { status: AuftragStatus.ANGENOMMEN } })

  await benachrichtigungErstellen({
    personId: auftrag.erstelltVonId,
    text: `${kontext.name} hat "${auftrag.titel}" angenommen`,
    link: "/aufgaben",
  })

  revalidatePath("/aufgaben")
  revalidatePath("/")
}

/**
 * Erledigt-Umschalter — nur die zugewiesene Person darf abhaken (sie
 * macht die Arbeit), nicht die erstellende. Erledigt ist erst ab
 * ANGENOMMEN erreichbar, "wieder öffnen" geht zurück auf ANGENOMMEN, nicht
 * auf OFFEN — ERLEDIGT setzt ja voraus, dass die Person schon angenommen
 * hatte. Benachrichtigt die erstellende Person beim Abhaken, damit sie
 * mitbekommt, dass sich was getan hat, ohne selbst nachschauen zu müssen.
 */
export async function auftragErledigtSetzen(auftragId: string, erledigt: boolean) {
  const kontext = await berechtigung()

  const auftrag = await prisma.auftrag.findUnique({ where: { id: auftragId } })
  if (!auftrag || auftrag.zugewiesenAnId !== kontext.personId) {
    throw new NichtBerechtigt("nicht der eigene Auftrag")
  }
  const erwarteterStatus = erledigt ? AuftragStatus.ANGENOMMEN : AuftragStatus.ERLEDIGT
  if (auftrag.status !== erwarteterStatus) {
    throw new NichtBerechtigt("Auftrag ist nicht im erwarteten Status")
  }

  await prisma.auftrag.update({
    where: { id: auftragId },
    data: {
      status: erledigt ? AuftragStatus.ERLEDIGT : AuftragStatus.ANGENOMMEN,
      erledigtAm: erledigt ? new Date() : null,
    },
  })

  if (erledigt) {
    await benachrichtigungErstellen({
      personId: auftrag.erstelltVonId,
      text: `${kontext.name} hat "${auftrag.titel}" erledigt`,
      link: "/aufgaben",
    })
  }

  revalidatePath("/aufgaben")
  revalidatePath("/")
}

/**
 * Löschen ist wie bei Aufgabe/Termin der erstellenden Person vorbehalten —
 * löscht auch einen eigenen Entwurf (siehe auftragAlsEntwurfSpeichern),
 * eine eigene Lösch-Aktion dafür ist nicht nötig.
 */
export async function auftragLoeschen(auftragId: string) {
  const kontext = await berechtigung()

  const auftrag = await prisma.auftrag.findUnique({ where: { id: auftragId } })
  if (!auftrag || auftrag.erstelltVonId !== kontext.personId) {
    throw new NichtBerechtigt("nur die erstellende Person darf den Auftrag löschen")
  }

  await prisma.auftrag.delete({ where: { id: auftragId } })

  // Ein Entwurf war nie sichtbar (siehe auftraegeFuerPerson) — die
  // zugewiesene Person (falls überhaupt schon gewählt) hat ihn nie zu
  // Gesicht bekommen, eine "zurückgezogen"-Benachrichtigung wäre nur
  // verwirrend. Dieselbe Begründung gilt für einen noch versteckt
  // geplanten Auftrag.
  const warNochVersteckt = auftrag.geplantAm !== null && auftrag.geplantAm > new Date()
  if (!auftrag.istEntwurf && !warNochVersteckt && auftrag.zugewiesenAnId) {
    await benachrichtigungErstellen({
      personId: auftrag.zugewiesenAnId,
      text: `${kontext.name} hat die Aufgabe "${auftrag.titel}" zurückgezogen`,
    })
  }

  revalidatePath("/aufgaben")
  revalidatePath("/")
  revalidatePath("/geplante-aktionen")
}

/** Anhänge lassen sich nur nachträglich löschen, nicht ergänzen — dieselbe Regel wie bei Aufgabe. */
export async function auftragAnhangLoeschen(anhangId: string) {
  const kontext = await berechtigung()

  const anhang = await prisma.auftragAnhang.findUnique({ where: { id: anhangId }, include: { auftrag: true } })
  if (!anhang || anhang.auftrag.erstelltVonId !== kontext.personId) {
    throw new NichtBerechtigt("nur die erstellende Person darf Anhänge entfernen")
  }

  await auftragAnhangLoeschenIntern(anhangId)

  revalidatePath("/aufgaben")
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
    redirect(`/aufgaben?fehler=${anhaengeFehler}`)
  }

  const text = String(formData.get("text") ?? "").trim()
  if (!text) return

  const kommentar = await prisma.auftragKommentar.create({ data: { auftragId, personId: kontext.personId, text } })

  if (neueAnhaenge.length > 0) {
    await auftragAnhaengeSpeichern(auftragId, neueAnhaenge, kommentar.id)
  }

  // Kommentare gibt es in der UI nur bei echten (sichtbaren) Aufträgen,
  // nie bei einem Entwurf — `zugewiesenAnId` ist hier also immer gesetzt.
  const empfaengerId = auftrag.erstelltVonId === kontext.personId ? auftrag.zugewiesenAnId! : auftrag.erstelltVonId
  await benachrichtigungErstellen({
    personId: empfaengerId,
    text: `${kontext.name} hat zu "${auftrag.titel}" kommentiert`,
    link: "/aufgaben",
  })

  revalidatePath("/aufgaben")
}
