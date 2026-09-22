import { notFound } from "next/navigation"

import { berechtigung } from "@/lib/auth/berechtigung"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import { formatiereDatumAusDate, zeitAusDate } from "@/lib/datum"
import {
  meldungDetailFuerMelder,
  meldungDetailFuerKontaktstelle,
  meldungVerlaufFuerAnsicht,
  meldungUngeleseneAnzahl,
} from "@/lib/kontaktstelle/abfragen"
import { istKontaktstelle } from "@/lib/kontaktstelle/sichtbarkeit"
import {
  meldungStatusAktualisieren,
  meldungKommentarErstellen,
  meldungVerlaufLaden,
  meldungAlsGelesenMarkieren,
  meldungAbschlussBestaetigen,
} from "@/lib/kontaktstelle/aktionen"
import { meldungChatAktiv, meldungWartetAufBestaetigung, meldungEndgueltigArchiviert } from "@/lib/kontaktstelle/status"
import { MeldungKommentare } from "@/components/meldung-kommentare"
import { MeldungStatusChip } from "@/components/meldung-status-chip"
import { MeldungStatusSchieberegler } from "@/components/meldung-status-schieberegler"
import { MeldungAbschlussAbfrage } from "@/components/meldung-abschluss-abfrage"

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
  // ungeleseneAnzahl MUSS vor dem Rendern gelesen werden, mit dem Gelesen-
  // Stand von VOR diesem Besuch — MeldungKommentare markiert client-seitig
  // erst beim Einhängen als gelesen (siehe dort), die hier berechnete Zahl
  // bleibt für die Dauer des Besuchs unverändert stehen.
  const [verlauf, ungeleseneAnzahl] = await Promise.all([
    meldungVerlaufFuerAnsicht(meldungId, kontext),
    meldungUngeleseneAnzahl(meldungId, kontext.personId),
  ])

  // Chat erst ab "In Bearbeitung" nutzbar, bei endgültig archivierter
  // Meldung nie wieder (Rückmeldung 2026-09-22) — auch serverseitig in
  // meldungKommentarErstellen geprüft (Regel 5).
  const chatAktiv = meldungChatAktiv(meldung)
  const wartetAufBestaetigung = meldungWartetAufBestaetigung(meldung)
  const endgueltigArchiviert = meldungEndgueltigArchiviert(meldung)
  const chatInaktivHinweis = endgueltigArchiviert
    ? "Dieser Vorgang ist abgeschlossen und wird nur noch zur Archivierung angezeigt."
    : "Der Chat wird freigeschaltet, sobald die Meldung „In Bearbeitung“ ist."

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Kopfleiste />
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold text-ueberschrift">{meldung.titel}</h1>
        {/* Der Melder sieht nur den Status (Rückmeldung 2026-09-22) — die
            editierbare Variante steht weiter unten nur für die Kontaktstelle. */}
        {!darfAlleSehen && (
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            <MeldungStatusChip status={meldung.status} />
            {endgueltigArchiviert && <span className="text-[11px] text-tertiaer">archiviert</span>}
          </div>
        )}
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
            {endgueltigArchiviert ? (
              <p className="text-sm text-sekundaer">
                Abgeschlossen — vom Melder als geklärt bestätigt, dauerhaft archiviert und nicht mehr änderbar.
              </p>
            ) : (
              <MeldungStatusSchieberegler meldungId={meldungId} status={meldung.status} aktion={meldungStatusAktualisieren} />
            )}
          </div>
        </div>
      )}

      {/* Nur für die meldende Person selbst, nur solange unbeantwortet (Rückmeldung 2026-09-22). */}
      {eigeneMeldung && wartetAufBestaetigung && (
        <MeldungAbschlussAbfrage meldungId={meldungId} aktion={meldungAbschlussBestaetigen} />
      )}

      <MeldungKommentare
        meldungId={meldungId}
        anfangsEintraege={verlauf}
        anfangsChatAktiv={chatAktiv}
        chatInaktivHinweis={chatInaktivHinweis}
        ungeleseneAnzahl={ungeleseneAnzahl}
        verlaufLadenAktion={meldungVerlaufLaden}
        alsGelesenMarkierenAktion={meldungAlsGelesenMarkieren}
        kommentarAktion={meldungKommentarErstellen}
      />

      <ZurueckButton />
    </main>
  )
}
