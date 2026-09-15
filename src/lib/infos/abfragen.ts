import type { Prisma } from "@/generated/prisma/client"

import { prisma } from "@/lib/db"
import {
  infoSichtbarFuer,
  infoVeroeffentlichtFuer,
  infoEmpfaengerIds,
  istInfoEmpfaenger,
  darfInfoBearbeiten,
  darfInfoLoeschen,
} from "@/lib/infos/sichtbarkeit"

/** Anzeigename, wenn Info.alsUnternehmen gesetzt ist (siehe Kommentar am Model Info). */
export const UNTERNEHMENSNAME = "Therapie- und Pflegezentrum"

type InfoKontext = { personId: string; berechtigungen: string[]; adminModusAktiv: boolean }

async function bestaetigungsstand(infoId: string, mitBestaetigung: boolean) {
  if (!mitBestaetigung) return { empfaengerAnzahl: 0, bestaetigtAnzahl: 0 }
  const [empfaengerIds, bestaetigtAnzahl] = await Promise.all([
    infoEmpfaengerIds(infoId),
    prisma.infoBestaetigung.count({ where: { infoId } }),
  ])
  return { empfaengerAnzahl: empfaengerIds.length, bestaetigtAnzahl }
}

/**
 * Ergebnis einer Umfrage — Prozent bezieht sich auf die Zahl der
 * TEILNEHMENDEN Personen, nicht auf die Summe aller abgegebenen Stimmen
 * (bleibt dadurch auch bei Mehrfachauswahl sinnvoll interpretierbar: "60 %
 * haben X gewählt", nicht "60 % aller abgegebenen Kreuze"). Liefert nie
 * eine Personenliste — Rückmeldung vom 2026-09-08: Ergebnis immer
 * sichtbar, aber nie WER wie abgestimmt hat.
 */
async function umfrageErgebnis(umfrageId: string, personId: string) {
  const [umfrage, teilnehmer] = await Promise.all([
    prisma.infoUmfrage.findUnique({
      where: { id: umfrageId },
      include: {
        optionen: {
          orderBy: { reihenfolge: "asc" },
          include: {
            _count: { select: { stimmen: true } },
            stimmen: { where: { personId }, select: { id: true } },
          },
        },
      },
    }),
    prisma.infoUmfrageStimme.findMany({
      where: { option: { umfrageId } },
      select: { personId: true },
      distinct: ["personId"],
    }),
  ])
  if (!umfrage) return null
  const teilnehmerAnzahl = teilnehmer.length
  return {
    id: umfrage.id,
    frage: umfrage.frage,
    mehrfachauswahl: umfrage.mehrfachauswahl,
    teilnehmerAnzahl,
    optionen: umfrage.optionen.map((option) => ({
      id: option.id,
      text: option.text,
      stimmenAnzahl: option._count.stimmen,
      selbstGewaehlt: option.stimmen.length > 0,
      prozent: teilnehmerAnzahl > 0 ? Math.round((option._count.stimmen / teilnehmerAnzahl) * 100) : 0,
    })),
  }
}

export type Titelbild = { src: string; breite: number | null; hoehe: number | null }

/**
 * Erstes Bild im Inhalt, egal an welcher Stelle — für die Vorschau-Karten
 * im Feed und auf der Startseite: Titel, dann darunter in voller Breite
 * ENTWEDER dieses Bild ODER ein Textauszug, nie beides nebeneinander
 * (Vorbild Altsystem "Überblick", Rückmeldung vom 2026-09-07). Vorher war
 * das nur ein "Titelbild", wenn der Inhalt direkt mit einem Bild begann —
 * dadurch sahen Karten mit einem Bild weiter unten im Artikel (weiterhin
 * als Text erkannt, das Bild lief einfach im Fließtext mit) uneinheitlich
 * aus. Die Detailansicht im Pop-up ist davon unberührt, dort steht ein
 * Bild weiterhin an seiner echten Stelle im Artikel. Breite/Höhe kommen
 * mit, damit die Vorschau das Bild in seinem echten Seitenverhältnis
 * zeigen kann — siehe Kommentar an Info.inhalt zu den echten
 * width/height-Attributen aus RichTextEditor/Bild.
 */
