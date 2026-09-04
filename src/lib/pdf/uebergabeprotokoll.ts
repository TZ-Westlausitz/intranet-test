import { readFile } from "node:fs/promises"
import path from "node:path"

import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib"

import { formatiereDatumUhrzeit } from "@/lib/datum"
import { unterschriftMitOrtDatumEinfuegen } from "@/lib/pdf/unterschrift"

/**
 * Füllt das echte, ausfüllbare TuPZW-Formular
 * ("TuPZW-Fahrzeug-Uebergabeprotokoll_ausfuellbar_1.pdf") serverseitig aus —
 * Übergabe-Teil (Seite 1) immer, Rückgabe-Teil (Seite 2) nur, wenn schon
 * zurückgenommen wurde.
 *
 * Genau wie beim Nutzungsvereinbarung-Entwurf: Regel 6 (serverseitig
 * erzeugen), aber KEIN echtes `Uebergabeprotokoll` in der Datenbank — das
 * Schema verlangt dafür bereits vorhandene Unterschriftspfade
 * (`unterschriftEntleiherPfad`/`unterschriftFirmaPfad`, beide Pflichtfeld),
 * die es erst mit einer künftigen Unterschriften-Erfassung geben wird.
 * Dieses PDF ist ein vorbereiteter ENTWURF, kein Nachweis.
 *
 * Feldnamen und Reihenfolge im PDF wurden aus den Formularfeld-Positionen
 * ermittelt (Tank-Kästchen von links nach rechts = voll…leer, Zustand-Zeilen
 * von oben nach unten = dieselbe Reihenfolge wie im Prisma-Schema, jeweils
 * für Übergabe und Rückgabe getrennt).
 */

const VORLAGE_PFAD = path.join(
  process.cwd(),
  "src/lib/pdf/vorlagen/uebergabeprotokoll.pdf",
)

type Tankfuellung = "VOLL" | "DREI_VIERTEL" | "HALB" | "VIERTEL" | "LEER"

const TANK_SUFFIX: Record<Tankfuellung, string> = {
  VOLL: "220.7",
  DREI_VIERTEL: "255.8",
  HALB: "284.2",
  VIERTEL: "312.6",
  LEER: "341.0",
}

const ZUSTAND_KEYS = [
  "karosserie",
  "scheiben",
  "reifen",
  "innenraum",
  "bordwerkzeug",
  "fahrzeugpapiere",
  "ladekabel",
] as const

const AUSGABE_ZUSTAND_Y = ["457.0", "475.0", "493.0", "511.0", "529.0", "547.0", "565.0"]
const RUECKNAHME_ZUSTAND_Y = ["285.4", "303.4", "321.4", "339.4", "357.4", "375.4", "393.4"]

export type Abrechnung = {
  keineKosten: boolean
  kraftstoffkosten: boolean
  schaden: boolean
}

export type Schadenspunkt = {
  x: number
  y: number
  zone: string
  art: string
  beschreibung: string
  /** Nur bei der Rücknahme: schon bei der Ausgabe dokumentiert, kein neuer Schaden. */
  istVorschaden?: boolean
}

type Zustand = Record<(typeof ZUSTAND_KEYS)[number], boolean>

/**
 * Eine Freitextzeile mit optionaler Zählnummer. `nummer` gesetzt heißt: die
 * Zeile stammt aus einem Skizzenpunkt und bekommt vor dem Text denselben
 * runden Nummernkreis wie die Markierung auf der Schadensskizze —
 * `nummer: null` heißt reiner Freitext ohne Skizzenbezug, keine Nummerierung.
 */
export type Schadenszeile = { nummer: number | null; text: string }

/** Von Unterschriftfeld gelieferte Bilder plus die "Ort, Datum"-Angabe, die
 * daneben auf dieselbe Zeile wie im echten Papierformular gehört. */
export type UebergabeprotokollUnterschriften = {
  mieterPng: Uint8Array
  firmaPng: Uint8Array
  ortUndDatum: string
}

