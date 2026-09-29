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
      ort: { select: { id: true, name: true } },
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
      ort: { select: { id: true, name: true } },
      halter: { select: { benutzername: true, vorname: true, nachname: true, aktiv: true } },
      schaeden: {
        include: { gemeldetVon: { select: { vorname: true, nachname: true } } },
        orderBy: [{ festgestelltAm: "desc" }],
      },
    },
  })
  if (!fahrzeug) return null
  if (!darfAlleSehen && fahrzeug.halterId !== kontext.personId) return null

  const [protokollSchaeden, ausleihen, terminvorschlaege] = await Promise.all([
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
    prisma.fahrzeugterminvorschlag.findMany({
      where: { fahrzeugId },
      include: {
        vorgeschlagenVon: { select: { vorname: true, nachname: true } },
        empfaenger: { select: { vorname: true, nachname: true } },
      },
      orderBy: { datum: "desc" },
    }),
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
    // Offen (VORGESCHLAGEN): für Werkstatt und Halter sichtbar, damit die
    // Entscheidung nicht verloren geht, falls die Benachrichtigung
    // übersehen oder das Pop-up weggeklickt wurde.
    offeneTerminvorschlaege: terminvorschlaege.filter((v) => v.status === "VORGESCHLAGEN"),
    // Historie (ERLEDIGT): "letzter TÜV/Service/Reifenwechsel" — je Art nur
    // der jüngste, weil genau danach gefragt wird (siehe Kommentar am Model).
    terminHistorie: (["TUEV", "SERVICE", "REIFENWECHSEL"] as const).map((art) => ({
      art,
      letzter: terminvorschlaege.find((v) => v.art === art && v.status === "ERLEDIGT") ?? null,
    })),
  }
}

/**
 * Aktive Orte für die Standort-Auswahl — im Adminbereich unter /admin/orte
 * frei pflegbar (Model Ort), bewusst NICHT die fünf festen Standorte
 * (Rückmeldung 2026-09-29): mehr Freiheit bei der Zuordnung, ohne dafür
 * Code ändern zu müssen. Dient sowohl dem Fahrzeug-Formular als auch dem
 * Standort-Filter über der Fuhrpark-Liste.
 */
export async function fuhrparkOrte() {
  return prisma.ort.findMany({ where: { aktiv: true }, orderBy: { name: "asc" }, select: { id: true, name: true } })
}

/** Auswahllisten für das Fahrzeug-Formular (Standort, Halter). */
export async function fuhrparkFormularOptionen() {
  const [orte, personen] = await Promise.all([
    fuhrparkOrte(),
    prisma.person.findMany({
      where: { aktiv: true },
      orderBy: [{ nachname: "asc" }, { vorname: "asc" }],
      select: { benutzername: true, vorname: true, nachname: true },
    }),
  ])
  return {
    orte,
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
 * zu sehen, und wenn ja, wie soll der Menüpunkt heißen und wohin soll er
 * führen? Wer alle Fahrzeuge sehen darf (Werkstatt, Lesende), bekommt
 * "Fuhrpark" → die Liste. Wer nur als Halter eingetragen ist, aber keine
 * der beiden Berechtigungen hat, bekommt stattdessen "Mein Fahrzeug" — bei
 * genau einem Fahrzeug direkt dessen Profil, bei mehreren die (dann
 * automatisch auf die eigenen gefilterte) Liste. Wer nichts von beidem hat,
 * bekommt gar keinen Menüpunkt (`zugang: false`).
 */
export async function fuhrparkNavigation(kontext: FuhrparkKontext) {
  const { darfAlleSehen } = fuhrparkRechte(kontext)
  const grenze = new Date(berlinerTagesbeginn().getTime() + FRIST_BALD_TAGE * 24 * 60 * 60 * 1000)

  if (darfAlleSehen) {
    const warnungen = await fuhrparkFristenWarnungen(kontext, grenze)
    return { zugang: true, warnungen, label: "Fuhrpark", href: "/fuhrpark" }
  }

  const eigene = await prisma.fahrzeug.findMany({
    where: { aktiv: true, halterId: kontext.personId },
    select: { id: true, huFaelligAm: true, serviceFaelligAm: true },
  })
  if (eigene.length === 0) return { zugang: false, warnungen: 0, label: "Fuhrpark", href: "/fuhrpark" }

  const warnungen = eigene.filter(
    (f) => (f.huFaelligAm && f.huFaelligAm <= grenze) || (f.serviceFaelligAm && f.serviceFaelligAm <= grenze),
  ).length
  return {
    zugang: true,
    warnungen,
    label: "Mein Fahrzeug",
    href: eigene.length === 1 ? `/fuhrpark/${eigene[0].id}` : "/fuhrpark",
  }
}
