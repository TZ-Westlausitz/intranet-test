"use server"

import { randomUUID } from "node:crypto"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { berechtigung, NichtBerechtigt } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { TerminFarbe, TerminTeilnahmeStatus } from "@/generated/prisma/enums"
import { benachrichtigungErstellen } from "@/lib/benachrichtigungen/erstellen"
import { formatiereDatumAusDate, zeitAusDate, berlinerTagesbeginn } from "@/lib/datum"
import { richTextSanitisieren } from "@/lib/rich-text"
import { terminAnhaengePruefen, terminAnhaengeSpeichern, terminAnhaengeLoeschen } from "@/lib/termine/anhaenge"
import { naechsteWiederholung, type WiederholenTyp, type WiederholenEinheit } from "@/lib/termine/wiederholung"

/** Schutz gegen versehentliches Massenerzeugen (z. B. "täglich" über Jahre). */
const MAX_WIEDERHOLUNGEN = 200

function anhaengeAusFormData(formData: FormData): File[] {
  return formData.getAll("anhaenge").filter((wert): wert is File => wert instanceof File)
}

/** Rundet auf die nächste volle Viertelstunde auf (14:07 → 14:15, 14:15 bleibt 14:15). */
function naechsteViertelstundeAb(datum: Date): Date {
  const VIERTELSTUNDE_MS = 15 * 60 * 1000
  return new Date(Math.ceil(datum.getTime() / VIERTELSTUNDE_MS) * VIERTELSTUNDE_MS)
}

/**
 * Liest und prüft die gemeinsamen Formularfelder von Anlegen und
 * Bearbeiten. Bricht bei ungültiger Eingabe direkt per redirect() ab —
 * wie überall sonst in diesem Projekt (siehe z. B. fahrzeugAnfragen).
 *
 * "Ganztägig" liest ein Datums-Paar statt Datum+Uhrzeiten — für
 * mehrtägige Termine (Urlaub, Dienstreise). beginn/ende landen dann auf
 * Tagesanfang bzw. -ende, die Uhrzeit selbst ist ohne Bedeutung.
 *
 * `pruefeVergangenheit`: nur beim Anlegen (terminErstellen) — ein
 * bestehender, schon vergangener Termin muss weiter bearbeitbar bleiben
 * (z. B. um nachträglich einen Anhang zu ergänzen), nur ein NEUER Termin
 * darf nicht in der Vergangenheit starten. Bei nicht-ganztägigen Terminen
 * zusätzlich mit einer Viertelstunde Vorlauf (wer 14:07 öffnet, kann
 * frühestens auf 14:15 legen) — bei ganztägigen zählt nur der Kalendertag,
 * nicht die Uhrzeit (sonst wäre "heute" als ganztägiger Termin nie wählbar).
 *
 * Die neu hochgeladenen Anhänge werden hier schon geprüft (Größe/Typ),
 * aber noch nicht gespeichert — das braucht die Termin-ID, die es an
 * dieser Stelle beim Anlegen noch nicht gibt.
 */
