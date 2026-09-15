import { readFile } from "node:fs/promises"
import path from "node:path"

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib"

import { richTextZuText } from "@/lib/rich-text"
import { formatiereDatumAusDate, zeitAusDate } from "@/lib/datum"

const SEITE_BREITE = 595.28 // A4 hoch, in pt
const SEITE_HOEHE = 841.89
const RAND = 50
const ZEILENHOEHE = 16

/// Kopf-/Fußzeile im selben Aufbau wie die Fahrzeugunterlagen (Logo oben,
/// Titel + Seitenzahl unten) — dort aus der Vorlagen-PDF ausgeschnitten
/// (siehe uebergabeprotokoll.ts), hier frisch gezeichnet, weil es keine
/// feste Vorlagenseite gibt, aus der sich das schneiden ließe.
const LOGO_HOEHE = 24
/// Höhe/Breite von public/logo.png (Stand 2026-09-11: 439×2278) — bei einem
/// erneuten Logo-Austausch hier nachziehen, sonst wirkt es im PDF gestaucht.
const LOGO_SEITENVERHAELTNIS = 439 / 2278
const LOGO_PFAD = path.join(process.cwd(), "public/logo.png")
/// Abstand zwischen Logo-Unterkante und dem eigentlichen Inhalt.
const KOPFZEILE_INHALT_ABSTAND = 14
const KOPFZEILE_HOEHE = RAND + LOGO_HOEHE + KOPFZEILE_INHALT_ABSTAND
const FUSSZEILE_HOEHE = 34

/// \p{Extended_Pictographic}: Emoji-Zeichen selbst. ‍ (Zero Width
/// Joiner): verbindet mehrere Emoji zu einem zusammengesetzten (z. B.
/// 👨‍👩‍👧). ️ (Variation Selector-16): erzwingt die bunte
/// Emoji-Darstellung statt eines einfachen Textzeichens.
const EMOJI_MUSTER = /[\p{Extended_Pictographic}\u200d\uFE0F]/gu

/**
 * Entfernt Emoji aus dem Vorlage-Titel für den Dokumentnamen und die PDF
 * selbst. Emoji im Titel (z. B. "Krankschreibung 🤒") dienen nur der
 * besseren Unterscheidbarkeit in der Formularliste (Rückmeldung
 * 2026-09-09) — im heruntergeladenen Dokument und dessen Dateinamen sollen
 * sie gar nicht erst auftauchen, statt (wie zuvor) nur notdürftig für den
 * `Content-Disposition`-Header kodiert zu werden.
 */
export function titelOhneEmoji(titel: string): string {
  return titel.replace(EMOJI_MUSTER, "").replace(/\s+/g, " ").trim()
}

type ElementFuerPdf = {
  id: string
  typ: string
  label: string | null
  inhalt: string | null
}

type AntwortFuerPdf = {
  elementId: string
  wertText: string | null
  wertMehrfach: string[]
  wertJa: boolean | null
}

type AnhangFuerPdf = { elementId: string | null; dateiname: string }

const TRENNZEICHEN_DASH: Record<string, number[] | undefined> = {
  DURCHGEZOGEN: undefined,
  GESTRICHELT: [6, 3],
  PUNKTIERT: [1, 2],
}

/**
 * Entfernt Zeichen, die die Standardschrift (nur WinAnsi-Kodierung, kein
 * Unicode) nicht darstellen kann — Emoji sind über `titelOhneEmoji` bereits
 * aus dem Titel raus, aber Freitext-Antworten oder Textblock-Inhalte können
 * weiterhin nicht darstellbare Zeichen enthalten. Ohne diesen Filter bricht
 * `pdf-lib` beim Zeichnen mitten in der Einreichung ab. Zeichenweise statt
 * den ganzen Text zu verwerfen, damit nur das einzelne Zeichen fehlt statt
 * des gesamten Texts.
 */
function fuerPdfKodierbar(text: string, schrift: PDFFont): string {
  return Array.from(text)
    .filter((zeichen) => {
      try {
        schrift.widthOfTextAtSize(zeichen, 10)
        return true
      } catch {
        return false
      }
    })
    .join("")
}

/** Bricht `text` auf `breite` Punkt Zeilenlänge um — einfache Wort-für-Wort-Messung, reicht für Formular-Antworten. */
function zeilenUmbrechen(text: string, schrift: PDFFont, groesse: number, breite: number): string[] {
  const woerter = text.split(/\s+/).filter(Boolean)
  const zeilen: string[] = []
  let aktuell = ""

  for (const wort of woerter) {
    const kandidat = aktuell ? `${aktuell} ${wort}` : wort
    if (schrift.widthOfTextAtSize(kandidat, groesse) > breite && aktuell) {
      zeilen.push(aktuell)
      aktuell = wort
    } else {
      aktuell = kandidat
    }
  }
  if (aktuell) zeilen.push(aktuell)
  return zeilen.length > 0 ? zeilen : [""]
}

function antwortAlsText(element: ElementFuerPdf, antwort: AntwortFuerPdf | undefined, anhang: AnhangFuerPdf | undefined): string {
  if (element.typ === "DATEI") return anhang ? `siehe Anhang: ${anhang.dateiname}` : "(keine Datei)"
  if (!antwort) return "(keine Angabe)"
  if (element.typ === "CHECKBOX") return antwort.wertJa ? "Ja" : "Nein"
  if (element.typ === "AUSWAHL_MEHRFACH") return antwort.wertMehrfach.length > 0 ? antwort.wertMehrfach.join(", ") : "(keine Angabe)"
  return antwort.wertText?.trim() ? antwort.wertText : "(keine Angabe)"
}

