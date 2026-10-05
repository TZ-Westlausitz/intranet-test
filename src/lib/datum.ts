/**
 * Zerlegt ein Date in seine Kalender-/Uhrzeit-Bestandteile IN
 * EUROPE/BERLIN — nie in der Zeitzone der ausführenden Umgebung.
 *
 * Der Grund, warum es diese Funktion überhaupt braucht: `Date.getDate()`,
 * `getHours()` & Co. liefern die Bestandteile in der Zeitzone des
 * JS-RUNTIME, nicht in einer festen Zeitzone — auf dem eigenen Mac (meist
 * Europe/Berlin) unauffällig richtig, auf Vercel (Node-Runtime läuft in
 * UTC) plötzlich bis zu zwei Stunden daneben. Genau das ist am 2026-09-17
 * so aufgefallen: derselbe Newsfeed-Beitrag zeigte auf der Live-Seite eine
 * andere Uhrzeit als lokal, UND in `NewsfeedHomeKachel` (Client Component,
 * formatiert dieselbe Uhrzeit ein zweites Mal beim Hydrieren im Browser —
 * der dort in Europe/Berlin läuft) zusätzlich einen React-Hydration-Fehler
 * (#418), weil Server- und Client-Rendering unterschiedlichen Text
 * ergaben. `Intl.DateTimeFormat` mit explizitem `timeZone` liefert
 * dagegen überall dasselbe Ergebnis, unabhängig davon, wo der Code läuft.
 */
export function teileInBerlinerZeit(datum: Date) {
  const formatierer = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  const teile = Object.fromEntries(formatierer.formatToParts(datum).map((teil) => [teil.type, teil.value]))
  // Mitternacht liefert bei manchen ICU-Implementierungen "24" statt "00" für hour12:false.
  const stunde = teile.hour === "24" ? "00" : teile.hour
  return { jahr: teile.year, monat: teile.month, tag: teile.day, stunde, minute: teile.minute }
}

/** "2026-11-20" → "20.11.2026". Für Datumsfelder aus `<input type="date">`. */
export function formatiereDatum(iso: string): string {
  if (!iso) return ""
  const [jahr, monat, tag] = iso.split("-")
  return `${tag}.${monat}.${jahr}`
}

/**
 * Heutiges Datum als "2026-11-20" — als Defaultwert für
 * `<input type="date">`. Ohne den sieht das Feld leer aus, zeigt aber je
 * nach Browser das heutige Datum nur als graue Platzhalter-Anzeige, kein
 * echter Wert — required schlägt dann beim Absenden fehl, obwohl es so
 * aussieht, als stünde schon ein Datum drin.
 */
export function heutigesDatumIso(): string {
  const { jahr, monat, tag } = teileInBerlinerZeit(new Date())
  return `${jahr}-${monat}-${tag}`
}

/**
 * Datum als "2026-11-20T00:00" — als Defaultwert für
 * `<input type="datetime-local">`, wenn ein bestimmter Tag (nicht "jetzt")
 * eingesetzt werden soll, z.B. der Ausleihe-Beginn beim ersten Anlegen des
 * Übergabeprotokolls.
 */
export function datumUmMitternachtFuerDatumUhrzeitFeld(datum: Date): string {
  const { jahr, monat, tag } = teileInBerlinerZeit(datum)
  return `${jahr}-${monat}-${tag}T00:00`
}

/** "2026-08-27T14:30" → "27.08.2026, 14:30 Uhr". Für die Anzeige im PDF-Text. */
export function formatiereDatumUhrzeit(eingabe: string): string {
  const [datumTeil, uhrzeitTeil] = eingabe.split("T")
  if (!datumTeil) return ""
  return `${formatiereDatum(datumTeil)}${uhrzeitTeil ? ", " + uhrzeitTeil + " Uhr" : ""}`
}

/**
 * Date-Objekt → "27.08.2026" — wie formatiereDatum, aber wenn kein
 * <input type="date">-String zur Hand ist, sondern schon ein Date (z. B.
 * beim Zusammenbauen von "Ort, Datum" für eine Unterschrift).
 */
export function formatiereDatumAusDate(datum: Date): string {
  const { jahr, monat, tag } = teileInBerlinerZeit(datum)
  return `${tag}.${monat}.${jahr}`
}

/** Date-Objekt → "2026-09-03" — wie heutigesDatumIso, aber für ein beliebiges Date. */
export function datumIsoAusDate(datum: Date): string {
  const { jahr, monat, tag } = teileInBerlinerZeit(datum)
  return `${jahr}-${monat}-${tag}`
}