export function ersteBildInfo(inhalt: string | null): Titelbild | null {
  if (!inhalt) return null
  const treffer = inhalt.match(/<img\b([^>]*)>/i)
  if (!treffer) return null
  const attribute = treffer[1]
  const src = attribute.match(/\bsrc="([^"]+)"/i)?.[1]
  if (!src) return null
  const breite = attribute.match(/\bwidth="(\d+)"/i)?.[1]
  const hoehe = attribute.match(/\bheight="(\d+)"/i)?.[1]
  return { src, breite: breite ? Number(breite) : null, hoehe: hoehe ? Number(hoehe) : null }
}

/**
 * Gemeinsamer Kern von `infosFuerPerson` und `alleInfos` (Admin-Modus) —
 * unterscheiden sich nur im `where`, Anreicherung (Bestätigungsstand,
 * Umfrageergebnis, Bearbeiten/Löschen-Flags) ist identisch.
 */
async function infosMitWhere(where: Prisma.InfoWhereInput, kontext: InfoKontext) {
  const jetzt = new Date()
  const infos = await prisma.info.findMany({
    where,
    include: {
      kategorie: { select: { name: true } },
      erstelltVon: { select: { benutzername: true, vorname: true, nachname: true, profilbildPfad: true } },
      bestaetigungen: { where: { personId: kontext.personId }, select: { id: true } },
      likes: { where: { personId: kontext.personId }, select: { id: true } },
      umfrage: { select: { id: true } },
      _count: { select: { kommentare: true, likes: true } },
      // Volle Anhang-Liste statt nur eines Zählers — wird für einen
      // Bearbeiten-Dialog direkt aus dem Feed gebraucht (bestehende
      // Anhänge dort entfernen können, wie auf der Detailseite auch).
      anhaenge: {
        where: { kommentarId: null, eingebettet: false },
        select: { id: true, dateiname: true, groesseBytes: true, mimetyp: true },
      },
      // Nur für den Bearbeiten-Dialog gebraucht (Vorbefüllung der
      // Empfänger-Auswahl) — leichtgewichtige ID-only-Selects, kein
      // spürbarer Zusatzaufwand auch wenn darfBearbeiten für diese Person
      // false ist.
      empfaengerPersonen: { select: { personId: true } },
      empfaengerGruppen: { select: { gruppeId: true } },
      empfaengerAbteilungen: { select: { abteilungId: true } },
    },
    orderBy: { veroeffentlichtAm: "desc" },
  })

  return Promise.all(
    infos.map(async (info) => ({
      ...info,
      selbstBestaetigt: info.bestaetigungen.length > 0,
      likeAnzahl: info._count.likes,
      selbstGeliked: info.likes.length > 0,
      darfBearbeiten: darfInfoBearbeiten(info, kontext),
      darfLoeschen: darfInfoLoeschen(kontext),
      titelbild: ersteBildInfo(info.inhalt),
      nochNichtVeroeffentlicht: info.veroeffentlichtAm > jetzt,
      umfrage: info.umfrage ? await umfrageErgebnis(info.umfrage.id, kontext.personId) : null,
      // Ohne Admin-Modus ist `where` oben schon infoSichtbarFuer — jeder
      // Treffer damit zwangsläufig ein echter Empfänger, keine
      // Zusatzabfrage nötig. Nur im Admin-Modus (wo `where` firmenweit
      // ohne diese Einschränkung ist) tatsächlich prüfen — für das
      // Ausblenden von Liken/Bestätigen/Kommentieren bei Infos, die nur
      // über den Admin-Modus sichtbar sind (Rückmeldung vom 2026-09-14).
      istEmpfaenger: kontext.adminModusAktiv ? await istInfoEmpfaenger(info.id, kontext.personId) : true,
      ...(await bestaetigungsstand(info.id, info.mitBestaetigung)),
    })),
  )
}