function terminEingabenLesen(
  formData: FormData,
  kontext: { personId: string },
  rueckkehrPfad: string,
  pruefeVergangenheit: boolean,
) {
  const titel = String(formData.get("titel") ?? "").trim()
  const ganztaegig = formData.get("ganztaegig") === "on"
  const beschreibung = richTextSanitisieren(String(formData.get("beschreibung") ?? "")) || null
  const ort = String(formData.get("ort") ?? "").trim() || null
  const kommentareErlaubt = formData.get("kommentareErlaubt") === "on"
  const farbeEingabe = String(formData.get("farbe") ?? "")

  const anhaengeFehler = terminAnhaengePruefen(anhaengeAusFormData(formData))
  if (anhaengeFehler) {
    redirect(`${rueckkehrPfad}&fehler=${anhaengeFehler}`)
  }

  let beginn: Date
  let ende: Date

  if (ganztaegig) {
    const vonDatum = String(formData.get("vonDatum") ?? "")
    const bisDatum = String(formData.get("bisDatum") ?? "")
    if (!titel || !vonDatum || !bisDatum) {
      redirect(`${rueckkehrPfad}&fehler=pflichtfeld`)
    }
    beginn = new Date(`${vonDatum}T00:00:00`)
    ende = new Date(`${bisDatum}T23:59:59`)

    if (!Number.isNaN(beginn.getTime()) && !Number.isNaN(ende.getTime())) {
      const spanneTage = (ende.getTime() - beginn.getTime()) / 86_400_000
      if (spanneTage > 366) {
        redirect(`${rueckkehrPfad}&fehler=zuLang`)
      }
    }
  } else {
    const datum = String(formData.get("datum") ?? "")
    const von = String(formData.get("von") ?? "")
    const bis = String(formData.get("bis") ?? "")
    if (!titel || !datum || !von || !bis) {
      redirect(`${rueckkehrPfad}&fehler=pflichtfeld`)
    }
    beginn = new Date(`${datum}T${von}:00`)
    ende = new Date(`${datum}T${bis}:00`)
  }

  if (Number.isNaN(beginn.getTime()) || Number.isNaN(ende.getTime()) || ende < beginn) {
    redirect(`${rueckkehrPfad}&fehler=zeitraum`)
  }

  if (pruefeVergangenheit) {
    const jetzt = new Date()
    const zuFrueh = ganztaegig ? beginn < berlinerTagesbeginn(jetzt) : beginn < naechsteViertelstundeAb(jetzt)
    if (zuFrueh) {
      redirect(`${rueckkehrPfad}&fehler=vergangenheit`)
    }
  }

  const farbe = Object.values(TerminFarbe).includes(farbeEingabe as TerminFarbe)
    ? (farbeEingabe as TerminFarbe)
    : TerminFarbe.DUNKELGRUEN

  const teilnehmerIds = [...new Set(formData.getAll("teilnehmer").map(String))].filter(
    (id) => id !== kontext.personId,
  )
  const erinnerungenMinuten = formData
    .getAll("erinnerung")
    .map((wert) => Number.parseInt(String(wert), 10))
    .filter((wert) => Number.isInteger(wert) && wert >= 0)

  return {
    titel,
    beschreibung,
    ort,
    kommentareErlaubt,
    beginn,
    ende,
    ganztaegig,
    farbe,
    teilnehmerIds,
    erinnerungenMinuten,
  }
}

function rueckkehrPfadAus(formData: FormData): string {
  const jahr = String(formData.get("rueckkehrJahr") ?? "")
  const monat = String(formData.get("rueckkehrMonat") ?? "")
  return `/kalender?jahr=${jahr}&monat=${monat}`
}

const WIEDERHOLEN_TYPEN: WiederholenTyp[] = [
  "taeglich",
  "woechentlich",
  "monatlichTag",
  "monatlichWochentag",
  "jaehrlich",
  "werktage",
  "benutzerdefiniert",
]

/**
 * Legt einen eigenen Termin an. Sichtbar nur für die erstellende Person
 * und die eingeladenen Teilnehmenden (siehe Kommentar am Model Termin) —
 * kein öffentlicher Firmenkalender.
 *
 * Erinnerungen: nur der gewünschte Zeitpunkt wird gespeichert
 * (TerminErinnerung.minutenVorher). Angezeigt wird eine fällige Erinnerung
 * beim nächsten Seitenaufruf, kein Hintergrundjob und kein E-Mail-Versand.
 *
 * Wiederholen: erzeugt die komplette Serie hier EINMALIG als eigenständige
 * Termine mit gemeinsamer `serieId` — es gibt keine gespeicherte
 * Wiederholungsregel, die zur Laufzeit ausgewertet wird (siehe Kommentar
 * am Model Termin). Jede Zeile ist danach ein ganz normaler Termin.
 *
 * Anhänge landen ausschließlich auf dem ERSTEN Termin einer Serie — eine
 * Datei "für die ganze Serie" gibt es im Datenmodell nicht (TerminAnhang
 * gehört zu genau einem Termin), und jede Zeile einer Serie ist ohnehin
 * einzeln bearbeitbar, falls später weitere dazukommen sollen.
 */
