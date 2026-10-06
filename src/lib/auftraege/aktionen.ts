"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { berechtigung, NichtBerechtigt } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { kalendertagAusEingabe, berlinerZeitpunkt } from "@/lib/datum"
import { AufgabePrioritaet, AuftragStatus } from "@/generated/prisma/enums"
import { richTextSanitisieren } from "@/lib/rich-text"
import { benachrichtigungErstellen } from "@/lib/benachrichtigungen/erstellen"
import {
  auftragAnhaengePruefen,
  auftragAnhaengeSpeichern,
  auftragAnhangLoeschenIntern,
} from "@/lib/auftraege/anhaenge"

const MAX_CHECKPUNKTE = 30
const MAX_CHECKPUNKT_LAENGE = 200

type CheckpunktEingabe = { id: string | null; text: string }

/**
 * Checkliste aus dem Formular: parallele Felder `checkpunktId` (leer = neuer
 * Punkt) und `checkpunktText`, in der angezeigten Reihenfolge. Leere Texte
 * fallen weg, die Anzahl und Länge sind begrenzt.
 */
function checkpunkteAusFormData(formData: FormData): CheckpunktEingabe[] {
  const ids = formData.getAll("checkpunktId").map(String)
  return formData
    .getAll("checkpunktText")
    .map((text, index) => ({ id: ids[index] || null, text: String(text).trim().slice(0, MAX_CHECKPUNKT_LAENGE) }))
    .filter((eingabe) => eingabe.text)
    .slice(0, MAX_CHECKPUNKTE)
}

/**
 * Gleicht die Checkliste eines Auftrags mit der Eingabe ab: vorhandene Punkte
 * (nur solche, die wirklich zu DIESEM Auftrag gehören) behalten ihren
 * Abhak-Stand und bekommen höchstens neuen Text/neue Position, neue Punkte
 * werden angelegt, nicht mehr aufgeführte gelöscht.
 */
async function checkpunkteSpeichern(auftragId: string, eingaben: CheckpunktEingabe[]) {
  const vorhanden = await prisma.auftragCheckpunkt.findMany({ where: { auftragId }, select: { id: true } })
  const vorhandenIds = new Set(vorhanden.map((punkt) => punkt.id))
  const behalten = eingaben.flatMap((eingabe) => (eingabe.id && vorhandenIds.has(eingabe.id) ? [eingabe.id] : []))

  await prisma.$transaction([
    prisma.auftragCheckpunkt.deleteMany({ where: { auftragId, id: { notIn: behalten } } }),
    ...eingaben.map((eingabe, index) =>
      eingabe.id && vorhandenIds.has(eingabe.id)
        ? prisma.auftragCheckpunkt.update({ where: { id: eingabe.id }, data: { text: eingabe.text, reihenfolge: index } })
        : prisma.auftragCheckpunkt.create({ data: { auftragId, text: eingabe.text, reihenfolge: index } }),
    ),
  ])
}

/** Alle Empfänger eines Auftrags (bei Einzel-Aufträgen genau einer, sonst ggf. mehrere). */
async function empfaengerIdsVon(auftragId: string): Promise<string[]> {
  const zeilen = await prisma.auftragEmpfaenger.findMany({ where: { auftragId }, select: { personId: true } })
  return zeilen.map((zeile) => zeile.personId)
}

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
  // Mehrere Empfänger möglich (PersonenAuswahl mit mehrfach); doppelte Einträge fallen weg.
  const empfaengerIds = [...new Set(formData.getAll("zugewiesenAn").map(String).filter(Boolean))]
  // "Einzeln senden": jede Person bekommt ihre eigene Aufgabe; ohne Haken
  // arbeiten alle Empfänger gemeinsam an EINER Aufgabe (siehe auftragSpeichern).
  const einzeln = formData.get("einzeln") === "1"
  if (!entwurf && (!titel || empfaengerIds.length === 0)) {
    redirect("/aufgaben?fehler=pflichtfeld")
  }
  if (empfaengerIds.includes(personId)) {
    redirect("/aufgaben?fehler=selbstauftrag")
  }

  const beschreibung = richTextSanitisieren(String(formData.get("beschreibung") ?? "")) || null

  const faelligEingabe = String(formData.get("faelligAm") ?? "")
  const faelligAm = faelligEingabe ? kalendertagAusEingabe(faelligEingabe) : null
  if (faelligEingabe && !faelligAm) {
    redirect("/aufgaben?fehler=pflichtfeld")
  }

  // "Geplant für" — Datum-only wie faelligAm, kein datetime-local nötig.
  // Bis zu diesem Datum sieht die zugewiesene Person den Auftrag NICHT
  // (siehe Kommentar am Feld Auftrag.geplantAm), verwaltbar bis dahin nur
  // über /geplante-aktionen.
  const geplantEingabe = String(formData.get("geplantAm") ?? "")
  const jetzt = new Date()
  // Ab diesem Tag 00:00 Berliner Zeit sichtbar (echter Zeitpunkt, wird mit "jetzt" verglichen).
  const geplantAm = geplantEingabe ? berlinerZeitpunkt(geplantEingabe) : null
  if (geplantEingabe && !geplantAm) {
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

  const checkpunkte = checkpunkteAusFormData(formData)

  return { titel, empfaengerIds, einzeln, beschreibung, faelligAm, geplantAm, istGeplant, prioritaet, neueAnhaenge, checkpunkte }
}

