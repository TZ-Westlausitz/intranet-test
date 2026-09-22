import { notFound } from "next/navigation"

import { berechtigung } from "@/lib/auth/berechtigung"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import { formatiereDatumAusDate, zeitAusDate } from "@/lib/datum"
import {
  meldungDetailFuerMelder,
  meldungDetailFuerKontaktstelle,
  meldungVerlaufFuerAnsicht,
} from "@/lib/kontaktstelle/abfragen"
import { istKontaktstelle } from "@/lib/kontaktstelle/sichtbarkeit"
import { meldungStatusAktualisieren, meldungKommentarErstellen } from "@/lib/kontaktstelle/aktionen"
import { MeldungKommentare } from "@/components/meldung-kommentare"
import { MeldungStatusChip } from "@/components/meldung-status-chip"
import { MeldungStatusSchieberegler } from "@/components/meldung-status-schieberegler"
import { MeldungStatus } from "@/generated/prisma/enums"

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
  const verlauf = await meldungVerlaufFuerAnsicht(meldungId, kontext)
  // Chat erst ab "In Bearbeitung" nutzbar (Rückmeldung 2026-09-22) — auch
  // serverseitig in meldungKommentarErstellen geprüft (Regel 5).
  const chatAktiv = meldung.status !== MeldungStatus.EINGEGANGEN

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Kopfleiste />
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold text-ueberschrift">{meldung.titel}</h1>
        {/* Der Melder sieht nur den Status (Rückmeldung 2026-09-22) — die
            editierbare Variante steht weiter unten nur für die Kontaktstelle. */}
        {!darfAlleSehen && <MeldungStatusChip status={meldung.status} />}
      </div>
      <p className="mt-1 text-sm text-sekundaer">
        {melderName ? `Gemeldet von ${melderName} am ` : "Von dir gemeldet am "}
        {formatiereDatumAusDate(meldung.erstelltAm)}, {zeitAusDate(meldung.erstelltAm)} Uhr
        {meldung.istAnonym && !melderName ? " (anonym)" : ""}
      </p>

      <p className="mt-4 text-sm whitespace-pre-wrap text-primaer">{meldung.beschreibung}</p>

      {darfAlleSehen && (
        <div className="mt-6 rounded-xl border border-rand bg-flaeche p-4">
          <h2 className="text-sm font-semibold text-ueberschrift">Status</h2>
          <div className="mt-2">
            <MeldungStatusSchieberegler meldungId={meldungId} status={meldung.status} aktion={meldungStatusAktualisieren} />
          </div>
        </div>
      )}

      <MeldungKommentare
        meldungId={meldungId}
        eintraege={verlauf}
        chatAktiv={chatAktiv}
        kommentarAktion={meldungKommentarErstellen}
      />

      <ZurueckButton />
    </main>
  )
}
