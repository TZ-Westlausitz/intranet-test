import type { PDFDocument, PDFFont, PDFForm, PDFPage } from "pdf-lib"
import { rgb } from "pdf-lib"

/**
 * Zeichnet Unterschrift + "Ort, Datum" in die Fläche eines Textfelds — Text
 * linksbündig, Unterschrift rechts daneben, seitenverhältnistreu in die
 * schmale Zeile gepresst wie im echten Papierformular. Das Textfeld selbst
 * bleibt leer, die Vorlage druckt "Ort, Datum, Unterschrift ..." schon als
 * Beschriftung darunter.
 *
 * Gemeinsam genutzt von Nutzungsvereinbarung und Übergabeprotokoll — beide
 * Vorlagen haben für ihre Unterschriftfelder dieselbe schmale Feldform.
 */
export async function unterschriftMitOrtDatumEinfuegen(
  pdf: PDFDocument,
  form: PDFForm,
  seite: PDFPage,
  schrift: PDFFont,
  feldName: string,
  ortUndDatum: string,
  pngBytes: Uint8Array,
) {
  const textGroesse = 7
  const rect = form.getTextField(feldName).acroField.getWidgets()[0].getRectangle()

  seite.drawText(ortUndDatum, {
    x: rect.x + 2,
    y: rect.y + (rect.height - textGroesse) / 2,
    size: textGroesse,
    font: schrift,
    color: rgb(0.15, 0.15, 0.15),
  })

  const textBreite = schrift.widthOfTextAtSize(ortUndDatum, textGroesse)
  const bild = await pdf.embedPng(pngBytes)
  const verfuegbareBreite = rect.width - textBreite - 10
  const skala = Math.min(verfuegbareBreite / bild.width, rect.height / bild.height)
  const breite = bild.width * skala
  const hoehe = bild.height * skala
  seite.drawImage(bild, {
    x: rect.x + textBreite + 8,
    y: rect.y + (rect.height - hoehe) / 2,
    width: breite,
    height: hoehe,
  })
}