/**
 * Legt einen Auftrag an ODER finalisiert einen vorhandenen Entwurf
 * (`entwurfId` gesetzt, siehe auftragEntwurfFinalisieren) — bei
 * `istEntwurf: false` bekommen die Empfänger hier zum ERSTEN Mal überhaupt
 * eine Benachrichtigung, ein Entwurf hatte sie ja rein privat gehalten.
 *
 * Mehrere Empfänger: Standard ist EIN gemeinsamer Auftrag, an dem alle
 * zusammen arbeiten (gemeinsamer Status und Checkliste). Mit `einzeln`
 * (Checkbox "An jede Person einzeln senden") entsteht stattdessen pro Person
 * ein eigener Auftrag mit eigenem Status, eigener Checkliste, eigenen
 * Kommentaren und einer eigenen Kopie der Anhänge. Ein Entwurf bleibt immer
 * ein einzelner Auftrag (die Einzeln-Wahl wird erst beim Zuweisen wirksam).
 * Beim Finalisieren eines Entwurfs wird dieser zum ersten der Aufträge.
 */
async function auftragSpeichern(
  kontext: { personId: string; name: string },
  felder: ReturnType<typeof auftragFelderLesenOderFehler>,
  istEntwurf: boolean,
  entwurfId?: string,
) {
  const empfaengerGruppen =
    !istEntwurf && felder.einzeln && felder.empfaengerIds.length > 1
      ? felder.empfaengerIds.map((id) => [id])
      : [felder.empfaengerIds]

  for (const [index, gruppe] of empfaengerGruppen.entries()) {
    const daten = {
      erstelltVonId: kontext.personId,
      titel: felder.titel || "Entwurf ohne Titel",
      beschreibung: felder.beschreibung,
      prioritaet: felder.prioritaet,
      faelligAm: felder.faelligAm,
      geplantAm: felder.geplantAm,
      istEntwurf,
    }
    const auftrag =
      entwurfId && index === 0
        ? await prisma.auftrag.update({ where: { id: entwurfId }, data: daten })
        : await prisma.auftrag.create({ data: daten })

    await prisma.$transaction([
      prisma.auftragEmpfaenger.deleteMany({ where: { auftragId: auftrag.id } }),
      prisma.auftragEmpfaenger.createMany({ data: gruppe.map((personId) => ({ auftragId: auftrag.id, personId })) }),
    ])

    if (felder.neueAnhaenge.length > 0) {
      await auftragAnhaengeSpeichern(auftrag.id, felder.neueAnhaenge)
    }
    // Bei Einzel-Aufträgen bekommen alle dieselbe Checkliste (neu, ohne ID).
    await checkpunkteSpeichern(
      auftrag.id,
      index === 0 ? felder.checkpunkte : felder.checkpunkte.map((punkt) => ({ ...punkt, id: null })),
    )

    // Bei "Geplant für" bekommen die Empfänger noch keine Benachrichtigung —
    // sie können den Auftrag ja noch gar nicht sehen (dieselbe Begründung
    // wie bei infoErstellen).
    if (!istEntwurf && !felder.istGeplant) {
      for (const personId of gruppe) {
        await benachrichtigungErstellen({
          personId,
          text: `${kontext.name} hat dir eine Aufgabe zugewiesen: "${felder.titel}"`,
          link: `/aufgaben?auftrag=${auftrag.id}`,
        })
      }
    }
  }

  revalidatePath("/")
  revalidatePath("/geplante-aktionen")
  redirect("/aufgaben")
}