export async function terminErstellen(formData: FormData) {
  const kontext = await berechtigung()
  const rueckkehrPfad = rueckkehrPfadAus(formData)
  const { teilnehmerIds, erinnerungenMinuten, beginn, ende, ...felder } = terminEingabenLesen(
    formData,
    kontext,
    rueckkehrPfad,
    true,
  )

  const wiederholenEingabe = String(formData.get("wiederholen") ?? "nein")
  const wiederholen = WIEDERHOLEN_TYPEN.includes(wiederholenEingabe as WiederholenTyp)
    ? (wiederholenEingabe as WiederholenTyp)
    : null
  const unbefristet = formData.get("wiederholenUnbefristet") === "on"
  const wiederholenBisEingabe = String(formData.get("wiederholenBis") ?? "")
  const wiederholenBis = !unbefristet && wiederholenBisEingabe ? new Date(`${wiederholenBisEingabe}T23:59:59`) : null

  const intervallEingabe = Number.parseInt(String(formData.get("wiederholenIntervall") ?? "1"), 10)
  const benutzerdefiniert = {
    intervall: Number.isInteger(intervallEingabe) && intervallEingabe > 0 ? intervallEingabe : 1,
    einheit: (["tag", "woche", "monat", "jahr"] as WiederholenEinheit[]).includes(
      formData.get("wiederholenEinheit") as WiederholenEinheit,
    )
      ? (formData.get("wiederholenEinheit") as WiederholenEinheit)
      : "woche",
  }

  const zeitraeume: { beginn: Date; ende: Date }[] = [{ beginn, ende }]

  // "Unbefristet" heißt hier: bis zur technischen Obergrenze statt bis zu
  // einem echten Enddatum — eine Serie, die sich niemals von selbst
  // erschöpft, gibt es nicht (keine gespeicherte Wiederholungsregel, siehe
  // Kommentar am Model Termin). 200 Termine reichen für praktisch jeden
  // wiederkehrenden Fall (z. B. 200 Wochen ≈ fast 4 Jahre) — wer mehr
  // braucht, legt die Serie später einfach erneut an.
  if (wiederholen && (unbefristet || wiederholenBis)) {
    const dauerMs = ende.getTime() - beginn.getTime()
    let naechsterBeginn = naechsteWiederholung(beginn, beginn, wiederholen, benutzerdefiniert)

    while ((unbefristet || naechsterBeginn <= wiederholenBis!) && zeitraeume.length < MAX_WIEDERHOLUNGEN) {
      zeitraeume.push({ beginn: naechsterBeginn, ende: new Date(naechsterBeginn.getTime() + dauerMs) })
      naechsterBeginn = naechsteWiederholung(naechsterBeginn, beginn, wiederholen, benutzerdefiniert)
    }
  }

  const serieId = zeitraeume.length > 1 ? randomUUID() : null

  const erstellteTermine = await prisma.$transaction(
    zeitraeume.map(({ beginn, ende }) =>
      prisma.termin.create({
        data: {
          ...felder,
          beginn,
          ende,
          serieId,
          erstelltVonId: kontext.personId,
          teilnehmer: { create: teilnehmerIds.map((personId) => ({ personId })) },
          erinnerungen: { create: erinnerungenMinuten.map((minutenVorher) => ({ minutenVorher })) },
        },
      }),
    ),
  )

  const neueAnhaenge = anhaengeAusFormData(formData)
  if (neueAnhaenge.length > 0) {
    await terminAnhaengeSpeichern(erstellteTermine[0].id, neueAnhaenge, kontext.personId)
  }

  revalidatePath("/kalender")
  revalidatePath("/")
  redirect(rueckkehrPfad)
}