export type UebergabeprotokollAusgabeFelder = {
  fahrzeugText: string
  mieterName: string
  bezugVertragsdatum: string
  datumUhrzeit: string
  kilometerstand: string
  tankfuellung: Tankfuellung
  ort: string
  uebergebenDurch: string
  fuehrerscheinKontrolliert: boolean
  zustand: Zustand
  vorschaeden: Schadenszeile[]
  schadenspunkte: Schadenspunkt[]
  unterschriften?: UebergabeprotokollUnterschriften
}

export type UebergabeprotokollRuecknahmeFelder = {
  datumUhrzeit: string
  kilometerstand: string
  tankfuellung: Tankfuellung
  ort: string
  entgegengenommenDurch: string
  zustand: Zustand
  schaeden: Schadenszeile[]
  abrechnung: Abrechnung
  schadenspunkte: Schadenspunkt[]
  unterschriften?: UebergabeprotokollUnterschriften
}

/**
 * Rohe Formulareingaben (nicht die für die PDF aufbereiteten Werte) — so
 * gespeichert in `Ausleihe.ausgabeprotokollEntwurfDaten` /
 * `ruecknahmeprotokollEntwurfDaten`, damit "Protokoll bearbeiten" die
 * Felder wieder exakt vorausfüllen kann.
 */
export type AusgabeEntwurfDaten = {
  datumUhrzeit: string
  kilometerstand: string
  tankfuellung: string
  ort: string
  uebergebenDurch: string
  fuehrerschein: boolean
  zustand: Record<string, "io" | "schaden" | "">
  vorschaeden: string
  schadenspunkte: Schadenspunkt[]
}

export type RuecknahmeEntwurfDaten = {
  datumUhrzeit: string
  kilometerstand: string
  tankfuellung: string
  ort: string
  entgegengenommenDurch: string
  zustand: Record<string, "io" | "schaden" | "">
  schaeden: string
  abrechnung: Abrechnung
  schadenspunkte: Schadenspunkt[]
}

function zustandRohZuBool(roh: Record<string, "io" | "schaden" | "">): Zustand {
  return Object.fromEntries(ZUSTAND_KEYS.map((key) => [key, roh[key] !== "schaden"])) as Zustand
}

/**
 * Eine Zeile pro Skizzenpunkt, z.B. "Innenraum – Sitze: Flecken
 * Fahrersitz" — steht zuerst in den Freitextzeilen (Regel: wer nur die
 * Textseite liest, soll nicht zur Skizze auf Seite 3 blättern müssen). Die
 * Zählnummer steht nicht im Text, sondern wird als eigener Nummernkreis vor
 * die Zeile gezeichnet (siehe nummernkreisZeichnen).
 */
function schadenspunkteAlsZeilen(punkte: Schadenspunkt[]): Schadenszeile[] {
  return punkte.map((punkt, i) => ({
    nummer: i + 1,
    text: `${punkt.zone} – ${punkt.art}: ${punkt.beschreibung}`,
  }))
}

/**
 * Wie schadenspunkteAlsZeilen, aber nur die bei der Rücknahme neu
 * gemeldeten Schäden — Vorschäden stehen schon auf Seite 1 und würden sich
 * sonst unter "Bei Rückgabe neu festgestellte Schäden" wiederholen. Die
 * Nummerierung bleibt trotzdem die Position im vollständigen Array, damit
 * sie mit der Markierungsnummer auf der Schadensskizze übereinstimmt.
 */
function neueSchadenspunkteAlsZeilen(punkte: Schadenspunkt[]): Schadenszeile[] {
  return punkte
    .map((punkt, i) => ({ punkt, nummer: i + 1 }))
    .filter(({ punkt }) => !punkt.istVorschaden)
    .map(({ punkt, nummer }) => ({
      nummer,
      text: `${punkt.zone} – ${punkt.art}: ${punkt.beschreibung}`,
    }))
}