/**
 * Legt einen Auftrag für eine ANDERE Person an — für die eigene Liste
 * gibt es Aufgabe (To-do), kein Selbstauftrag hier. Braucht die
 * Berechtigung "Aufgaben" (Rückmeldung 2026-09-23: Fremdzuweisen soll nur
 * bestimmten Mitarbeitenden möglich sein, Empfangen/Erledigen und die
 * eigene To-Do-Liste bleiben dagegen für jeden offen — deshalb NUR hier
 * und in den drei Funktionen darunter geprüft, nicht in
 * auftragAnnehmen/auftragErledigtSetzen/aufgaben/aktionen.ts).
 */
export async function auftragErstellen(formData: FormData) {
  const kontext = await berechtigung({ benoetigteBerechtigung: "Aufgaben" })
  const felder = auftragFelderLesenOderFehler(formData, kontext.personId, false)
  await auftragSpeichern(kontext, felder, false)
}

/**
 * Vervollständigt einen eigenen Entwurf (siehe auftragAlsEntwurfSpeichern)
 * zu einem echten Auftrag — dieselbe Pflichtprüfung wie beim frischen
 * Anlegen (Titel + Zuweisen). Nur die erstellende Person darf das, und
 * auch sie braucht weiterhin die Berechtigung "Aufgaben" (siehe
 * auftragErstellen) — falls sie zwischen Entwurf und Finalisieren entzogen
 * wurde, bleibt der Entwurf löschbar, aber nicht mehr versendbar.
 */