/**
 * Abstand Berlin → UTC an diesem Zeitpunkt in Millisekunden (Winter +1 h,
 * Sommer +2 h), per `Intl` — unabhängig von der Zeitzone des Servers.
 */
function berlinerVersatzMs(zeitpunktMs: number): number {
  const teile = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Berlin",
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    })
      .formatToParts(new Date(zeitpunktMs))
      .map((teil) => [teil.type, Number(teil.value)]),
  )
  const wandUhrAlsUtc = Date.UTC(teile.year, teile.month - 1, teile.day, teile.hour, teile.minute, teile.second)
  return wandUhrAlsUtc - Math.floor(zeitpunktMs / 1000) * 1000
}

/**
 * Berliner Wanduhrzeit → echter Zeitpunkt ("2026-10-17" + "09:00" ist 09:00
 * in Berlin, egal wo der Server läuft). Für Eingaben aus Formularen: ein
 * `new Date("2026-10-17T09:00:00")` ohne Zeitzone liest den Text in der
 * Zeitzone der AUSFÜHRENDEN Umgebung — auf Vercel (UTC) wäre das 09:00 UTC
 * und damit in Berlin 11:00. `null` bei ungültigem Datum oder ungültiger Zeit.
 */
export function berlinerZeitpunkt(datumIso: string, zeit = "00:00:00"): Date | null {
  const datum = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datumIso.trim())
  const uhr = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(zeit.trim())
  if (!datum || !uhr) return null

  const [jahr, monat, tag] = [Number(datum[1]), Number(datum[2]), Number(datum[3])]
  const [stunde, minute, sekunde] = [Number(uhr[1]), Number(uhr[2]), Number(uhr[3] ?? 0)]
  const wandUhrAlsUtc = Date.UTC(jahr, monat - 1, tag, stunde, minute, sekunde)

  // Wurde z. B. der 31.04. zum 01.05. umgerechnet oder die Uhrzeit überlaufen, war die Eingabe ungültig.
  const probe = new Date(wandUhrAlsUtc)
  if (probe.getUTCFullYear() !== jahr || probe.getUTCMonth() !== monat - 1 || probe.getUTCDate() !== tag) return null
  if (stunde > 23 || minute > 59 || sekunde > 59) return null

  // Zweimal nähern: der Versatz hängt selbst vom Zeitpunkt ab (Sommer-/Winterzeit-Wechsel).
  const ersterVersuch = wandUhrAlsUtc - berlinerVersatzMs(wandUhrAlsUtc)
  return new Date(wandUhrAlsUtc - berlinerVersatzMs(ersterVersuch))
}

/**
 * Wert eines `<input type="datetime-local">` ("2026-10-17T14:30", optional mit
 * Sekunden) als Berliner Wanduhrzeit → echter Zeitpunkt. Ein
 * `new Date("2026-10-17T14:30")` läse ihn in der Serverzeitzone (auf Vercel
 * UTC: 1–2 Stunden verschoben). `null` bei ungültigem Wert.
 */
export function berlinerZeitpunktAusDatumUhrzeit(wert: string): Date | null {
  const [datum, zeit] = wert.trim().split("T")
  return datum && zeit ? berlinerZeitpunkt(datum, zeit) : null
}

/** Wie `berlinerZeitpunktAusDatumUhrzeit`, aber ohne `null`: bei unerwartetem Format der übliche `new Date(wert)` (ggf. "Invalid Date") — für bereits gespeicherte Protokoll-Entwürfe. */
export function zeitpunktAusEingabe(wert: string): Date {
  return berlinerZeitpunktAusDatumUhrzeit(wert) ?? new Date(wert)
}

/** "2026-11-30" → Kalendertag als UTC-Mitternacht (Konvention dieser Datei); leer/ungültig → null. */
export function kalendertagAusEingabe(wert: FormDataEntryValue | null): Date | null {
  const text = String(wert ?? "").trim()
  const treffer = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (!treffer) return null
  const [jahr, monat, tag] = [Number(treffer[1]), Number(treffer[2]), Number(treffer[3])]
  const datum = new Date(Date.UTC(jahr, monat - 1, tag))
  // Überlauf (z. B. 31.04. → 01.05. oder Monat 13) heißt: ungültige Eingabe.
  if (datum.getUTCFullYear() !== jahr || datum.getUTCMonth() !== monat - 1 || datum.getUTCDate() !== tag) return null
  return datum
}

/** Date-Objekt → "14:05" — für <input type="time">-Defaultwerte aus einem vorhandenen Date. */
export function zeitAusDate(datum: Date): string {
  const { stunde, minute } = teileInBerlinerZeit(datum)
  return `${stunde}:${minute}`
}