/** Übersetzt die rohen Formulareingaben der Ausgabe in PDF-fertige Felder. */
export function ausgabeDatenZuFeldern(
  daten: AusgabeEntwurfDaten,
  kontext: { fahrzeugText: string; mieterName: string; bezugVertragsdatum: string },
): UebergabeprotokollAusgabeFelder {
  const freitextZeilen = daten.vorschaeden
    .split("\n")
    .map((zeile) => zeile.trim())
    .filter(Boolean)

  return {
    fahrzeugText: kontext.fahrzeugText,
    mieterName: kontext.mieterName,
    bezugVertragsdatum: kontext.bezugVertragsdatum,
    datumUhrzeit: formatiereDatumUhrzeit(daten.datumUhrzeit),
    kilometerstand: daten.kilometerstand,
    tankfuellung: daten.tankfuellung as Tankfuellung,
    ort: daten.ort,
    uebergebenDurch: daten.uebergebenDurch,
    fuehrerscheinKontrolliert: daten.fuehrerschein,
    zustand: zustandRohZuBool(daten.zustand),
    vorschaeden: [
      ...schadenspunkteAlsZeilen(daten.schadenspunkte),
      ...freitextZeilen.map((text) => ({ nummer: null, text })),
    ],
    schadenspunkte: daten.schadenspunkte,
  }
}

/** Übersetzt die rohen Formulareingaben der Rücknahme in PDF-fertige Felder. */
export function ruecknahmeDatenZuFeldern(
  daten: RuecknahmeEntwurfDaten,
): UebergabeprotokollRuecknahmeFelder {
  const freitextZeilen = daten.schaeden
    .split("\n")
    .map((zeile) => zeile.trim())
    .filter(Boolean)

  return {
    datumUhrzeit: formatiereDatumUhrzeit(daten.datumUhrzeit),
    kilometerstand: daten.kilometerstand,
    tankfuellung: daten.tankfuellung as Tankfuellung,
    ort: daten.ort,
    entgegengenommenDurch: daten.entgegengenommenDurch,
    zustand: zustandRohZuBool(daten.zustand),
    schaeden: [
      ...neueSchadenspunkteAlsZeilen(daten.schadenspunkte),
      ...freitextZeilen.map((text) => ({ nummer: null, text })),
    ],
    abrechnung: daten.abrechnung,
    schadenspunkte: daten.schadenspunkte,
  }
}

// Draufsicht im selben Koordinatenraum wie die Skizze im Formular
// (components/schadensskizze.tsx) — dieselben Pfade, damit Bildschirm und
// Ausdruck übereinstimmen.
const SKIZZE_BREITE = 300
const SKIZZE_HOEHE = 680

function rechteckPfad(x: number, y: number, breite: number, hoehe: number): string {
  return `M ${x},${y} L ${x + breite},${y} L ${x + breite},${y + hoehe} L ${x},${y + hoehe} Z`
}

// Kopf- und Fußzeile der Vorlage (Firmenname/Logo oben, Fußzeilentext unten)
// — per Bildposition ermittelt (siehe Kommentar an Ort und Stelle im Code,
// als das ausgemessen wurde). Seite 1 der Vorlage liefert beides; jede neu
// hinzugefügte Seite bekommt dieselben Streifen aufgeklebt, statt sie neu zu
// zeichnen.
const KOPFZEILE_UNTEN = 770
const FUSSZEILE_OBEN = 46
// Bereich der alten "Seite X von Y"-Angabe in der Fußzeile — wird
// übertüncht und mit der richtigen Gesamtseitenzahl neu beschriftet.
const SEITENZAHL_BEREICH = { x: 458, y: 34, breite: 97, hoehe: 12 }

