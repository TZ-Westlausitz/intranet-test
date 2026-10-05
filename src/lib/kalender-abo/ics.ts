import { datumIsoAusDate } from "@/lib/datum"

/** Text für ein ICS-Feld: Backslash, Semikolon, Komma und Zeilenumbrüche müssen maskiert werden (RFC 5545). */
export function icsText(text: string): string {
  return text.replaceAll("\\", "\\\\").replaceAll(";", "\\;").replaceAll(",", "\\,").replace(/\r?\n/g, "\\n")
}

/**
 * Zeilen dürfen höchstens 75 Byte lang sein; längere werden mit
 * Zeilenumbruch + Leerzeichen fortgesetzt. Gerechnet wird in Byte, nicht in
 * Zeichen (Umlaute), und nie mitten in einem Zeichen getrennt.
 */
export function icsFalten(zeile: string): string {
  const teile: string[] = []
  let aktuell = ""
  let bytes = 0
  let limit = 75
  for (const zeichen of zeile) {
    const laenge = Buffer.byteLength(zeichen, "utf8")
    if (bytes + laenge > limit) {
      teile.push(aktuell)
      aktuell = ""
      bytes = 0
      limit = 74 // Fortsetzungszeile beginnt mit einem Leerzeichen
    }
    aktuell += zeichen
    bytes += laenge
  }
  teile.push(aktuell)
  return teile.join("\r\n ")
}

/** "20261006T070000Z" */
function utcZeitpunkt(datum: Date): string {
  return datum.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
}

/** "2026-10-06" → "20261006" */
function datumOhneStriche(iso: string): string {
  return iso.replaceAll("-", "")
}

/** Folgetag eines ISO-Datums — für das (exklusive) Ende ganztägiger Termine. */
function folgetagIso(iso: string): string {
  const [jahr, monat, tag] = iso.split("-").map(Number)
  return new Date(Date.UTC(jahr, monat - 1, tag + 1)).toISOString().slice(0, 10)
}

export type FeedTermin = {
  id: string
  titel: string
  ort: string | null
  beginn: Date
  ende: Date
  ganztaegig: boolean
  /** Nur beim Einzel-Export gesetzt (Klartext), im Abo-Feed nie. */
  beschreibung?: string | null
  /** Nur beim Einzel-Export: Erinnerungen als Minuten vor Beginn. */
  erinnerungenMinuten?: number[]
}

/** "-P1D", "-PT2H" oder "-PT45M" — die kürzeste gültige Schreibweise für "so lange vorher". */
function alarmAusloeser(minuten: number): string {
  if (minuten % 1440 === 0) return `-P${minuten / 1440}D`
  if (minuten % 60 === 0) return `-PT${minuten / 60}H`
  return `-PT${minuten}M`
}

/**
 * Baut den Kalender-Feed. Der Abo-Feed enthält bewusst NUR Titel, Zeit und
 * Ort — keine Beschreibung, keine Teilnehmenden, keine Kommentare: Der Link
 * kann in fremden Kalender-Apps landen, und Termine können Inhalte
 * enthalten, die nicht dorthin gehören. Der Verweis zurück ins Intranet
 * (URL) braucht ohnehin eine Anmeldung.
 *
 * `einzeln`: der Export eines einzelnen Termins aus dem Termin-Pop-Up. Hier
 * lädt die angemeldete Person selbst eine Datei herunter — deshalb dürfen
 * zusätzlich Beschreibung und Erinnerungen mitgehen (siehe FeedTermin).
 */
export function kalenderFeedBauen(
  termine: FeedTermin[],
  basisUrl: string,
  optionen: { einzeln?: boolean; jetzt?: Date } = {},
): string {
  const jetzt = optionen.jetzt ?? new Date()
  const zeilen: string[] = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TPZ Westlausitz//Intranet//DE", "CALSCALE:GREGORIAN"]
  if (!optionen.einzeln) {
    // Abo: Name des Kalenders und Hinweis an die Kalender-App, wie oft sie nachladen soll
    // (wird nicht von jeder beachtet). Beim Einzel-Export bewusst weggelassen, sonst legen
    // manche Apps einen neuen Kalender an, statt den Termin einzutragen.
    zeilen.push(
      "METHOD:PUBLISH",
      "X-WR-CALNAME:Intranet TPZ Westlausitz",
      "X-WR-TIMEZONE:Europe/Berlin",
      "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
      "X-PUBLISHED-TTL:PT1H",
    )
  }

  for (const termin of termine) {
    zeilen.push("BEGIN:VEVENT", `UID:${termin.id}@intranet-tpz`, `DTSTAMP:${utcZeitpunkt(jetzt)}`)

    if (termin.ganztaegig) {
      // Ganztägige Termine werden als "<von>T00:00:00" und "<bis>T23:59:59" in
      // der Zeitzone des Servers gespeichert (siehe terminEingabenLesen). Das
      // Ende liegt damit auf UTC-Seite immer am richtigen Kalendertag (auch
      // auf Vercel, wo "23:59:59" UTC in Berlin schon der Folgetag wäre); der
      // Anfang dagegen ist in Berlin immer am richtigen Tag.
      const von = datumIsoAusDate(termin.beginn)
      const bis = termin.ende.toISOString().slice(0, 10)
      zeilen.push(`DTSTART;VALUE=DATE:${datumOhneStriche(von)}`, `DTEND;VALUE=DATE:${datumOhneStriche(folgetagIso(bis >= von ? bis : von))}`)
    } else {
      zeilen.push(`DTSTART:${utcZeitpunkt(termin.beginn)}`, `DTEND:${utcZeitpunkt(termin.ende)}`)
    }

    zeilen.push(`SUMMARY:${icsText(termin.titel)}`)
    if (termin.ort) zeilen.push(`LOCATION:${icsText(termin.ort)}`)
    if (termin.beschreibung) zeilen.push(`DESCRIPTION:${icsText(termin.beschreibung)}`)
    zeilen.push(`URL:${basisUrl}/kalender?termin=${termin.id}`)
    for (const minuten of termin.erinnerungenMinuten ?? []) {
      zeilen.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsText(termin.titel)}`, `TRIGGER:${alarmAusloeser(minuten)}`, "END:VALARM")
    }
    zeilen.push("END:VEVENT")
  }

  zeilen.push("END:VCALENDAR")
  return zeilen.map(icsFalten).join("\r\n") + "\r\n"
}
