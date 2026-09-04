/**
 * Alles rund um wiederkehrende Termine — geteilt zwischen der Anzeige der
 * Auswahlmöglichkeiten (Client, TerminFormFelder) und der eigentlichen
 * Serien-Erzeugung (Server, terminErstellen). Reines Datumsrechnen, keine
 * Server- oder Browser-only-APIs, deshalb an beiden Stellen importierbar.
 *
 * Es gibt bewusst KEINE gespeicherte Wiederholungsregel (kein RRULE) —
 * siehe Kommentar am Model Termin in schema.prisma. Diese Datei erzeugt
 * beim Anlegen einmalig die konkreten Termine der Serie, jede Zeile ist
 * danach ein ganz normaler, unabhängiger Termin.
 */

export type WiederholenTyp =
  | "taeglich"
  | "woechentlich"
  | "monatlichTag"
  | "monatlichWochentag"
  | "jaehrlich"
  | "werktage"
  | "benutzerdefiniert"

export type WiederholenEinheit = "tag" | "woche" | "monat" | "jahr"

export type BenutzerdefinierteWiederholung = {
  intervall: number
  einheit: WiederholenEinheit
}

const WOCHENTAGE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"]
const ORDINALZAHLEN = ["ersten", "zweiten", "dritten", "vierten", "fünften"]

/**
 * Die Auswahlmöglichkeiten für "Wiederholen" — mit Labels, die den
 * gewählten Starttag einbeziehen (z. B. "Wöchentlich am Dienstag"), genau
 * wie bei Google Kalender. `datumIso` ist das aktuell im Formular
 * eingetragene Startdatum (leer = generische Labels ohne Wochentag/Datum).
 */
export function wiederholenOptionen(datumIso: string): { wert: WiederholenTyp | "nein" | "benutzerdefiniert"; label: string }[] {
  const datum = datumIso ? new Date(`${datumIso}T00:00:00`) : null
  const gueltig = datum && !Number.isNaN(datum.getTime())

  const wochentag = gueltig ? WOCHENTAGE[datum.getDay()] : null
  const tag = gueltig ? datum.getDate() : null
  const nteOccurrence = gueltig ? Math.ceil(datum.getDate() / 7) : null
  const ordinal = nteOccurrence ? (ORDINALZAHLEN[Math.min(nteOccurrence, 5) - 1] ?? "letzten") : null
  const monatUndTag = gueltig ? datum.toLocaleDateString("de-DE", { day: "2-digit", month: "long" }) : null

  return [
    { wert: "nein", label: "Nicht wiederholen" },
    { wert: "taeglich", label: "Täglich" },
    { wert: "werktage", label: "Jeden Werktag (Mo.–Fr.)" },
    { wert: "woechentlich", label: wochentag ? `Wöchentlich am ${wochentag}` : "Wöchentlich" },
    { wert: "monatlichTag", label: tag ? `Monatlich am ${tag}.` : "Monatlich am selben Tag" },
    {
      wert: "monatlichWochentag",
      label: ordinal && wochentag ? `Monatlich am ${ordinal} ${wochentag}` : "Monatlich am selben Wochentag",
    },
    { wert: "jaehrlich", label: monatUndTag ? `Jährlich am ${monatUndTag}` : "Jährlich" },
    { wert: "benutzerdefiniert", label: "Benutzerdefiniert …" },
  ]
}

/** Liefert das nächste Vorkommen einer Serie — `ursprung` bleibt für die ganze Serie der allererste Termin. */
export function naechsteWiederholung(
  aktuell: Date,
  ursprung: Date,
  typ: WiederholenTyp,
  benutzerdefiniert: BenutzerdefinierteWiederholung,
): Date {
  const neu = new Date(aktuell)

  switch (typ) {
    case "taeglich":
      neu.setDate(neu.getDate() + 1)
      return neu

    case "werktage":
      do {
        neu.setDate(neu.getDate() + 1)
      } while (neu.getDay() === 0 || neu.getDay() === 6)
      return neu

    case "woechentlich":
      neu.setDate(neu.getDate() + 7)
      return neu

    case "monatlichTag":
      neu.setMonth(neu.getMonth() + 1)
      return neu

    case "jaehrlich":
      neu.setFullYear(neu.getFullYear() + 1)
      return neu

    case "benutzerdefiniert": {
      const { intervall, einheit } = benutzerdefiniert
      if (einheit === "tag") neu.setDate(neu.getDate() + intervall)
      else if (einheit === "woche") neu.setDate(neu.getDate() + intervall * 7)
      else if (einheit === "monat") neu.setMonth(neu.getMonth() + intervall)
      else neu.setFullYear(neu.getFullYear() + intervall)
      return neu
    }

    case "monatlichWochentag":
      return naechsterNterWochentag(aktuell, ursprung)
  }
}

/**
 * Nächster "n-ter Wochentag des Monats" (z. B. "dritter Dienstag") nach
 * `aktuell`, mit demselben Wochentag/n wie `ursprung`. Manche Monate
 * haben keinen fünften Vorkommen eines Wochentags — dann wird der
 * nächste passende Monat gesucht (Obergrenze 24 Versuche, weit mehr als
 * praktisch je gebraucht).
 */
function naechsterNterWochentag(aktuell: Date, ursprung: Date): Date {
  const wochentag = ursprung.getDay()
  const nteOccurrence = Math.ceil(ursprung.getDate() / 7)

  let monatsanfang = new Date(aktuell.getFullYear(), aktuell.getMonth() + 1, 1)

  for (let versuch = 0; versuch < 24; versuch++) {
    const ersterTreffer = new Date(monatsanfang)
    while (ersterTreffer.getDay() !== wochentag) {
      ersterTreffer.setDate(ersterTreffer.getDate() + 1)
    }
    const kandidat = new Date(ersterTreffer)
    kandidat.setDate(kandidat.getDate() + (nteOccurrence - 1) * 7)

    if (kandidat.getMonth() === monatsanfang.getMonth()) {
      return kandidat
    }
    monatsanfang = new Date(monatsanfang.getFullYear(), monatsanfang.getMonth() + 1, 1)
  }

  // Praktisch unerreichbar (siehe Obergrenze oben) — Fallback, damit die
  // Funktion immer ein Datum liefert.
  return monatsanfang
}
