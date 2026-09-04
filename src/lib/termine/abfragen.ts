import { prisma } from "@/lib/db"
import { Prisma } from "@/generated/prisma/client"
import { TERMIN_ERINNERUNGEN } from "@/lib/termin-optionen"
import { MAX_SUCHTREFFER } from "@/lib/termine/konstanten"

/** Größte Erinnerungs-Vorlaufzeit aus den auswählbaren Optionen — mehr als
 * das kann nie "fällig" sein, deshalb reicht das als Suchfenster. */
const MAX_ERINNERUNG_MINUTEN = Math.max(...TERMIN_ERINNERUNGEN.map((e) => e.minuten))

/** Ein Termin ist sichtbar für die erstellende Person und alle Eingeladenen. */
function sichtbarFuer(personId: string): Prisma.TerminWhereInput {
  return {
    OR: [{ erstelltVonId: personId }, { teilnehmer: { some: { personId } } }],
  }
}

/** Geteilt zwischen Zeitraum-Abfrage und Suche, damit beide dieselbe Anzeige-Grundlage liefern. */
const TERMIN_INCLUDE = {
  erinnerungen: true,
  erstelltVon: { select: { vorname: true, nachname: true } },
  teilnehmer: { include: { person: { select: { vorname: true, nachname: true } } } },
  anhaenge: {
    where: { kommentarId: null },
    select: { id: true, dateiname: true, groesseBytes: true, mimetyp: true },
    orderBy: { hochgeladenAm: "asc" },
  },
  kommentare: {
    include: {
      person: { select: { vorname: true, nachname: true } },
      anhaenge: {
        select: { id: true, dateiname: true, groesseBytes: true, mimetyp: true },
        orderBy: { hochgeladenAm: "asc" },
      },
    },
    orderBy: { erstelltAm: "asc" },
  },
} satisfies Prisma.TerminInclude

export async function termineFuerZeitraum(personId: string, von: Date, bis: Date) {
  return prisma.termin.findMany({
    where: {
      ...sichtbarFuer(personId),
      beginn: { lte: bis },
      ende: { gte: von },
    },
    include: TERMIN_INCLUDE,
    orderBy: { beginn: "asc" },
  })
}

/**
 * Volltextsuche über Titel, Notizen und die Namen aller Beteiligten
 * (erstellende Person + Teilnehmende) — eine einzelne Suchleiste statt
 * mehrerer Filterfelder wie im alten "Überblick" (Ort/Kategorie/Sichtbar
 * für gibt es in diesem Datenmodell so nicht: kein öffentlicher Kalender,
 * keine Kategorien). Anders als `termineFuerZeitraum` NICHT auf ein
 * Zeitfenster begrenzt — eine Suche soll auch länger zurückliegende
 * Termine finden, nicht nur die gerade angezeigten Monate.
 */
export async function termineSuchen(personId: string, suchtext: string) {
  const text = suchtext.trim()
  if (!text) return []

  const namensTreffer: Prisma.PersonWhereInput = {
    OR: [{ vorname: { contains: text, mode: "insensitive" } }, { nachname: { contains: text, mode: "insensitive" } }],
  }

  return prisma.termin.findMany({
    where: {
      ...sichtbarFuer(personId),
      OR: [
        { titel: { contains: text, mode: "insensitive" } },
        { beschreibung: { contains: text, mode: "insensitive" } },
        { erstelltVon: namensTreffer },
        { teilnehmer: { some: { person: namensTreffer } } },
      ],
    },
    include: TERMIN_INCLUDE,
    orderBy: { beginn: "desc" },
    take: MAX_SUCHTREFFER,
  })
}

export async function naechsterTermin(personId: string, ab: Date = new Date()) {
  return prisma.termin.findFirst({
    where: {
      ...sichtbarFuer(personId),
      ende: { gte: ab },
    },
    include: { erinnerungen: true },
    orderBy: { beginn: "asc" },
  })
}

/**
 * Erinnerung "fällig": mindestens ein eingestellter Vorlauf ist erreicht,
 * der Termin läuft aber noch nicht — reine Berechnung beim Seitenaufruf,
 * kein Hintergrundjob, keine gespeicherte "gesehen"-Markierung.
 */
export function erinnerungFaellig(
  termin: { beginn: Date; ende: Date; erinnerungen: { minutenVorher: number }[] },
  jetzt: Date = new Date(),
): boolean {
  if (jetzt >= termin.ende) return false
  return termin.erinnerungen.some((e) => {
    const schwelle = new Date(termin.beginn.getTime() - e.minutenVorher * 60_000)
    return jetzt >= schwelle
  })
}

/**
 * Zählt, bei wie vielen Terminen gerade eine Erinnerung fällig ist — für
 * das einheitliche Hinweiszeichen (Kreis mit Zahl), das auch die
 * Fahrzeug-Kachel für offene Anfragen verwendet. Nur Termine bis zur
 * größten Erinnerungs-Vorlaufzeit ab jetzt kommen überhaupt infrage,
 * weiter in der Zukunft liegende können noch nicht fällig sein.
 */
export async function faelligeErinnerungenAnzahl(personId: string, jetzt: Date = new Date()): Promise<number> {
  const grenze = new Date(jetzt.getTime() + MAX_ERINNERUNG_MINUTEN * 60_000)

  const termine = await prisma.termin.findMany({
    where: {
      ...sichtbarFuer(personId),
      beginn: { lte: grenze },
      ende: { gte: jetzt },
    },
    include: { erinnerungen: true },
  })

  return termine.filter((termin) => erinnerungFaellig(termin, jetzt)).length
}
