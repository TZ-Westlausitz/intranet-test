import Link from "next/link"

import { berechtigung } from "@/lib/auth/berechtigung"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import { Hinweis } from "@/components/hinweis"
import { MeldungErstellenDialog } from "@/components/meldung-erstellen-dialog"
import { MeldungStatusChip } from "@/components/meldung-status-chip"
import { meineMeldungen, meldungenFuerKontaktstelle } from "@/lib/kontaktstelle/abfragen"
import { meldungErstellen } from "@/lib/kontaktstelle/aktionen"
import { istKontaktstelle } from "@/lib/kontaktstelle/sichtbarkeit"

const FEHLER_TEXTE: Record<string, string> = {
  pflichtfeld: "Bitte Titel und Beschreibung ausfüllen.",
  anhang: "Ein Anhang ist zu groß oder hat einen nicht unterstützten Dateityp.",
}

/**
 * Einstieg in die Kontaktstelle (Meldestelle nach Hinweisgeberschutzgesetz,
 * Rückmeldung 2026-09-22) — eine Route statt eines separaten
 * "/verwalten"-Bereichs: die Kontaktstelle-Sicht ist strukturell "an mich
 * adressierte Einträge", genau wie bei Formularen bereits inline gelöst
 * (siehe formulare/page.tsx), kein eigenständiges Struktur-CRUD wie bei
 * Formular-Vorlagen. "Meine Meldungen" ist für JEDE angemeldete Person da,
 * die zweite Spalte "Alle Meldungen" nur mit der Berechtigung
 * "Meldestelle" (kontext.berechtigungen, siehe berechtigung()).
 */