async function kopfUndFusszeileAnbringen(
  seite: import("pdf-lib").PDFPage,
  kopf: import("pdf-lib").PDFEmbeddedPage,
  fuss: import("pdf-lib").PDFEmbeddedPage,
) {
  seite.drawPage(kopf, { x: 0, y: KOPFZEILE_UNTEN })
  seite.drawPage(fuss, { x: 0, y: 0 })
}

/** Übertüncht die alte "Seite X von Y" und schreibt die richtige neu. */
function seitenzahlKorrigieren(seite: import("pdf-lib").PDFPage, nummer: number, gesamt: number, schrift: PDFFont) {
  seite.drawRectangle({
    x: SEITENZAHL_BEREICH.x,
    y: SEITENZAHL_BEREICH.y,
    width: SEITENZAHL_BEREICH.breite,
    height: SEITENZAHL_BEREICH.hoehe,
    color: rgb(1, 1, 1),
  })
  seite.drawText(`Seite ${nummer} von ${gesamt}`, {
    x: SEITENZAHL_BEREICH.x,
    y: SEITENZAHL_BEREICH.y + 2,
    size: 9,
    font: schrift,
    color: rgb(0x57 / 255, 0x57 / 255, 0x56 / 255),
  })
}

// Radius des Nummernkreises vor den Freitextzeilen — kleiner als auf der
// Skizze (dort 8), weil hier nur eine Zeile Zeilenhöhe (18pt) zur Verfügung
// steht statt der ganzen Skizzenfläche.
const NUMMERNKREIS_RADIUS = 7

/**
 * Derselbe rote Nummernkreis wie auf der Schadensskizze, hier vor eine
 * Freitextzeile auf Seite 1/2 gesetzt — damit dieselbe Schadensstelle auf
 * Skizze und Text mit einem Blick zusammengehört. Nur für neu gemeldete
 * Schäden: Vorschäden/Freitext ohne Skizzenbezug bekommen keine Nummer.
 */
function nummernkreisZeichnen(
  seite: import("pdf-lib").PDFPage,
  schriftFett: PDFFont,
  nummer: number,
  mittelpunktX: number,
  mittelpunktY: number,
) {
  seite.drawEllipse({
    x: mittelpunktX,
    y: mittelpunktY,
    xScale: NUMMERNKREIS_RADIUS,
    yScale: NUMMERNKREIS_RADIUS,
    color: rgb(0xbc / 255, 0x3a / 255, 0x24 / 255),
  })
  const text = String(nummer)
  seite.drawText(text, {
    x: mittelpunktX - schriftFett.widthOfTextAtSize(text, 8) / 2,
    y: mittelpunktY - 3,
    size: 8,
    font: schriftFett,
    color: rgb(1, 1, 1),
  })
}

/**
 * Zeichnet eine Skizze (Van-Umriss + Markierungen, keine Beschreibungsliste
 * mehr — die steht jetzt in den Freitextzeilen auf Seite 1/2) in eine
 * Spalte der Breite `breite`, mit Anker oben links bei (ankerX, ankerY).
 */