/**
 * Bearbeiten ist ausschließlich der erstellenden Person vorbehalten — ein
 * ausgeblendetes Zahnrad in der Anzeige ist keine Zugriffskontrolle
 * (Regel 5), deshalb die Prüfung hier unabhängig davon noch einmal.
 *
 * Wirkt immer nur auf diesen einen Termin, nie auf die ganze Serie (siehe
 * terminSerieLoeschen für "ganze Serie") — jede Zeile einer Wiederholung
 * ist ein eigenständiger Termin.
 */
export async function terminAktualisieren(terminId: string, formData: FormData) {
  const kontext = await berechtigung()

  const termin = await prisma.termin.findUnique({ where: { id: terminId }, include: { teilnehmer: true } })
  if (!termin || termin.erstelltVonId !== kontext.personId) {
    throw new NichtBerechtigt("nur die erstellende Person darf den Termin bearbeiten")
  }

  const rueckkehrPfad = rueckkehrPfadAus(formData)
  // Keine Vergangenheits-Prüfung beim Bearbeiten: ein bereits vergangener
  // Termin muss weiter bearbeitbar bleiben (z. B. nachträglich ein Foto
  // ergänzen) — siehe Kommentar an terminEingabenLesen.
  const { teilnehmerIds, erinnerungenMinuten, ...felder } = terminEingabenLesen(
    formData,
    kontext,
    rueckkehrPfad,
    false,
  )

  // Teilnehmer per Upsert statt Löschen+Neuanlegen: Wer schon zu-/abgesagt
  // hatte, soll das beim Bearbeiten (z. B. nur die Uhrzeit ändern) nicht
  // verlieren. Nur wer aus der Liste rausfällt, wird wirklich entfernt.
  await prisma.$transaction([
    prisma.terminTeilnehmer.deleteMany({ where: { terminId, personId: { notIn: teilnehmerIds } } }),
    ...teilnehmerIds.map((personId) =>
      prisma.terminTeilnehmer.upsert({
        where: { terminId_personId: { terminId, personId } },
        update: {},
        create: { terminId, personId },
      }),
    ),
    prisma.terminErinnerung.deleteMany({ where: { terminId } }),
    ...erinnerungenMinuten.map((minutenVorher) =>
      prisma.terminErinnerung.create({ data: { terminId, minutenVorher } }),
    ),
    prisma.termin.update({ where: { id: terminId }, data: felder }),
  ])

  const zuLoeschendeAnhaenge = formData.getAll("anhaengeLoeschen").map(String)
  await terminAnhaengeLoeschen(terminId, zuLoeschendeAnhaenge)

  const neueAnhaenge = anhaengeAusFormData(formData)
  if (neueAnhaenge.length > 0) {
    await terminAnhaengeSpeichern(terminId, neueAnhaenge, kontext.personId)
  }

  // "Verschoben" heißt hier ausdrücklich Datum/Uhrzeit — nicht jede
  // Bearbeitung (z. B. nur die Notiz ändern) soll alle Teilnehmenden
  // benachrichtigen.
  const zeitVerschoben =
    felder.beginn.getTime() !== termin.beginn.getTime() || felder.ende.getTime() !== termin.ende.getTime()

  if (zeitVerschoben) {
    const neueZeit = felder.ganztaegig
      ? `${formatiereDatumAusDate(felder.beginn)} – ${formatiereDatumAusDate(felder.ende)} (ganztägig)`
      : `${formatiereDatumAusDate(felder.beginn)}, ${zeitAusDate(felder.beginn)}–${zeitAusDate(felder.ende)} Uhr`
    for (const personId of teilnehmerIds) {
      await benachrichtigungErstellen({
        personId,
        text: `${kontext.name} hat "${felder.titel}" auf ${neueZeit} verschoben`,
        link: "/kalender",
      })
    }
  }

  revalidatePath("/kalender")
  revalidatePath("/")
  redirect(rueckkehrPfad)
}