export async function auftragEntwurfFinalisieren(entwurfId: string, formData: FormData) {
  const kontext = await berechtigung({ benoetigteBerechtigung: "Aufgaben" })

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
 * Pflichtprüfungen von auftragErstellen, ohne Benachrichtigung, aber mit
 * derselben Berechtigung "Aufgaben" (siehe dort) — ein Entwurf ohne
 * Aussicht, ihn je zuweisen zu dürfen, wäre nur verwirrend. Für einen
 * bereits bestehenden Entwurf (erneutes Entwurf-Speichern beim "Weiter
 * bearbeiten") siehe auftragEntwurfAktualisieren — zwei getrennte
 * Funktionen statt eines optionalen führenden Parameters, weil Server
 * Actions als `<form action>`/`formAction` FormData immer als LETZTES
 * Argument nach gebundenen Parametern bekommen (siehe `.bind(null, id)`
 * überall sonst in diesem Projekt).
 */
export async function auftragAlsEntwurfSpeichern(formData: FormData) {
  const kontext = await berechtigung({ benoetigteBerechtigung: "Aufgaben" })
  const felder = auftragFelderLesenOderFehler(formData, kontext.personId, true)
  await auftragSpeichern(kontext, felder, true)
}

/** Speichert einen BEREITS BESTEHENDEN Entwurf erneut — siehe auftragAlsEntwurfSpeichern. */
export async function auftragEntwurfAktualisieren(entwurfId: string, formData: FormData) {
  const kontext = await berechtigung({ benoetigteBerechtigung: "Aufgaben" })

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
 * Inhalt eines bereits zugewiesenen Auftrags nachträglich ändern (Rückmeldung
 * 2026-10-05: im Pop-Up soll die erstellende Person bearbeiten können) —
 * Titel, Notizen, Fälligkeit, Priorität und neue Anhänge. Zuweisung und
 * "Geplant für" bleiben bewusst unveränderlich (wer den Auftrag bekommt,
 * ändert man nicht still im Nachhinein — dafür zurückziehen und neu
 * vergeben). Nur die erstellende Person; Entwürfe haben ihren eigenen Weg
 * (siehe auftragEntwurfAktualisieren). Die zugewiesene Person bekommt eine
 * Benachrichtigung, damit eine Änderung nicht unbemerkt bleibt.
 */
export async function auftragAktualisieren(auftragId: string, formData: FormData) {
  const kontext = await berechtigung()

  const auftrag = await prisma.auftrag.findUnique({ where: { id: auftragId } })
  if (!auftrag || auftrag.istEntwurf || auftrag.erstelltVonId !== kontext.personId) {
    throw new NichtBerechtigt("nur die erstellende Person darf den Auftrag ändern")
  }

  const titel = String(formData.get("titel") ?? "").trim()
  if (!titel) redirect("/aufgaben?fehler=pflichtfeld")

  const beschreibung = richTextSanitisieren(String(formData.get("beschreibung") ?? "")) || null

  const faelligEingabe = String(formData.get("faelligAm") ?? "")
  const faelligAm = faelligEingabe ? kalendertagAusEingabe(faelligEingabe) : null
  if (faelligEingabe && !faelligAm) redirect("/aufgaben?fehler=pflichtfeld")

  const prioritaetEingabe = String(formData.get("prioritaet") ?? "")
  const prioritaet = Object.values(AufgabePrioritaet).includes(prioritaetEingabe as AufgabePrioritaet)
    ? (prioritaetEingabe as AufgabePrioritaet)
    : auftrag.prioritaet

  const neueAnhaenge = anhaengeAusFormData(formData)
  const anhaengeFehler = auftragAnhaengePruefen(neueAnhaenge)
  if (anhaengeFehler) redirect(`/aufgaben?fehler=${anhaengeFehler}`)

  await prisma.auftrag.update({
    where: { id: auftragId },
    data: { titel, beschreibung, faelligAm, prioritaet },
  })
  if (neueAnhaenge.length > 0) {
    await auftragAnhaengeSpeichern(auftragId, neueAnhaenge)
  }
  await checkpunkteSpeichern(auftragId, checkpunkteAusFormData(formData))

  // Noch versteckt geplant: die Empfänger kennen den Auftrag noch nicht.
  const warNochVersteckt = auftrag.geplantAm !== null && auftrag.geplantAm > new Date()
  if (!warNochVersteckt) {
    for (const personId of await empfaengerIdsVon(auftragId)) {
      await benachrichtigungErstellen({
        personId,
        text: `${kontext.name} hat die Aufgabe "${titel}" geändert`,
        link: `/aufgaben?auftrag=${auftragId}`,
      })
    }
  }

  revalidatePath("/aufgaben")
  revalidatePath("/")
  revalidatePath("/geplante-aktionen")
}

/**
 * Einen Punkt der Checkliste abhaken oder wieder öffnen — nur die
 * Empfänger (sie machen die Arbeit, wie bei auftragErledigtSetzen; bei
 * mehreren Empfängern darf jeder von ihnen abhaken),
 * und nur solange die Aufgabe nicht erledigt ist (dafür erst wieder öffnen).
 * Abhaken ist schon vor dem Annehmen möglich, nimmt die Aufgabe aber nicht
 * stillschweigend an. Sind danach ALLE Punkte abgehakt, bekommt die
 * erstellende Person einen Hinweis; die Aufgabe selbst bleibt offen, bis die
 * zugewiesene Person sie bewusst erledigt.
 */
export async function auftragCheckpunktSetzen(checkpunktId: string, erledigt: boolean) {
  const kontext = await berechtigung()

  const punkt = await prisma.auftragCheckpunkt.findUnique({
    where: { id: checkpunktId },
    include: { auftrag: { select: { id: true, titel: true, status: true, erstelltVonId: true, istEntwurf: true } } },
  })
  const empfaenger = punkt ? await empfaengerIdsVon(punkt.auftragId) : []
  if (!punkt || punkt.auftrag.istEntwurf || !empfaenger.includes(kontext.personId)) {
    throw new NichtBerechtigt("nicht der eigene Auftrag")
  }
  if (punkt.auftrag.status === AuftragStatus.ERLEDIGT) {
    throw new NichtBerechtigt("Auftrag ist bereits erledigt")
  }

  await prisma.auftragCheckpunkt.update({
    where: { id: checkpunktId },
    data: { erledigtAm: erledigt ? new Date() : null },
  })

  if (erledigt) {
    const offen = await prisma.auftragCheckpunkt.count({ where: { auftragId: punkt.auftragId, erledigtAm: null } })
    if (offen === 0) {
      await benachrichtigungErstellen({
        personId: punkt.auftrag.erstelltVonId,
        text: `${kontext.name} hat alle Punkte von "${punkt.auftrag.titel}" abgehakt`,
        link: `/aufgaben?auftrag=${punkt.auftragId}`,
      })
    }
  }

  revalidatePath("/aufgaben")
}

/**
 * OFFEN → ANGENOMMEN — nur ein Empfänger, nur solange noch niemand
 * angenommen hat (bei mehreren Empfängern nimmt EINER für alle an). Erst danach lässt sich der Auftrag erledigen
 * (siehe auftragErledigtSetzen) — kein Überspringen dieses Schritts.
 */
export async function auftragAnnehmen(auftragId: string) {
  const kontext = await berechtigung()

  const auftrag = await prisma.auftrag.findUnique({ where: { id: auftragId } })
  if (!auftrag || !(await empfaengerIdsVon(auftragId)).includes(kontext.personId)) {
    throw new NichtBerechtigt("nicht der eigene Auftrag")
  }
  if (auftrag.status !== AuftragStatus.OFFEN) {
    throw new NichtBerechtigt("Auftrag ist nicht mehr offen")
  }

  await prisma.auftrag.update({ where: { id: auftragId }, data: { status: AuftragStatus.ANGENOMMEN } })

  await benachrichtigungErstellen({
    personId: auftrag.erstelltVonId,
    text: `${kontext.name} hat "${auftrag.titel}" angenommen`,
    link: `/aufgaben?auftrag=${auftragId}`,
  })

  revalidatePath("/aufgaben")
  revalidatePath("/")
}

/**
 * Erledigt-Umschalter — nur ein Empfänger darf abhaken (sie machen die
 * Arbeit, bei mehreren erledigt EINER für alle), nicht die erstellende. Erledigt ist erst ab
 * ANGENOMMEN erreichbar, "wieder öffnen" geht zurück auf ANGENOMMEN, nicht
 * auf OFFEN — ERLEDIGT setzt ja voraus, dass die Person schon angenommen
 * hatte. Benachrichtigt die erstellende Person beim Abhaken, damit sie
 * mitbekommt, dass sich was getan hat, ohne selbst nachschauen zu müssen.
 */
export async function auftragErledigtSetzen(auftragId: string, erledigt: boolean) {
  const kontext = await berechtigung()

  const auftrag = await prisma.auftrag.findUnique({ where: { id: auftragId } })
  if (!auftrag || !(await empfaengerIdsVon(auftragId)).includes(kontext.personId)) {
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
      link: `/aufgaben?auftrag=${auftragId}`,
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

  // Empfänger vor dem Löschen merken (die Verbindungszeilen verschwinden mit dem Auftrag).
  const empfaenger = await empfaengerIdsVon(auftragId)
  await prisma.auftrag.delete({ where: { id: auftragId } })

  // Ein Entwurf war nie sichtbar (siehe auftraegeFuerPerson) — die
  // zugewiesene Person (falls überhaupt schon gewählt) hat ihn nie zu
  // Gesicht bekommen, eine "zurückgezogen"-Benachrichtigung wäre nur
  // verwirrend. Dieselbe Begründung gilt für einen noch versteckt
  // geplanten Auftrag.
  const warNochVersteckt = auftrag.geplantAm !== null && auftrag.geplantAm > new Date()
  if (!auftrag.istEntwurf && !warNochVersteckt) {
    for (const personId of empfaenger) {
      await benachrichtigungErstellen({
        personId,
        text: `${kontext.name} hat die Aufgabe "${auftrag.titel}" zurückgezogen`,
      })
    }
  }

  revalidatePath("/aufgaben")
  revalidatePath("/")
  revalidatePath("/geplante-aktionen")
}

/** Anhänge entfernen (Ergänzen geht über auftragAktualisieren) — nur die erstellende Person. */
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
 * Kommentar zu einem Auftrag (früher "Rückfrage") — sichtbar für dieselben Personen wie der
 * Auftrag selbst (erstellende + zugewiesene Person), dasselbe Muster wie
 * terminKommentarErstellen beim Kalender. Benachrichtigt die jeweils
 * ANDERE der beiden Personen, nicht die kommentierende selbst.
 */
export async function auftragKommentarErstellen(auftragId: string, formData: FormData) {
  const kontext = await berechtigung()

  const auftrag = await prisma.auftrag.findUnique({ where: { id: auftragId } })
  const empfaenger = auftrag ? await empfaengerIdsVon(auftragId) : []
  const darfSehen = auftrag && (auftrag.erstelltVonId === kontext.personId || empfaenger.includes(kontext.personId))

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

  // Alle Beteiligten außer der kommentierenden Person erfahren davon: die
  // erstellende Person und alle Empfänger. Kommentare gibt es in der UI nur
  // bei echten (sichtbaren) Aufträgen, nie bei einem Entwurf.
  const beteiligte = new Set([auftrag.erstelltVonId, ...empfaenger])
  beteiligte.delete(kontext.personId)
  for (const personId of beteiligte) {
    await benachrichtigungErstellen({
      personId,
      text: `${kontext.name} hat zu "${auftrag.titel}" kommentiert`,
      link: `/aufgaben?auftrag=${auftragId}`,
    })
  }

  revalidatePath("/aufgaben")
}