async function schadensskizzeZeichnen(
  seite: import("pdf-lib").PDFPage,
  schriftFett: PDFFont,
  punkte: Schadenspunkt[],
  ueberschrift: string,
  ankerX: number,
  ankerY: number,
  breite: number,
) {
  const skala = breite / SKIZZE_BREITE

  seite.drawText(ueberschrift, { x: ankerX, y: ankerY + 16, size: 13, font: schriftFett })

  // Räder
  const raeder: [number, number, number, number][] = [
    [43, 184, 14, 46],
    [243, 184, 14, 46],
    [43, 480, 14, 46],
    [243, 480, 14, 46],
  ]
  for (const [x, y, radBreite, radHoehe] of raeder) {
    seite.drawSvgPath(rechteckPfad(x, y, radBreite, radHoehe), {
      x: ankerX,
      y: ankerY,
      scale: skala,
      color: rgb(0x6f / 255, 0x74 / 255, 0x66 / 255),
    })
  }

  // Karosserie
  seite.drawSvgPath(
    "M 83,55 L 217,55 Q 245,55 245,92 L 245,600 Q 245,615 230,615 L 70,615 Q 55,615 55,600 L 55,92 Q 55,55 83,55 Z",
    {
      x: ankerX,
      y: ankerY,
      scale: skala,
      color: rgb(0xe4 / 255, 0xe5 / 255, 0xda / 255),
      borderColor: rgb(0x9a / 255, 0xa0 / 255, 0x8d / 255),
      borderWidth: 1.5,
    },
  )
  // Fensterscheibe
  seite.drawSvgPath(rechteckPfad(68, 128, 164, 42), {
    x: ankerX,
    y: ankerY,
    scale: skala,
    color: rgb(0xcf / 255, 0xd8 / 255, 0xd3 / 255),
  })
  // Laderaum
  seite.drawSvgPath(rechteckPfad(68, 178, 164, 428), {
    x: ankerX,
    y: ankerY,
    scale: skala,
    borderColor: rgb(0x9a / 255, 0xa0 / 255, 0x8d / 255),
    borderWidth: 1,
  })
  // Dachfenster über den Fahrersitzen — Sonderzone "Innenraum"
  seite.drawSvgPath(rechteckPfad(113, 185, 74, 55), {
    x: ankerX,
    y: ankerY,
    scale: skala,
    color: rgb(0xcf / 255, 0xd8 / 255, 0xd3 / 255),
    borderColor: rgb(0x8f / 255, 0xa7 / 255, 0x9e / 255),
    borderWidth: 1,
  })

  seite.drawText("VORN", { x: ankerX + 76 * skala, y: ankerY - 15 * skala, size: 8, font: schriftFett })
  seite.drawText("HECK", {
    x: ankerX + 76 * skala,
    y: ankerY - (SKIZZE_HOEHE - 12) * skala,
    size: 8,
    font: schriftFett,
  })

  // Markierungen
  // Die Skizze im Formular liegt im Querformat (vorn/hinten über x,
  // links/rechts über y — siehe components/schadensskizze.tsx), diese Seite
  // zeichnet weiterhin im ursprünglichen Hochformat. x und y der Punkte sind
  // deshalb hier vertauscht zu lesen — UND y gespiegelt: Die Drehung von
  // Quer- auf Hochformat kehrt links/rechts um (Front zeigt im Querformat
  // nach links statt nach oben), sonst landet die Markierung seitenverkehrt.
  punkte.forEach((punkt, i) => {
    const mx = ankerX + (1 - punkt.y) * SKIZZE_BREITE * skala
    const my = ankerY - punkt.x * SKIZZE_HOEHE * skala
    const radius = 8
    seite.drawEllipse({
      x: mx,
      y: my,
      xScale: radius,
      yScale: radius,
      color: punkt.istVorschaden
        ? rgb(0x9c / 255, 0xa3 / 255, 0xaf / 255)
        : rgb(0xbc / 255, 0x3a / 255, 0x24 / 255),
    })
    const nummer = String(i + 1)
    seite.drawText(nummer, {
      x: mx - schriftFett.widthOfTextAtSize(nummer, 9) / 2,
      y: my - 3.5,
      size: 9,
      font: schriftFett,
      color: rgb(1, 1, 1),
    })
  })
}

/**
 * Erzeugt das komplette Übergabeprotokoll-PDF neu aus der Vorlage — immer
 * aus den rohen, gespeicherten Formulardaten beider Seiten, nie durch
 * Nachbearbeiten einer bereits erzeugten PDF. So bleibt das Ergebnis auch
 * dann konsistent, wenn die Ausgabe im Nachhinein noch einmal bearbeitet
 * wird, nachdem die Rücknahme schon existiert.
 */