/** Kopfzeile (Logo) + Fußzeile (Titel mittig, Seitenzahl nur bei mehreren Seiten) auf JEDE Seite — erst am Ende, wenn die Seitenzahl feststeht. */
function kopfUndFusszeileZeichnen(
  seiten: PDFPage[],
  logo: PDFImage,
  schrift: PDFFont,
  titel: string,
) {
  const logoBreite = LOGO_HOEHE / LOGO_SEITENVERHAELTNIS
  const fusszeileGroesse = 8
  const titelSicher = fuerPdfKodierbar(titel, schrift)

  seiten.forEach((seite, index) => {
    seite.drawImage(logo, {
      x: SEITE_BREITE - RAND - logoBreite,
      y: SEITE_HOEHE - RAND - LOGO_HOEHE,
      width: logoBreite,
      height: LOGO_HOEHE,
    })

    const titelBreite = schrift.widthOfTextAtSize(titelSicher, fusszeileGroesse)
    seite.drawText(titelSicher, {
      x: (SEITE_BREITE - titelBreite) / 2,
      y: RAND / 2,
      size: fusszeileGroesse,
      font: schrift,
      color: rgb(0.55, 0.55, 0.55),
    })

    if (seiten.length > 1) {
      const seitenzahlText = `Seite ${index + 1} von ${seiten.length}`
      const seitenzahlBreite = schrift.widthOfTextAtSize(seitenzahlText, fusszeileGroesse)
      seite.drawText(seitenzahlText, {
        x: SEITE_BREITE - RAND - seitenzahlBreite,
        y: RAND / 2,
        size: fusszeileGroesse,
        font: schrift,
        color: rgb(0.55, 0.55, 0.55),
      })
    }
  })
}

/**
 * Zeichnet eine generische PDF aus den Antworten einer Einreichung — anders
 * als `uebergabeprotokoll.ts` (füllt eine feste Vorlage) gibt es hier keine
 * feste Formularstruktur, deshalb wird die Seite von Grund auf beschrieben
 * (Regel 6: serverseitig erzeugt). Kopf-/Fußzeile im selben Aufbau wie die
 * Fahrzeugunterlagen (siehe kopfUndFusszeileZeichnen).
 */
export async function formularPdfErzeugen(daten: {
  titel: string
  eingereichtVon: string
  eingereichtAm: Date
  elemente: ElementFuerPdf[]
  antworten: AntwortFuerPdf[]
  anhaenge: AnhangFuerPdf[]
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const schrift = await pdf.embedFont(StandardFonts.Helvetica)
  const schriftFett = await pdf.embedFont(StandardFonts.HelveticaBold)
  const logoBytes = await readFile(LOGO_PFAD)
  const logo = await pdf.embedPng(logoBytes)
  const inhaltsBreite = SEITE_BREITE - 2 * RAND
  const titel = titelOhneEmoji(daten.titel)

  const seiten: PDFPage[] = [pdf.addPage([SEITE_BREITE, SEITE_HOEHE])]
  let seite = seiten[0]
  let y = SEITE_HOEHE - KOPFZEILE_HOEHE

  function neueZeile(hoehe: number = ZEILENHOEHE) {
    y -= hoehe
    if (y < FUSSZEILE_HOEHE) {
      seite = pdf.addPage([SEITE_BREITE, SEITE_HOEHE])
      seiten.push(seite)
      y = SEITE_HOEHE - KOPFZEILE_HOEHE
    }
  }

  function textZeichnen(text: string, groesse: number, fett: boolean, farbe = rgb(0.1, 0.1, 0.1)) {
    const schriftart = fett ? schriftFett : schrift
    const sichererText = fuerPdfKodierbar(text, schriftart)
    for (const zeile of zeilenUmbrechen(sichererText, schriftart, groesse, inhaltsBreite)) {
      seite.drawText(zeile, { x: RAND, y, size: groesse, font: schriftart, color: farbe })
      neueZeile(groesse + 6)
    }
  }

  textZeichnen(titel, 18, true)
  neueZeile(4)
  const eingereichtAmText = `${formatiereDatumAusDate(daten.eingereichtAm)}, ${zeitAusDate(daten.eingereichtAm)} Uhr`
  textZeichnen(`Eingereicht von ${daten.eingereichtVon} am ${eingereichtAmText}`, 10, false, rgb(0.4, 0.4, 0.4))
  neueZeile(14)

  const antwortenNachElement = new Map(daten.antworten.map((a) => [a.elementId, a]))
  const anhaengeNachElement = new Map(daten.anhaenge.filter((a) => a.elementId).map((a) => [a.elementId as string, a]))

  for (const element of daten.elemente) {
    if (element.typ === "TEXTBLOCK") {
      if (element.inhalt) {
        textZeichnen(richTextZuText(element.inhalt), 11, false, rgb(0.35, 0.35, 0.35))
        neueZeile(6)
      }
      continue
    }

    if (element.typ === "TRENNZEICHEN") {
      seite.drawLine({
        start: { x: RAND, y },
        end: { x: SEITE_BREITE - RAND, y },
        thickness: 1,
        color: rgb(0.75, 0.75, 0.75),
        dashArray: TRENNZEICHEN_DASH[element.label ?? ""],
      })
      neueZeile(12)
      continue
    }

    textZeichnen(element.label ?? "", 11, true)
    textZeichnen(antwortAlsText(element, antwortenNachElement.get(element.id), anhaengeNachElement.get(element.id)), 11, false)
    neueZeile(6)
  }

  kopfUndFusszeileZeichnen(seiten, logo, schrift, titel)

  return pdf.save()
}