/**
 * Löschen ist wie Bearbeiten ausschließlich der erstellenden Person
 * vorbehalten. Append-only (Regel 2 CLAUDE.md) gilt hier nicht — das
 * betrifft nur Vereinbarung/Uebergabeprotokoll, keine Kalender-Termine.
 * Löscht nur diesen einen Termin, auch wenn er Teil einer Serie ist.
 */
export async function terminLoeschen(terminId: string, formData: FormData) {
  const kontext = await berechtigung()

  const termin = await prisma.termin.findUnique({ where: { id: terminId }, include: { teilnehmer: true } })
  if (!termin || termin.erstelltVonId !== kontext.personId) {
    throw new NichtBerechtigt("nur die erstellende Person darf den Termin löschen")
  }

  const rueckkehrPfad = rueckkehrPfadAus(formData)

  await prisma.termin.delete({ where: { id: terminId } })

  for (const teilnehmer of termin.teilnehmer) {
    await benachrichtigungErstellen({
      personId: teilnehmer.personId,
      text: `${kontext.name} hat den Termin "${termin.titel}" gelöscht`,
    })
  }

  revalidatePath("/kalender")
  revalidatePath("/")
  redirect(rueckkehrPfad)
}

/**
 * Löscht alle Termine einer wiederkehrenden Serie auf einmal. Eine
 * gesammelte Benachrichtigung pro betroffener Person statt einer pro
 * Termin — sonst bekäme jemand bei einer 52-wöchigen Serie 52 einzelne
 * Meldungen für ein und dasselbe Löschen.
 */
export async function terminSerieLoeschen(serieId: string, formData: FormData) {
  const kontext = await berechtigung()

  const termine = await prisma.termin.findMany({ where: { serieId }, include: { teilnehmer: true } })
  if (termine.length === 0) {
    return
  }
  if (termine.some((t) => t.erstelltVonId !== kontext.personId)) {
    throw new NichtBerechtigt("nur die erstellende Person darf die Serie löschen")
  }

  const rueckkehrPfad = rueckkehrPfadAus(formData)
  const titel = termine[0].titel

  const betroffenePersonen = new Set(termine.flatMap((t) => t.teilnehmer.map((x) => x.personId)))

  await prisma.termin.deleteMany({ where: { serieId } })

  for (const personId of betroffenePersonen) {
    await benachrichtigungErstellen({
      personId,
      text: `${kontext.name} hat die Terminserie "${titel}" gelöscht`,
    })
  }

  revalidatePath("/kalender")
  revalidatePath("/")
  redirect(rueckkehrPfad)
}

/**
 * Löscht diesen Termin und alle SPÄTEREN Termine derselben Serie — anders
 * als terminSerieLoeschen bleiben bereits vergangene bzw. frühere Termine
 * der Serie im Kalender stehen, z. B. zur Dokumentation/Nachverfolgung,
 * wenn eine Reihe vorzeitig endet. Wie terminSerieLoeschen eine gesammelte
 * Benachrichtigung pro betroffener Person statt einer pro Termin.
 */
export async function terminSerieAbHierLoeschen(terminId: string, formData: FormData) {
  const kontext = await berechtigung()

  const ausgangsTermin = await prisma.termin.findUnique({ where: { id: terminId } })
  if (!ausgangsTermin || ausgangsTermin.erstelltVonId !== kontext.personId) {
    throw new NichtBerechtigt("nur die erstellende Person darf die Serie löschen")
  }
  if (!ausgangsTermin.serieId) {
    throw new NichtBerechtigt("dieser Termin ist Teil keiner Serie")
  }

  const termine = await prisma.termin.findMany({
    where: { serieId: ausgangsTermin.serieId, beginn: { gte: ausgangsTermin.beginn } },
    include: { teilnehmer: true },
  })

  const rueckkehrPfad = rueckkehrPfadAus(formData)
  const titel = ausgangsTermin.titel

  const betroffenePersonen = new Set(termine.flatMap((t) => t.teilnehmer.map((x) => x.personId)))

  await prisma.termin.deleteMany({
    where: { serieId: ausgangsTermin.serieId, beginn: { gte: ausgangsTermin.beginn } },
  })

  for (const personId of betroffenePersonen) {
    await benachrichtigungErstellen({
      personId,
      text: `${kontext.name} hat "${titel}" ab dem ${formatiereDatumAusDate(ausgangsTermin.beginn)} nicht mehr wiederholt (spätere Termine der Serie gelöscht)`,
    })
  }

  revalidatePath("/kalender")
  revalidatePath("/")
  redirect(rueckkehrPfad)
}

