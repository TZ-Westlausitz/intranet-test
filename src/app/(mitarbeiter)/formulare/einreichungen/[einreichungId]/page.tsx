import { notFound } from "next/navigation"

import { berechtigung } from "@/lib/auth/berechtigung"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import { formatiereDatum, formatiereDatumAusDate, zeitAusDate } from "@/lib/datum"
import { einreichungDetail } from "@/lib/formulare/abfragen"
import { istFormularEmpfaenger } from "@/lib/formulare/sichtbarkeit"
import { einreichungStatusSetzen } from "@/lib/formulare/aktionen"
import { FormularFeld, RICH_TEXT_ANZEIGE_KLASSE } from "@/components/formular-feld"
import { FormularStatusSchieberegler } from "@/components/formular-status-schieberegler"
import { FormularElementTyp } from "@/generated/prisma/enums"

function antwortAnzeige(
  element: { typ: FormularElementTyp; optionen: { wert: string }[] },
  antwort: { wertText: string | null; wertMehrfach: string[]; wertJa: boolean | null } | undefined,
  dateiAnhang: { id: string; dateiname: string } | undefined,
): string {
  if (element.typ === FormularElementTyp.DATEI) return dateiAnhang ? dateiAnhang.dateiname : "(keine Datei)"
  if (!antwort) return "(keine Angabe)"
  if (element.typ === FormularElementTyp.CHECKBOX) return antwort.wertJa ? "Ja" : "Nein"
  if (element.typ === FormularElementTyp.AUSWAHL_MEHRFACH) {
    return antwort.wertMehrfach.length > 0 ? antwort.wertMehrfach.join(", ") : "(keine Angabe)"
  }
  if (element.typ === FormularElementTyp.DATUM && antwort.wertText) return formatiereDatum(antwort.wertText)
  return antwort.wertText?.trim() ? antwort.wertText : "(keine Angabe)"
}

export default async function EinreichungDetailSeite({ params }: { params: Promise<{ einreichungId: string }> }) {
  const kontext = await berechtigung()
  const { einreichungId } = await params

  const einreichung = await einreichungDetail(einreichungId, kontext)
  if (!einreichung) notFound()

  const darfStatusSetzen = await istFormularEmpfaenger(einreichung.vorlageId, kontext.personId)
  const antwortenNachElement = new Map(einreichung.antworten.map((a) => [a.elementId, a]))
  const anhaengeNachElement = new Map(
    einreichung.anhaenge.filter((a) => a.elementId).map((a) => [a.elementId as string, a]),
  )
  const pdfAnhang = einreichung.anhaenge.find((a) => a.elementId === null)

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Kopfleiste />
      <h1 className="text-2xl font-semibold text-ueberschrift">{einreichung.vorlage.titel}</h1>
      <p className="mt-1 text-sm text-sekundaer">
        Eingereicht von {einreichung.eingereichtVon.vorname} {einreichung.eingereichtVon.nachname} am{" "}
        {formatiereDatumAusDate(einreichung.eingereichtAm)}, {zeitAusDate(einreichung.eingereichtAm)} Uhr
      </p>
      {einreichung.vorlage.beschreibung && (
        <div
          className={RICH_TEXT_ANZEIGE_KLASSE + " mt-2 text-primaer"}
          dangerouslySetInnerHTML={{ __html: einreichung.vorlage.beschreibung }}
        />
      )}

      {pdfAnhang && (
        <a
          href={`/api/formulare/einreichungen/${einreichung.id}/anhaenge/${pdfAnhang.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-sm font-medium text-marke-gruen-dunkel hover:underline"
        >
          📄 {pdfAnhang.dateiname} herunterladen
        </a>
      )}

      {darfStatusSetzen && (
        <div className="mt-6 rounded-xl border border-rand bg-flaeche p-4">
          <h2 className="text-sm font-semibold text-ueberschrift">Status</h2>
          <div className="mt-2">
            <FormularStatusSchieberegler einreichungId={einreichung.id} status={einreichung.status} aktion={einreichungStatusSetzen} />
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-4 rounded-xl border border-rand bg-flaeche p-4">
        {einreichung.vorlage.elemente.map((element) => {
          if (element.typ === FormularElementTyp.TEXTBLOCK || element.typ === FormularElementTyp.TRENNZEICHEN) {
            return (
              <div key={element.id} className="border-b border-flaeche-100 pb-4 last:border-0 last:pb-0">
                <FormularFeld element={{ ...element, optionen: [] }} orte={[]} />
              </div>
            )
          }
          const anhang = anhaengeNachElement.get(element.id)
          return (
            <div key={element.id} className="border-b border-flaeche-100 pb-4 last:border-0 last:pb-0">
              <p className="text-xs font-semibold tracking-wide text-tertiaer uppercase">{element.label}</p>
              {element.typ === FormularElementTyp.DATEI && anhang ? (
                <a
                  href={`/api/formulare/einreichungen/${einreichung.id}/anhaenge/${anhang.id}`}
                  className="text-sm text-marke-gruen-dunkel hover:underline"
                >
                  {anhang.dateiname}
                </a>
              ) : (
                <p className="text-sm text-primaer">
                  {antwortAnzeige(element, antwortenNachElement.get(element.id), anhang)}
                </p>
              )}
            </div>
          )
        })}
      </div>

      <ZurueckButton />
    </main>
  )
}