/** Chronologischer Feed (neueste zuerst) — nur für diese Person sichtbare Infos, siehe infoSichtbarFuer. */
export async function infosFuerPerson(kontext: InfoKontext) {
  return infosMitWhere(infoSichtbarFuer(kontext.personId), kontext)
}

/**
 * Admin-Modus (siehe Kontext.adminModusAktiv): derselbe chronologische
 * Feed, aber jede veröffentlichte Info firmenweit statt nur die eigenen
 * Empfänger-Gruppen/-Abteilungen/-Personen — siehe infoVeroeffentlichtFuer.
 */
export async function alleInfos(kontext: InfoKontext) {
  return infosMitWhere(infoVeroeffentlichtFuer(kontext.personId), kontext)
}

/**
 * Eigene, unfertige Entwürfe (siehe infoAlsEntwurfSpeichern) — bewusst
 * NICHT über `infoSichtbarFuer` (die schließt Entwürfe ja gerade aus),
 * sondern direkt nach `erstelltVonId` gefiltert: rein privat, für
 * "Entwürfe anzeigen" neben "+ Info".
 */
export async function eigeneInfoEntwuerfe(personId: string) {
  return prisma.info.findMany({
    where: { erstelltVonId: personId, istEntwurf: true },
    include: {
      anhaenge: {
        where: { kommentarId: null, eingebettet: false },
        select: { id: true, dateiname: true, groesseBytes: true, mimetyp: true },
      },
      empfaengerPersonen: { select: { personId: true } },
      empfaengerGruppen: { select: { gruppeId: true } },
      empfaengerAbteilungen: { select: { abteilungId: true } },
    },
    orderBy: { erstelltAm: "desc" },
  })
}

/** Volle Detailansicht — `null`, wenn die Info für diese Person nicht sichtbar ist. */
export async function infoDetailFuerPerson(infoId: string, kontext: InfoKontext) {
  const jetzt = new Date()
  // Admin-Modus (siehe Kontext.adminModusAktiv): dieselbe firmenweite
  // Sicht wie in alleInfos — sonst ließ sich eine Info, die nur über den
  // Admin-Modus in der Liste auftaucht (nicht direkt an diese Person
  // adressiert), zwar anklicken, das Pop-up blieb aber für immer bei
  // "Lädt …" hängen, weil infoSichtbarFuer sie für das Detail ablehnte
  // (Rückmeldung vom 2026-09-14).
  const sichtbarkeit = kontext.adminModusAktiv ? infoVeroeffentlichtFuer(kontext.personId) : infoSichtbarFuer(kontext.personId)
  const info = await prisma.info.findFirst({
    where: { id: infoId, ...sichtbarkeit },
    include: {
      kategorie: { select: { name: true } },
      erstelltVon: { select: { benutzername: true, vorname: true, nachname: true, profilbildPfad: true } },
      anhaenge: {
        where: { kommentarId: null, eingebettet: false },
        select: { id: true, dateiname: true, groesseBytes: true, mimetyp: true },
      },
      kommentare: {
        orderBy: { erstelltAm: "asc" },
        include: {
          person: { select: { vorname: true, nachname: true } },
          anhaenge: { select: { id: true, dateiname: true, groesseBytes: true, mimetyp: true } },
        },
      },
      bestaetigungen: { where: { personId: kontext.personId }, select: { id: true } },
      likes: { where: { personId: kontext.personId }, select: { id: true } },
      umfrage: { select: { id: true } },
      _count: { select: { likes: true } },
      empfaengerPersonen: { select: { personId: true } },
      empfaengerGruppen: { select: { gruppeId: true } },
      empfaengerAbteilungen: { select: { abteilungId: true } },
    },
  })
  if (!info) return null

  return {
    ...info,
    selbstBestaetigt: info.bestaetigungen.length > 0,
    likeAnzahl: info._count.likes,
    selbstGeliked: info.likes.length > 0,
    darfBearbeiten: darfInfoBearbeiten(info, kontext),
    darfLoeschen: darfInfoLoeschen(kontext),
    // Siehe Kommentar in infosMitWhere: nur im Admin-Modus tatsächlich
    // prüfen, sonst durch die strengere where-Klausel oben schon
    // garantiert ein echter Empfänger.
    istEmpfaenger: kontext.adminModusAktiv ? await istInfoEmpfaenger(infoId, kontext.personId) : true,
    nochNichtVeroeffentlicht: info.veroeffentlichtAm > jetzt,
    umfrage: info.umfrage ? await umfrageErgebnis(info.umfrage.id, kontext.personId) : null,
    ...(await bestaetigungsstand(info.id, info.mitBestaetigung)),
  }
}