export default async function KontaktstelleSeite({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string; neu?: string }>
}) {
  const kontext = await berechtigung()
  const { fehler, neu } = await searchParams
  const darfAlleSehen = istKontaktstelle(kontext)

  const [meine, alle] = await Promise.all([
    meineMeldungen(kontext),
    darfAlleSehen ? meldungenFuerKontaktstelle() : Promise.resolve([]),
  ])

  // Funktion statt vorberechnetem JSX, weil dieselbe Kopfzeile unten für
  // Handy UND Desktop gerendert wird (beide <main>-Bäume liegen gleichzeitig
  // im DOM, nur per CSS ausgeblendet) — ein natives <dialog> durchbricht
  // `display:none` beim Eltern-Element (Top-Layer-Rendering), zwei
  // MeldungErstellenDialog-Instanzen mit `autoOeffnen` würden also BEIDE
  // gleichzeitig aufgehen. Deshalb bekommt nur eine der beiden Stellen
  // `autoOeffnen` übergeben (welche, ist egal — die Positionierung des
  // Dialogs ist `fixed`, unabhängig vom umgebenden, ausgeblendeten Baum).
  function kopfzeile(autoOeffnen: boolean) {
    return (
      <div className="flex shrink-0 items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-ueberschrift">Kontaktstelle</h1>
        <MeldungErstellenDialog erstellenAktion={meldungErstellen} autoOeffnen={autoOeffnen} />
      </div>
    )
  }

  return (
    <>
      {/* Handy: einfache, seitenweit scrollende Liste. */}
      <main className="mx-auto max-w-2xl px-5 py-10 md:hidden">
        <Kopfleiste />
        {kopfzeile(neu === "1")}

        {fehler && (
          <div className="mt-4">
            <Hinweis>{FEHLER_TEXTE[fehler] ?? "Das hat nicht geklappt."}</Hinweis>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-6">
          <div className="rounded-xl border border-rand bg-flaeche p-4">
            <h2 className="text-sm font-semibold text-ueberschrift">Meine Meldungen</h2>
            {meine.length === 0 ? (
              <p className="mt-3 text-sm text-sekundaer">Noch keine Meldung abgegeben.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {meine.map((meldung) => (
                  <li key={meldung.id}>
                    <Link
                      href={`/kontaktstelle/${meldung.id}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-rand px-3 py-2 text-sm text-primaer transition hover:border-marke-gruen hover:text-ueberschrift"
                    >
                      {meldung.titel}
                      <MeldungStatusChip status={meldung.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {darfAlleSehen && (
            <div className="rounded-xl border border-rand bg-flaeche p-4">
              <h2 className="text-sm font-semibold text-ueberschrift">Alle Meldungen</h2>
              {alle.length === 0 ? (
                <p className="mt-3 text-sm text-sekundaer">Keine Meldungen eingegangen.</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {alle.map((meldung) => (
                    <li key={meldung.id}>
                      <Link
                        href={`/kontaktstelle/${meldung.id}`}
                        className="flex items-center justify-between gap-2 rounded-lg border border-rand px-3 py-2 text-sm text-primaer transition hover:border-marke-orange hover:text-ueberschrift"
                      >
                        <span>
                          {meldung.titel}
                          <span className="block text-xs text-tertiaer">
                            {meldung.melder ? `${meldung.melder.vorname} ${meldung.melder.nachname}` : "Anonym"}
                          </span>
                        </span>
                        <MeldungStatusChip status={meldung.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <ZurueckButton />
      </main>

      {/* Tablet/Desktop: Kachel-Design wie die Startseite, volle Höhe. */}
      <main className="hidden h-full flex-col md:flex">
        <div className="flex flex-1 flex-col overflow-auto bg-gradient-to-br from-marke-gruen/5 via-background to-marke-orange/5 p-6">
          <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col">
            {kopfzeile(false)}

            {fehler && (
              <div className="mt-4">
                <Hinweis>{FEHLER_TEXTE[fehler] ?? "Das hat nicht geklappt."}</Hinweis>
              </div>
            )}

            <div className={"mt-6 grid min-h-0 flex-1 gap-6 " + (darfAlleSehen ? "grid-cols-2" : "grid-cols-1")}>
              <section className="flex min-h-0 flex-col rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-gruen bg-flaeche p-4 shadow-sm">
                <h2 className="shrink-0 text-lg font-semibold text-ueberschrift">Meine Meldungen</h2>
                {meine.length === 0 ? (
                  <p className="mt-2 text-sm text-sekundaer">Noch keine Meldung abgegeben.</p>
                ) : (
                  <ul className="mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
                    {meine.map((meldung) => (
                      <li key={meldung.id}>
                        <Link
                          href={`/kontaktstelle/${meldung.id}`}
                          className="flex items-center justify-between gap-2 rounded-xl border border-rand px-3 py-2.5 text-sm text-primaer transition hover:border-marke-gruen-dunkel hover:text-ueberschrift"
                        >
                          <span className="truncate">{meldung.titel}</span>
                          <MeldungStatusChip status={meldung.status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {darfAlleSehen && (
                <section className="flex min-h-0 flex-col rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-orange bg-flaeche p-4 shadow-sm">
                  <h2 className="shrink-0 text-lg font-semibold text-ueberschrift">Alle Meldungen</h2>
                  {alle.length === 0 ? (
                    <p className="mt-2 text-sm text-sekundaer">Keine Meldungen eingegangen.</p>
                  ) : (
                    <ul className="mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
                      {alle.map((meldung) => (
                        <li key={meldung.id}>
                          <Link
                            href={`/kontaktstelle/${meldung.id}`}
                            className="flex items-center justify-between gap-2 rounded-xl border border-rand px-3 py-2.5 text-sm text-primaer transition hover:border-marke-orange hover:text-ueberschrift"
                          >
                            <span className="min-w-0">
                              <span className="block truncate">{meldung.titel}</span>
                              <span className="block truncate text-xs text-tertiaer">
                                {meldung.melder ? `${meldung.melder.vorname} ${meldung.melder.nachname}` : "Anonym"}
                              </span>
                            </span>
                            <MeldungStatusChip status={meldung.status} />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