/**
 * Date-Objekt → "2026-09-15T14:00" — wie
 * datumUmMitternachtFuerDatumUhrzeitFeld, aber mit der echten Uhrzeit
 * statt fix T00:00 (z. B. für den Defaultwert von Info.geplantAm im
 * Bearbeiten-Dialog eines noch nicht veröffentlichten Entwurfs).
 */
export function datumUhrzeitFuerDatumUhrzeitFeld(datum: Date): string {
  const { jahr, monat, tag, stunde, minute } = teileInBerlinerZeit(datum)
  return `${jahr}-${monat}-${tag}T${stunde}:${minute}`
}

/**
 * Ein beliebiger Zeitpunkt → Mitternacht DESSELBEN KALENDERTAGS IN
 * EUROPE/BERLIN, verlässlich vergleichbar per `.getTime()` — unabhängig
 * davon, in welcher Zeitzone der Code gerade läuft. Ohne `datum` = "heute".
 *
 * Wichtig: das Ergebnis ist NICHT die tatsächliche Instant-Mitternacht in
 * Berlin (die läge, je nach Sommer-/Winterzeit, 1–2 Stunden vor UTC-
 * Mitternacht) — sondern UTC-Mitternacht DESSELBEN Kalendertags. Für
 * Tagesvergleiche (überfällig? derselbe Tag? wie viele Tage dazwischen?)
 * ist genau das der richtige, stabile Bezugspunkt: Datumsfelder wie
 * `faelligAm` werden serverseitig aus `"<iso>T00:00:00"` geparst (siehe
 * z. B. auftraege/aktionen.ts) — ohne Zeitzonen-Suffix übernimmt `Date`
 * dafür die Zeitzone der AUSFÜHRENDEN Umgebung (auf Vercel: UTC), das
 * Ergebnis landet also ebenfalls auf UTC-Mitternacht dieses Kalendertags.
 * `berlinerTagesbeginn` trifft damit denselben Bezugspunkt, ohne dass
 * jede einzelne Vergleichsstelle das Umgebungs-Detail selbst kennen muss.
 *
 * Vorher benutzten mehrere Stellen dafür `new Date(x.getFullYear(),
 * x.getMonth(), x.getDate())` — das erzeugt Mitternacht in der Zeitzone
 * der AUSFÜHRENDEN Umgebung, nicht in Berlin. Auf Vercel (UTC) hieß das:
 * "heute" kippte bis zu zwei Stunden zu früh auf den nächsten Tag (z. B.
 * schon um 22:00 Berliner Zeit) — mit Folgefehlern bei "überfällig"-
 * Prüfungen, der Fünf-Tage-Regel beim geldwerten Vorteil und der
 * Tage-Zuordnung im Kalender (Rückmeldung 2026-09-17).
 */
export function berlinerTagesbeginn(datum: Date = new Date()): Date {
  const { jahr, monat, tag } = teileInBerlinerZeit(datum)
  return new Date(Date.UTC(Number(jahr), Number(monat) - 1, Number(tag)))
}

/** Wie `berlinerTagesbeginn`, aber das letzte Millisekunde desselben Kalendertags (23:59:59.999) — für "bis Ende des Tages"-Vergleiche. */
export function berlinerTagesende(datum: Date = new Date()): Date {
  return new Date(berlinerTagesbeginn(datum).getTime() + 24 * 60 * 60 * 1000 - 1)
}

/**
 * Date-Objekt → "Heute"/"Morgen"/"Übermorgen"/"Gestern"/"Vorgestern" für
 * nahe Tage, sonst das formatierte Datum — für die Zwischenziel-Liste, wo
 * die Nähe zu "heute" auf den ersten Blick zählt, ein weiter entferntes
 * Datum aber ohnehin nur als Zahl orientiert. Beide Parameter müssen auf
 * Mitternacht normiert sein (wie `frist` beim Anlegen eines Zwischenziels),
 * sonst verschiebt sich die Tagesdifferenz um Uhrzeit-Reste.
 */
export function relativesDatum(datum: Date, heute: Date): string {
  const tagMs = 24 * 60 * 60 * 1000
  const diffTage = Math.round((datum.getTime() - heute.getTime()) / tagMs)
  switch (diffTage) {
    case -2:
      return "Vorgestern"
    case -1:
      return "Gestern"
    case 0:
      return "Heute"
    case 1:
      return "Morgen"
    case 2:
      return "Übermorgen"
    default:
      return formatiereDatumAusDate(datum)
  }
}
