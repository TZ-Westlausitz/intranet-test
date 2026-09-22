import { notFound } from "next/navigation"

import { berechtigung } from "@/lib/auth/berechtigung"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import { formatiereDatumAusDate, zeitAusDate } from "@/lib/datum"
import {
  meldungDetailFuerMelder,
  meldungDetailFuerKontaktstelle,
  meldungKommentareFuerAnsicht,
} from "@/lib/kontaktstelle/abfragen"
import { istKontaktstelle } from "@/lib/kontaktstelle/sichtbarkeit"
import { meldungStatusAktualisieren, meldungKommentarErstellen } from "@/lib/kontaktstelle/aktionen"
import { MeldungKommentare } from "@/components/meldung-kommentare"
import { MeldungStatus } from "@/generated/prisma/enums"

const STATUS_LABEL: Record<string, string> = {
  EINGEGANGEN: "Eingegangen",
  IN_BEARBEITUNG: "In Bearbeitung",
  ABGESCHLOSSEN: "Abgeschlossen",
}

export default async function MeldungDetailSeite({ params }: { params: Promise<{ meldungId: string }> }) {
  const kontext = await berechtigung()
  const { meldungId } = await params

  const darfAlleSehen = istKontaktstelle(kontext)
  const eigeneMeldung = await meldungDetailFuerMelder(meldungId, kontext)
  const kontaktstelleMeldung = !eigeneMeldung && darfAlleSehen ? await meldungDetailFuerKontaktstelle(meldungId) : null
  const meldung = eigeneMeldung ?? kontaktstelleMeldung
  if (!meldung) notFound()

  const melderName = kontaktstelleMeldung
    ? kontaktstelleMeldung.melder
      ? `${kontaktstelleMeldung.melder.vorname} ${kontaktstelleMeldung.melder.nachname}`
      : "Anonym"
    : null
  const kommentare = await meldungKommentareFuerAnsicht(meldungId, kontext)

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Kopfleiste />
      <h1 className="text-2xl font-semibold text-ueberschrift">{meldung.titel}</h1>
      <p className="mt-1 text-sm text-sekundaer">
        {melderName ? `Gemeldet von ${melderName} am ` : "Von dir gemeldet am "}
        {formatiereDatumAusDate(meldung.erstelltAm)}, {zeitAusDate(meldung.erstelltAm)} Uhr
        {meldung.istAnonym && !melderName ? " (anonym)" : ""}
      </p>

      <p className="mt-4 text-sm whitespace-pre-wrap text-primaer">{meldung.beschreibung}</p>

      {darfAlleSehen && (
        <div className="mt-6 rounded-xl border border-rand bg-flaeche p-4">
          <h2 className="text-sm font-semibold text-ueberschrift">Status</h2>
          <form action={meldungStatusAktualisieren.bind(null, meldungId)} className="mt-2 flex items-center gap-2">
            <select
              key={meldung.status}
              name="status"
              defaultValue={meldung.status}
              className="h-9 rounded-lg border border-flaeche-300 px-2 text-sm"
            >
              {Object.values(MeldungStatus).map((status) => (
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

      <MeldungKommentare meldungId={meldungId} kommentare={kommentare} kommentarAktion={meldungKommentarErstellen} />

      <ZurueckButton />
    </main>
  )
}