export async function uebergabeprotokollPdfErzeugen(
  ausgabe: UebergabeprotokollAusgabeFelder,
  ruecknahme?: UebergabeprotokollRuecknahmeFelder,
): Promise<Uint8Array> {
  const vorlage = await readFile(VORLAGE_PFAD)
  const pdf = await PDFDocument.load(vorlage)
  const form = pdf.getForm()
  const schrift = await pdf.embedFont(StandardFonts.Helvetica)
  const schriftFett = await pdf.embedFont(StandardFonts.HelveticaBold)
  const [ersteSeite, zweiteSeite] = pdf.getPages()

  form.getTextField("fahrzeug_modell_kennzeichen").setText(ausgabe.fahrzeugText)
  form.getTextField("mieter_name").setText(ausgabe.mieterName)
  form.getTextField("bezug_vertragsdatum").setText(ausgabe.bezugVertragsdatum)
  form.getTextField("uebergabe_datum_uhrzeit").setText(ausgabe.datumUhrzeit)
  form.getTextField("uebergabe_kilometerstand").setText(ausgabe.kilometerstand)
  form.getTextField("uebergabe_ort").setText(ausgabe.ort)
  form.getTextField("uebergabe_uebergeben_durch").setText(ausgabe.uebergebenDurch)
  form.getCheckBox(`uebergabe_tank_${TANK_SUFFIX[ausgabe.tankfuellung]}`).check()

  if (ausgabe.fuehrerscheinKontrolliert) {
    form.getCheckBox("uebergabe_fuehrerschein").check()
  }

  ZUSTAND_KEYS.forEach((key, i) => {
    const inOrdnung = ausgabe.zustand[key]
    form.getCheckBox(`uebergabe_zustand_${inOrdnung ? "io" : "schaden"}_${AUSGABE_ZUSTAND_Y[i]}`).check()
  })

  const vorschaedenFelder = ["vorschaeden_uebergabe_1", "vorschaeden_uebergabe_2", "vorschaeden_uebergabe_3"]
  ausgabe.vorschaeden.slice(0, 3).forEach((zeile, i) => {
    const feld = form.getTextField(vorschaedenFelder[i])
    feld.setText(zeile.text)
    if (zeile.nummer !== null) {
      const { x, y, height } = feld.acroField.getWidgets()[0].getRectangle()
      nummernkreisZeichnen(ersteSeite, schriftFett, zeile.nummer, x - 14, y + height / 2)
    }
  })

  if (ausgabe.unterschriften) {
    await unterschriftMitOrtDatumEinfuegen(
      pdf,
      form,
      ersteSeite,
      schrift,
      "sig_vermieter_uebergabe",
      ausgabe.unterschriften.ortUndDatum,
      ausgabe.unterschriften.firmaPng,
    )
    await unterschriftMitOrtDatumEinfuegen(
      pdf,
      form,
      ersteSeite,
      schrift,
      "sig_mieter_uebergabe",
      ausgabe.unterschriften.ortUndDatum,
      ausgabe.unterschriften.mieterPng,
    )
  }

  if (ruecknahme) {
    form.getTextField("rueckgabe_datum_uhrzeit").setText(ruecknahme.datumUhrzeit)
    form.getTextField("rueckgabe_kilometerstand").setText(ruecknahme.kilometerstand)
    form.getTextField("rueckgabe_ort").setText(ruecknahme.ort)
    form.getTextField("rueckgabe_entgegengenommen_durch").setText(ruecknahme.entgegengenommenDurch)
    form.getCheckBox(`rueckgabe_tank_${TANK_SUFFIX[ruecknahme.tankfuellung]}`).check()

    ZUSTAND_KEYS.forEach((key, i) => {
      const inOrdnung = ruecknahme.zustand[key]
      form
        .getCheckBox(`rueckgabe_zustand_${inOrdnung ? "io" : "schaden"}_${RUECKNAHME_ZUSTAND_Y[i]}`)
        .check()
    })

    const schaedenFelder = ["schaeden_rueckgabe_1", "schaeden_rueckgabe_2", "schaeden_rueckgabe_3"]
    ruecknahme.schaeden.slice(0, 3).forEach((zeile, i) => {
      const feld = form.getTextField(schaedenFelder[i])
      feld.setText(zeile.text)
      if (zeile.nummer !== null) {
        const { x, y, height } = feld.acroField.getWidgets()[0].getRectangle()
        nummernkreisZeichnen(zweiteSeite, schriftFett, zeile.nummer, x - 14, y + height / 2)
      }
    })

    // Unabhängige Kästchen im PDF (keine Radiogruppe) — mehr als eines kann
    // angehakt sein, siehe Formularregel: 1 schließt 2+3 aus, 2 und 3 sind
    // miteinander kombinierbar.
    if (ruecknahme.abrechnung.keineKosten) form.getCheckBox("abrechnung_keine_kosten").check()
    if (ruecknahme.abrechnung.kraftstoffkosten) form.getCheckBox("abrechnung_kraftstoffkosten").check()
    if (ruecknahme.abrechnung.schaden) form.getCheckBox("abrechnung_schaden").check()

    if (ruecknahme.unterschriften) {
      await unterschriftMitOrtDatumEinfuegen(
        pdf,
        form,
        zweiteSeite,
        schrift,
        "sig_vermieter_rueckgabe",
        ruecknahme.unterschriften.ortUndDatum,
        ruecknahme.unterschriften.firmaPng,
      )
      await unterschriftMitOrtDatumEinfuegen(
        pdf,
        form,
        zweiteSeite,
        schrift,
        "sig_mieter_rueckgabe",
        ruecknahme.unterschriften.ortUndDatum,
        ruecknahme.unterschriften.mieterPng,
      )
    }
  }

  const brauchtSkizzenseite =
    ausgabe.schadenspunkte.length > 0 || (ruecknahme && ruecknahme.schadenspunkte.length > 0)

  if (brauchtSkizzenseite) {
    const [kopf] = await pdf.embedPages(
      [ersteSeite],
      [{ left: 0, right: 595.30398, bottom: KOPFZEILE_UNTEN, top: 841.8898 }],
    )
    const [fuss] = await pdf.embedPages(
      [ersteSeite],
      [{ left: 0, right: 595.30398, bottom: 0, top: FUSSZEILE_OBEN }],
    )

    const skizzenSeite = pdf.addPage([595.30398, 841.8898])

    await kopfUndFusszeileAnbringen(skizzenSeite, kopf, fuss)

    // Zwei Spalten nebeneinander, damit beide Skizzen (falls es sie gibt)
    // auf derselben Seite Platz haben — die Beschreibungen stehen längst
    // oben in den Freitextzeilen, hier bleibt nur noch die Zeichnung.
    const spaltenBreite = 220
    const luecke = 35
    const linkeSpalteX = 40
    const rechteSpalteX = linkeSpalteX + spaltenBreite + luecke
    const ankerY = 720

    if (ausgabe.schadenspunkte.length > 0) {
      await schadensskizzeZeichnen(
        skizzenSeite,
        schriftFett,
        ausgabe.schadenspunkte,
        "Schadensskizze — Übergabe",
        linkeSpalteX,
        ankerY,
        spaltenBreite,
      )
    }
    if (ruecknahme && ruecknahme.schadenspunkte.length > 0) {
      await schadensskizzeZeichnen(
        skizzenSeite,
        schriftFett,
        ruecknahme.schadenspunkte,
        "Schadensskizze — Rücknahme",
        rechteSpalteX,
        ankerY,
        spaltenBreite,
      )
    }

    // Jetzt gibt es 3 Seiten statt der 2 aus der Vorlage — die dort
    // aufgedruckte "Seite X von 2" stimmt nicht mehr, auf allen Seiten.
    const gesamtseiten = pdf.getPageCount()
    pdf.getPages().forEach((seite, i) => {
      seitenzahlKorrigieren(seite, i + 1, gesamtseiten, schrift)
    })
  }

  return pdf.save()
}