/** Für das Kachel-Badge auf der Startseite: Infos mit Bestätigungspflicht, die diese Person noch nicht bestätigt hat. */
export async function offeneBestaetigungenAnzahl(personId: string): Promise<number> {
  return prisma.info.count({
    where: {
      mitBestaetigung: true,
      bestaetigungen: { none: { personId } },
      ...infoSichtbarFuer(personId),
    },
  })
}

/**
 * Für die Kalenderansicht "Geplante Aktionen" — NUR die eigenen Infos, bei
 * denen jemals ein Veröffentlichungstermin gesetzt wurde (`geplantAm`
 * bleibt auch nach dem automatischen Veröffentlichen gespeichert, siehe
 * Kommentar am Feld) und deren `veroeffentlichtAm` in den Zeitraum fällt —
 * zeigt damit sowohl noch ausstehende als auch bereits veröffentlichte
 * geplante Infos, genau wie der Termin-Kalender auch vergangene Termine
 * zeigt. Kein `infoSichtbarFuer` nötig: hier zählt nur "von mir erstellt",
 * nicht Empfängerschaft.
 */
export async function infosGeplantFuerZeitraum(kontext: InfoKontext, von: Date, bis: Date) {
  const infos = await prisma.info.findMany({
    where: {
      erstelltVonId: kontext.personId,
      geplantAm: { not: null },
      veroeffentlichtAm: { gte: von, lte: bis },
    },
    include: {
      anhaenge: {
        where: { kommentarId: null, eingebettet: false },
        select: { id: true, dateiname: true, groesseBytes: true, mimetyp: true },
      },
      empfaengerPersonen: { select: { personId: true } },
      empfaengerGruppen: { select: { gruppeId: true } },
      empfaengerAbteilungen: { select: { abteilungId: true } },
    },
    orderBy: { veroeffentlichtAm: "asc" },
  })
  const jetzt = new Date()
  return infos.map((info) => ({
    ...info,
    nochNichtVeroeffentlicht: info.veroeffentlichtAm > jetzt,
    darfBearbeiten: darfInfoBearbeiten(info, kontext),
    darfLoeschen: darfInfoLoeschen(kontext),
  }))
}

/**
 * Für die Startseiten-Kachel "Geplante Aktionen" — die nächsten NOCH
 * ausstehenden geplanten Infos. Unabhängig von infosGeplantFuerZeitraum
 * (die ist monatsgebunden und zeigt vergangene+zukünftige Einträge) — hier
 * reicht ein schlanker "nur die nächsten N" ohne Zeitraumgrenze.
 */
export async function naechsteGeplantInfos(personId: string, limit: number) {
  const jetzt = new Date()
  return prisma.info.findMany({
    where: { erstelltVonId: personId, geplantAm: { not: null }, veroeffentlichtAm: { gt: jetzt } },
    orderBy: { veroeffentlichtAm: "asc" },
    take: limit,
    select: { id: true, titel: true, veroeffentlichtAm: true },
  })
}
