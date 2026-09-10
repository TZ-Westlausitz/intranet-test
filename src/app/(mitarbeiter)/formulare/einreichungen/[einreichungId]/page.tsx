import { notFound } from "next/navigation"

import { berechtigung } from "@/lib/auth/berechtigung"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import { formatiereDatum, formatiereDatumAusDate, zeitAusDate } from "@/lib/datum"
import { einreichungDetail } from "@/lib/formulare/abfragen"
import { istFormularEmpfaenger } from "@/lib/formulare/sichtbarkeit"
import { einreichungStatusSetzen } from "@/lib/formulare/aktionen"
import { FormularFeld, RICH_TEXT_ANZEIGE_KLASSE } from "@/components/formular-feld"
import { FormularElementTyp, FormularEinreichungStatus } from "@/generated/prisma/enums"

const STATUS_LABEL: Record<string, string> = { OFFEN: "Offen", IN_BEARBEITUNG: "In Bearbeitung", ERLEDIGT: "Erledigt" }

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
      <Kopfleiste name={kontext.name} />
      <h1 className="text-2xl font-semibold text-marke-grau">{einreichung.vorlage.titel}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Eingereicht von {einreichung.eingereichtVon.vorname} {einreichung.eingereichtVon.nachname} am{" "}
        {formatiereDatumAusDate(einreichung.eingereichtAm)}, {zeitAusDate(einreichung.eingereichtAm)} Uhr
      </p>
      {einreichung.vorlage.beschreibung && (
        <div
          className={RICH_TEXT_ANZEIGE_KLASSE + " mt-2 text-neutral-600"}
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

      <div className="mt-6 flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-4">
        {einreichung.vorlage.elemente.map((element) => {
          if (element.typ === FormularElementTyp.TEXTBLOCK || element.typ === FormularElementTyp.TRENNZEICHEN) {
            return (
              <div key={element.id} className="border-b border-neutral-100 pb-4 last:border-0 last:pb-0">
                <FormularFeld element={{ ...element, optionen: [] }} orte={[]} />
              </div>
            )
          }
          const anhang = anhaengeNachElement.get(element.id)
          return (
            <div key={element.id} className="border-b border-neutral-100 pb-4 last:border-0 last:pb-0">
              <p className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">{element.label}</p>
              {element.typ === FormularElementTyp.DATEI && anhang ? (
                <a
                  href={`/api/formulare/einreichungen/${einreichung.id}/anhaenge/${anhang.id}`}
                  className="text-sm text-marke-gruen-dunkel hover:underline"
                >
                  {anhang.dateiname}
                </a>
              ) : (
                <p className="text-sm text-neutral-700">
                  {antwortAnzeige(element, antwortenNachElement.get(element.id), anhang)}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {darfStatusSetzen && (
        <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-marke-grau">Status</h2>
          <form action={async (formData) => {
            "use server"
            await einreichungStatusSetzen(einreichung.id, formData.get("status") as FormularEinreichungStatus)
          }} className="mt-2 flex items-center gap-2">
            <select
              key={einreichung.status}
              name="status"
              defaultValue={einreichung.status}
              className="h-9 rounded-lg border border-neutral-300 px-2 text-sm"
            >
              {Object.values(FormularEinreichungStatus).map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABEL[status]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-9 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
            >
              Speichern
            </button>
          </form>
        </div>
      )}

      <ZurueckButton />
    </main>
  )
}