/**
 * Zu-/Absage einer eingeladenen Person — nur die eingeladene Person selbst
 * darf ihren eigenen Status setzen. Benachrichtigt die erstellende Person,
 * damit sie mitbekommt, dass sich etwas getan hat, ohne den Termin selbst
 * jedes Mal neu öffnen zu müssen.
 */
export async function terminTeilnahmeAntworten(terminId: string, status: TerminTeilnahmeStatus) {
  const kontext = await berechtigung()

  const teilnahme = await prisma.terminTeilnehmer.findUnique({
    where: { terminId_personId: { terminId, personId: kontext.personId } },
    include: { termin: true },
  })
  if (!teilnahme) {
    throw new NichtBerechtigt("nicht zu diesem Termin eingeladen")
  }

  await prisma.terminTeilnehmer.update({
    where: { terminId_personId: { terminId, personId: kontext.personId } },
    data: { status },
  })

  await benachrichtigungErstellen({
    personId: teilnahme.termin.erstelltVonId,
    text: `${kontext.name} hat "${teilnahme.termin.titel}" ${status === TerminTeilnahmeStatus.ZUGESAGT ? "zugesagt" : "abgesagt"}`,
    link: "/kalender",
  })

  revalidatePath("/kalender")
  revalidatePath("/", "layout")
}

/**
 * Rückfrage zu einem Termin — sichtbar für dieselben Personen wie der
 * Termin selbst (siehe `sichtbarFuer` in termine/abfragen.ts), abschaltbar
 * über Termin.kommentareErlaubt. Benachrichtigt alle anderen Beteiligten
 * (erstellende Person + übrige Teilnehmende), nicht die kommentierende
 * Person selbst.
 */
export async function terminKommentarErstellen(terminId: string, formData: FormData) {
  const kontext = await berechtigung()

  const termin = await prisma.termin.findUnique({ where: { id: terminId }, include: { teilnehmer: true } })
  const darfSehen =
    termin &&
    (termin.erstelltVonId === kontext.personId || termin.teilnehmer.some((t) => t.personId === kontext.personId))

  if (!termin || !darfSehen) {
    throw new NichtBerechtigt("Termin nicht sichtbar")
  }
  if (!termin.kommentareErlaubt) {
    throw new NichtBerechtigt("Kommentare sind für diesen Termin deaktiviert")
  }

  const neueAnhaenge = anhaengeAusFormData(formData)
  const anhaengeFehler = terminAnhaengePruefen(neueAnhaenge)
  if (anhaengeFehler) {
    redirect(`${rueckkehrPfadAus(formData)}&fehler=${anhaengeFehler}`)
  }

  const text = String(formData.get("text") ?? "").trim()
  if (!text) return

  const kommentar = await prisma.terminKommentar.create({ data: { terminId, personId: kontext.personId, text } })

  if (neueAnhaenge.length > 0) {
    await terminAnhaengeSpeichern(terminId, neueAnhaenge, kontext.personId, kommentar.id)
  }

  const empfaengerIds = new Set(
    [termin.erstelltVonId, ...termin.teilnehmer.map((t) => t.personId)].filter((id) => id !== kontext.personId),
  )
  for (const personId of empfaengerIds) {
    await benachrichtigungErstellen({
      personId,
      text: `${kontext.name} hat zu "${termin.titel}" kommentiert`,
      link: "/kalender",
    })
  }

  revalidatePath("/kalender")
  revalidatePath("/", "layout")
}
