import { prisma } from "@/lib/db"
import type { Kontext } from "@/lib/auth/berechtigung"
import { berlinerTagesbeginn } from "@/lib/datum"
import { FRIST_BALD_TAGE } from "./fristen"
import { fuhrparkRechte } from "./zugriff"

type FuhrparkKontext = Pick<Kontext, "personId" | "berechtigungen">

/**
 * Fahrzeugliste des Fuhrparks. Wer alle Fahrzeuge sehen darf (Werkstatt,
 * Lesende), bekommt alle aktiven; jede andere Person nur die, bei denen sie
 * als Halter/Verantwortliche eingetragen ist. Ausgemusterte Fahrzeuge
 * (`aktiv: false`) bleiben ausgeblendet.
 */
export async function fuhrparkFahrzeuge(kontext: FuhrparkKontext) {
  const { darfAlleSehen } = fuhrparkRechte(kontext)
  return prisma.fahrzeug.findMany({
    where: { aktiv: true, ...(darfAlleSehen ? {} : { halterId: kontext.personId }) },
    include: {
      standort: { select: { name: true } },
      halter: { select: { vorname: true, nachname: true } },
      _count: { select: { schaeden: { where: { behobenAm: null } } } },
    },
    orderBy: [{ bezeichnung: "asc" }, { kennzeichen: "asc" }],
  })
}

/**
 * Ein Fahrzeug mit allem, was das Profil zeigt — oder `null`, wenn es das
 * Fahrzeug nicht gibt ODER diese Person es nicht sehen darf (kein Unterschied
 * nach außen, damit sich nicht erraten lässt, welche Fahrzeuge existieren).
 *
 * Der Mietverlauf enthält Namen der Entleihenden und ist deshalb nur für
 * Personen mit "alle Fahrzeuge sehen" gedacht; ein Halter sieht sein
 * Fahrzeug, aber nicht, wer es privat ausgeliehen hatte. Die Schäden aus
 * Übergabeprotokollen (Model Schaden) bekommen alle Berechtigten, aber nur
 * die Werkstatt mit Verweis auf die Ausleihe.
 */
export async function fahrzeugProfil(kontext: FuhrparkKontext, fahrzeugId: string) {
  const { darfAlleSehen, darfBearbeiten } = fuhrparkRechte(kontext)

  const fahrzeug = await prisma.fahrzeug.findUnique({
    where: { id: fahrzeugId },
    include: {
      standort: { select: { id: true, name: true } },
      halter: { select: { benutzername: true, vorname: true, nachname: true, aktiv: true } },
      schaeden: {
        include: { gemeldetVon: { select: { vorname: true, nachname: true } } },
        orderBy: [{ festgestelltAm: "desc" }],
      },
    },
  })
  if (!fahrzeug) return null
  if (!darfAlleSehen && fahrzeug.halterId !== kontext.personId) return null

  const [protokollSchaeden, ausleihen] = await Promise.all([
    prisma.schaden.findMany({
      where: { protokoll: { ausleihe: { fahrzeugId } } },
      include: {
        protokoll: {
          select: { richtung: true, zeitpunkt: true, ausleihe: { select: { id: true, vorgangsnummer: true } } },
        },
      },
      orderBy: { protokoll: { zeitpunkt: "desc" } },
    }),
    darfAlleSehen
      ? prisma.ausleihe.findMany({
          where: { fahrzeugId, status: { notIn: ["ABGELEHNT", "STORNIERT"] } },
          include: { entleiher: { select: { vorname: true, nachname: true } } },
          orderBy: { geplantVon: "desc" },
        })
      : Promise.resolve([]),
  ])

  return {
    fahrzeug,
    ausleihen,
    darfMietverlaufSehen: darfAlleSehen,
    protokollSchaeden: protokollSchaeden.map((s) => ({
      id: s.id,
      position: s.position,
      beschreibung: s.beschreibung,
      zeitpunkt: s.protokoll.zeitpunkt,
      richtung: s.protokoll.richtung,
      neuAufgefallen: s.neuAufgefallen,
      // Verweis auf die Ausleihe nur für die Werkstatt — sie darf den Vorgang öffnen.
      ausleiheId: darfBearbeiten ? s.protokoll.ausleihe.id : null,
      vorgangsnummer: darfBearbeiten ? s.protokoll.ausleihe.vorgangsnummer : null,
    })),
  }
}

/** Auswahllisten für das Fahrzeug-Formular (Standort, Halter). */
export async function fuhrparkFormularOptionen() {
  const [standorte, personen] = await Promise.all([
    prisma.standort.findMany({ where: { aktiv: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.person.findMany({
      where: { aktiv: true },
      orderBy: [{ nachname: "asc" }, { vorname: "asc" }],
      select: { benutzername: true, vorname: true, nachname: true },
    }),
  ])
  return {
    standorte,
    personen: personen.map((p) => ({ id: p.benutzername, name: `${p.vorname} ${p.nachname}` })),
  }
}

/**
 * Für das Badge/den Hinweis auf der Startseite und im Menü: wie viele
 * Fahrzeuge dieser Person haben eine überfällige oder bald fällige Frist.
 * Nur Fahrzeuge, die diese Person laut `fuhrparkFahrzeuge` sehen darf.
 */
export async function fuhrparkFristenWarnungen(kontext: FuhrparkKontext, grenze: Date): Promise<number> {
  const { darfAlleSehen } = fuhrparkRechte(kontext)
  return prisma.fahrzeug.count({
    where: {
      aktiv: true,
      ...(darfAlleSehen ? {} : { halterId: kontext.personId }),
      OR: [{ huFaelligAm: { lte: grenze } }, { serviceFaelligAm: { lte: grenze } }],
    },
  })
}

/**
 * Für die Navigation: gibt es für diese Person überhaupt etwas im Fuhrpark
 * zu sehen (alle Fahrzeuge oder mindestens ein eigenes), und wie viele ihrer
 * sichtbaren Fahrzeuge haben eine überfällige oder bald fällige Frist.
 * Wer nichts sehen darf, bekommt den Menüpunkt gar nicht erst angezeigt.
 */
export async function fuhrparkNavigation(kontext: FuhrparkKontext) {
  const { darfAlleSehen } = fuhrparkRechte(kontext)
  const grenze = new Date(berlinerTagesbeginn().getTime() + FRIST_BALD_TAGE * 24 * 60 * 60 * 1000)

  const [warnungen, eigene] = await Promise.all([
    fuhrparkFristenWarnungen(kontext, grenze),
    darfAlleSehen ? Promise.resolve(1) : prisma.fahrzeug.count({ where: { aktiv: true, halterId: kontext.personId } }),
  ])
  return { zugang: darfAlleSehen || eigene > 0, warnungen }
}
