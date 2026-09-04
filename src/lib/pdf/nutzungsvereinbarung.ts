import { readFile } from "node:fs/promises"
import path from "node:path"

import { PDFDocument, StandardFonts } from "pdf-lib"

import { unterschriftMitOrtDatumEinfuegen } from "@/lib/pdf/unterschrift"

/**
 * Füllt das echte, ausfüllbare TuPZW-Formular
 * ("TuPZW-Fahrzeug-Nutzungsvereinbarung_ausfuellbar_1.pdf") serverseitig
 * aus. Regel 6 in der CLAUDE.md: PDFs werden ausschließlich serverseitig
 * erzeugt — deshalb gibt es diese Funktion nur hier, nicht im Client.
 *
 * Ohne `unterschriften` bleiben `sig_vermieter_vertrag`/`sig_mieter_vertrag`
 * leer — das ist der vorbereitete ENTWURF vor der Übergabe, kein
 * unterschriebener Nachweis. Erst mit `unterschriften` (bei der echten
 * Übergabe, auf dem Gerät des Werkstattleiters erfasst) entsteht das PDF,
 * das zur echten `Vereinbarung` gehört (Regel 1+2).
 */

const VORLAGE_PFAD = path.join(
  process.cwd(),
  "src/lib/pdf/vorlagen/nutzungsvereinbarung.pdf",
)

export type NutzungsvereinbarungFelder = {
  mieterName: string
  fahrerAbweichend: string
  fahrzeugText: string
  zeitraumText: string
}

export type NutzungsvereinbarungUnterschriften = {
  mieterPng: Uint8Array
  firmaPng: Uint8Array
  ortUndDatum: string
}

export async function nutzungsvereinbarungPdfErzeugen(
  felder: NutzungsvereinbarungFelder,
  unterschriften?: NutzungsvereinbarungUnterschriften,
): Promise<Uint8Array> {
  const vorlage = await readFile(VORLAGE_PFAD)
  const pdf = await PDFDocument.load(vorlage)
  const form = pdf.getForm()

  form.getTextField("mieter_name").setText(felder.mieterName)
  form.getTextField("fahrer_abweichend").setText(felder.fahrerAbweichend)
  form.getTextField("fahrzeug_modell_kennzeichen").setText(felder.fahrzeugText)
  form.getTextField("nutzungszeitraum").setText(felder.zeitraumText)

  if (unterschriften) {
    const schrift = await pdf.embedFont(StandardFonts.Helvetica)
    const zweiteSeite = pdf.getPages()[1]
    await unterschriftMitOrtDatumEinfuegen(
      pdf,
      form,
      zweiteSeite,
      schrift,
      "sig_vermieter_vertrag",
      unterschriften.ortUndDatum,
      unterschriften.firmaPng,
    )
    await unterschriftMitOrtDatumEinfuegen(
      pdf,
      form,
      zweiteSeite,
      schrift,
      "sig_mieter_vertrag",
      unterschriften.ortUndDatum,
      unterschriften.mieterPng,
    )
  }

  return pdf.save()
}
