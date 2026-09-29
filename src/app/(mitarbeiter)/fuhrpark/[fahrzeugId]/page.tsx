import Link from "next/link"
import { notFound } from "next/navigation"

import { berechtigung } from "@/lib/auth/berechtigung"
import { berlinerTagesbeginn, datumIsoAusDate, formatiereDatumAusDate } from "@/lib/datum"
import { STATUS_TEXT } from "@/lib/ausleihe-status"
import { formatiereCentAlsEuro } from "@/lib/geld"
import { fahrzeugProfil, fuhrparkFormularOptionen } from "@/lib/fuhrpark/abfragen"
import {
  fahrzeugAktualisieren,
  fahrzeugschadenBehobenSetzen,
  fahrzeugschadenErfassen,
  fahrzeugTerminVorschlagen,
  fahrzeugTerminAnnehmen,
  fahrzeugTerminNeuenSuchen,
} from "@/lib/fuhrpark/aktionen"
import { reifenHinweis, REIFENART_TEXT, FAHRZEUGTERMIN_ART_TEXT } from "@/lib/fuhrpark/fristen"
import { fuhrparkRechte } from "@/lib/fuhrpark/zugriff"
import { FristAnzeige } from "@/components/fuhrpark/frist-anzeige"
import { Schadensskizze } from "@/components/schadensskizze"
import { FahrzeugFormularFelder } from "@/components/fuhrpark/fahrzeug-formular"
import { TerminVorschlagenDialog } from "@/components/fuhrpark/termin-vorschlagen-dialog"
import { TerminvorschlagKarte } from "@/components/fuhrpark/terminvorschlag-karte"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import { FormularAenderungenSchutz } from "@/components/formular-aenderungen-schutz"

const FEHLER_TEXTE: Record<string, string> = {
  pflichtfeld: "Kennzeichen und Fahrzeugname sind Pflichtfelder.",
  kennzeichenVergeben: "Dieses Kennzeichen gibt es bereits im Fuhrpark.",
  standortUngueltig: "Der gewählte Standort existiert nicht (mehr).",
  halterUngueltig: "Der gewählte Halter ist nicht (mehr) aktiv.",
  schadenPflichtfeld: "Bitte mindestens eine Schadensstelle in der Skizze markieren und beschreiben.",
  keinHalter: "Dieses Fahrzeug hat keinen Halter — bitte das Datum direkt unten in „Fahrzeug bearbeiten“ eintragen.",
  terminPflichtfeld: "Bitte Art und Datum des Termins angeben.",
}

const RICHTUNG_TEXT: Record<string, string> = { AUSGABE: "Übergabe", RUECKNAHME: "Rücknahme" }

/**
 * Fahrzeugprofil: wohin das Fahrzeug gehört, Fristen (TÜV/Service/Reifen),
 * Schäden — auch außerhalb von Mietfahrten — und bei Mietfahrzeugen der
 * Mietverlauf mit Verweis auf die Vorgänge und damit die Verträge.
 *
 * Sichtbar für die Werkstatt, Lesende ("Fahrzeuge lesen") und den Halter
 * des Fahrzeugs (siehe fahrzeugProfil). Den Mietverlauf mit Namen der
 * Entleihenden sehen nur die Berechtigten für "alle Fahrzeuge", ein Halter
 * nicht. Verlinkt auf die Vorgänge wird nur für die Werkstatt, die sie
 * öffnen darf. Bearbeiten: nur Werkstattleitung. Kein Fahrtenbuch (Regel 10).
 */
export default async function FahrzeugProfilSeite({
  params,
  searchParams,
}: {
  params: Promise<{ fahrzeugId: string }>
  searchParams: Promise<{ fehler?: string; vorschlag?: string }>
}) {
  const kontext = await berechtigung()
  const { fahrzeugId } = await params
  const { fehler, vorschlag: hervorgehobenerVorschlagId } = await searchParams

  const profil = await fahrzeugProfil(kontext, fahrzeugId)
  if (!profil) notFound()

  const { fahrzeug, ausleihen, protokollSchaeden, darfMietverlaufSehen, offeneTerminvorschlaege, terminHistorie } =
    profil
  const { darfBearbeiten } = fuhrparkRechte(kontext)
  const eigenerHalter = fahrzeug.halterId === kontext.personId
  const darfSchadenErfassen = darfBearbeiten || eigenerHalter
  const heute = berlinerTagesbeginn()
  const hinweis = reifenHinweis(fahrzeug.reifenart, heute)
  const optionen = darfBearbeiten ? await fuhrparkFormularOptionen() : null

  const offeneSchaeden = fahrzeug.schaeden.filter((s) => s.behobenAm === null)
  const behobeneSchaeden = fahrzeug.schaeden.filter((s) => s.behobenAm !== null)

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Kopfleiste />

      <p className="text-sm">
        <Link href="/fuhrpark" className="text-sekundaer hover:text-marke-gruen-dunkel">
          ← Fuhrpark
        </Link>
      </p>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-2xl font-semibold text-ueberschrift">{fahrzeug.bezeichnung}</h1>
        <span className="text-lg text-sekundaer">{fahrzeug.kennzeichen}</span>
        {fahrzeug.fuerPrivatausleiheFreigegeben && (
          <span className="rounded-full bg-marke-gruen/15 px-2 py-0.5 text-xs font-medium text-marke-gruen-dunkel">Mietpark</span>
        )}
        {!fahrzeug.aktiv && (
          <span className="rounded-full bg-flaeche-100 px-2 py-0.5 text-xs font-medium text-tertiaer">ausgemustert</span>
        )}
      </div>

      {fehler && (
        <p role="alert" className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
          {FEHLER_TEXTE[fehler] ?? "Das hat nicht geklappt."}
        </p>
      )}

      <section className="mt-6 rounded-xl border border-rand bg-flaeche p-4">
        <h2 className="text-sm font-semibold text-ueberschrift">Zuordnung</h2>
        <dl className="mt-2 flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-4 border-b border-flaeche-100 pb-2">
            <dt className="text-sekundaer">Standort</dt>
            <dd className="text-right font-medium">{fahrzeug.ort?.name ?? "Kein fester Standort"}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-flaeche-100 pb-2">
            <dt className="text-sekundaer">Halter / verantwortlich</dt>
            <dd className="text-right font-medium">
              {fahrzeug.halter ? `${fahrzeug.halter.vorname} ${fahrzeug.halter.nachname}` : "Kein fester Halter"}
            </dd>
          </div>
          {fahrzeug.zuordnungHinweis && (
            <div className="flex justify-between gap-4 border-b border-flaeche-100 pb-2">
              <dt className="text-sekundaer">Hinweis</dt>
              <dd className="text-right font-medium">{fahrzeug.zuordnungHinweis}</dd>
            </div>
          )}
          {fahrzeug.sitzplaetze && (
            <div className="flex justify-between gap-4 border-b border-flaeche-100 pb-2">
              <dt className="text-sekundaer">Sitzplätze</dt>
              <dd className="font-medium">{fahrzeug.sitzplaetze}</dd>
            </div>
          )}
          {(fahrzeug.kraftstoffart || fahrzeug.tankgroesseLiter) && (
            <div className="flex justify-between gap-4 border-b border-flaeche-100 pb-2">
              <dt className="text-sekundaer">Kraftstoff</dt>
              <dd className="font-medium">
                {[fahrzeug.kraftstoffart, fahrzeug.tankgroesseLiter ? `Tank ${fahrzeug.tankgroesseLiter} l` : null].filter(Boolean).join(" · ")}
              </dd>
            </div>
          )}
          {fahrzeug.merkmale && (
            <div className="flex justify-between gap-4 border-b border-flaeche-100 pb-2">
              <dt className="text-sekundaer">Merkmale</dt>
              <dd className="text-right font-medium">{fahrzeug.merkmale}</dd>
            </div>
          )}
          {darfMietverlaufSehen && fahrzeug.bruttolistenpreisCent !== null && (
            <div className="flex justify-between gap-4">
              <dt className="text-sekundaer">Bruttolistenpreis</dt>
              <dd className="font-medium">{formatiereCentAlsEuro(fahrzeug.bruttolistenpreisCent)}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="mt-4 rounded-xl border border-rand bg-flaeche p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-ueberschrift">Termine und Reifen</h2>
          {darfBearbeiten && fahrzeug.halterId && (
            <TerminVorschlagenDialog aktion={fahrzeugTerminVorschlagen.bind(null, fahrzeug.id)} />
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <FristAnzeige label="TÜV" faelligAm={fahrzeug.huFaelligAm} heute={heute} />
          <FristAnzeige label="Service" faelligAm={fahrzeug.serviceFaelligAm} heute={heute} />
          <span className="inline-flex items-center rounded-full bg-flaeche-100 px-2.5 py-1 text-xs font-medium text-primaer">
            {fahrzeug.reifenart ? REIFENART_TEXT[fahrzeug.reifenart] : "Reifen: nicht angegeben"}
          </span>
        </div>
        {hinweis && <p className="mt-2 text-xs text-sekundaer">{hinweis}</p>}
        {darfBearbeiten && !fahrzeug.halterId && (
          <p className="mt-2 text-xs text-tertiaer">
            Kein Halter eingetragen — Termine bitte direkt unten in „Fahrzeug bearbeiten“ eintragen.
          </p>
        )}

        {offeneTerminvorschlaege.length > 0 && (
          <>
            <h3 className="mt-4 text-xs font-semibold tracking-wide text-sekundaer uppercase">Offene Terminvorschläge</h3>
            <ul className="mt-2 flex flex-col gap-2">
              {offeneTerminvorschlaege.map((v) => (
                <TerminvorschlagKarte
                  key={v.id}
                  vorschlag={{
                    id: v.id,
                    art: v.art,
                    artText: FAHRZEUGTERMIN_ART_TEXT[v.art] ?? v.art,
                    datum: v.datum,
                    fahrzeugText: `${fahrzeug.bezeichnung} (${fahrzeug.kennzeichen})`,
                    vorgeschlagenVonName: `${v.vorgeschlagenVon.vorname} ${v.vorgeschlagenVon.nachname}`,
                    darfEntscheiden: v.empfaengerId === kontext.personId,
                  }}
                  annehmenAktion={fahrzeugTerminAnnehmen}
                  neuenTerminAktion={fahrzeugTerminNeuenSuchen}
                  autoOeffnen={v.id === hervorgehobenerVorschlagId}
                />
              ))}
            </ul>
          </>
        )}

        <h3 className="mt-4 text-xs font-semibold tracking-wide text-sekundaer uppercase">Letzte Termine</h3>
        <table className="mt-2 w-full text-left text-sm">
          <tbody>
            {terminHistorie.map(({ art, letzter }) => (
              <tr key={art} className="border-b border-flaeche-100 last:border-0">
                <th scope="row" className="py-1.5 pr-3 font-medium text-primaer">
                  {FAHRZEUGTERMIN_ART_TEXT[art]}
                </th>
                <td className="py-1.5 text-sekundaer">
                  {letzter ? formatiereDatumAusDate(letzter.datum) : "noch keiner dokumentiert"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-4 rounded-xl border border-rand bg-flaeche p-4">
        <h2 className="text-sm font-semibold text-ueberschrift">Schäden</h2>

        {offeneSchaeden.length === 0 && protokollSchaeden.length === 0 && behobeneSchaeden.length === 0 && (
          <p className="mt-2 text-sm text-sekundaer">Keine Schäden dokumentiert.</p>
        )}

        {offeneSchaeden.length > 0 && (
          <ul className="mt-2 flex flex-col gap-2">
            {offeneSchaeden.map((s) => (
              <li key={s.id} className="rounded-lg border border-marke-orange px-3 py-2 text-sm">
                <p className="font-medium text-ueberschrift">
                  {s.position} <span className="font-normal text-tertiaer">· offen</span>
                </p>
                <p className="text-primaer">{s.beschreibung}</p>
                <p className="mt-0.5 text-xs text-tertiaer">
                  Festgestellt am {formatiereDatumAusDate(s.festgestelltAm)} · gemeldet von {s.gemeldetVon.vorname} {s.gemeldetVon.nachname}
                </p>
                {darfBearbeiten && (
                  <form action={fahrzeugschadenBehobenSetzen.bind(null, s.id, true)} className="mt-1">
                    <button type="submit" className="text-xs font-medium text-marke-gruen-dunkel hover:underline">
                      Als behoben markieren
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}

        {behobeneSchaeden.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-medium text-sekundaer">Behobene Schäden ({behobeneSchaeden.length})</summary>
            <ul className="mt-2 flex flex-col gap-2">
              {behobeneSchaeden.map((s) => (
                <li key={s.id} className="rounded-lg border border-rand px-3 py-2 text-sm">
                  <p className="font-medium text-ueberschrift">{s.position}</p>
                  <p className="text-primaer">{s.beschreibung}</p>
                  <p className="mt-0.5 text-xs text-tertiaer">
                    Festgestellt am {formatiereDatumAusDate(s.festgestelltAm)} · behoben am {formatiereDatumAusDate(s.behobenAm!)}
                  </p>
                  {darfBearbeiten && (
                    <form action={fahrzeugschadenBehobenSetzen.bind(null, s.id, false)} className="mt-1">
                      <button type="submit" className="text-xs font-medium text-sekundaer hover:underline">
                        Wieder öffnen
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </details>
        )}

        {protokollSchaeden.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-medium text-sekundaer">
              Aus Übergabeprotokollen der Mietfahrten ({protokollSchaeden.length})
            </summary>
            <ul className="mt-2 flex flex-col gap-2">
              {protokollSchaeden.map((s) => (
                <li key={s.id} className="rounded-lg border border-rand px-3 py-2 text-sm">
                  <p className="font-medium text-ueberschrift">{s.position}</p>
                  <p className="text-primaer">{s.beschreibung}</p>
                  <p className="mt-0.5 text-xs text-tertiaer">
                    {RICHTUNG_TEXT[s.richtung] ?? s.richtung} am {formatiereDatumAusDate(s.zeitpunkt)}
                    {s.neuAufgefallen ? " · bei der Rücknahme neu aufgefallen" : ""}
                    {s.ausleiheId && (
                      <>
                        {" · "}
                        <Link href={`/ausleihen/${s.ausleiheId}`} className="text-marke-gruen-dunkel hover:underline">
                          Vorgang {s.vorgangsnummer}
                        </Link>
                      </>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          </details>
        )}

        {darfSchadenErfassen && (
          <details className="mt-4 rounded-lg border border-rand px-3 py-2" open={fehler === "schadenPflichtfeld"}>
            <summary className="cursor-pointer text-sm font-medium text-primaer">Schaden erfassen</summary>
            <form action={fahrzeugschadenErfassen.bind(null, fahrzeug.id)} className="mt-3 flex flex-col gap-3">
              <p className="text-sm text-sekundaer">
                Auf die Skizze tippen, um eine Schadensstelle zu markieren — wie beim Übergabeprotokoll.
              </p>
              <Schadensskizze name="schadenspunkte" fahrzeugtyp={fahrzeug.fahrzeugtyp} />
              <label className="flex flex-col gap-1 text-sm font-medium text-primaer">
                Festgestellt am
                <input type="date" name="festgestelltAm" defaultValue={datumIsoAusDate(heute)} className="h-10 rounded-lg border border-flaeche-300 bg-flaeche px-3 text-sm" />
              </label>
              <button type="submit" className="h-10 w-fit rounded-lg bg-marke-gruen px-4 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel">
                Schaden speichern
              </button>
            </form>
          </details>
        )}
      </section>

      {darfMietverlaufSehen && (fahrzeug.fuerPrivatausleiheFreigegeben || ausleihen.length > 0) && (
        <section className="mt-4 rounded-xl border border-rand bg-flaeche p-4">
          <h2 className="text-sm font-semibold text-ueberschrift">Mietverlauf (private Ausleihen)</h2>
          {ausleihen.length === 0 ? (
            <p className="mt-2 text-sm text-sekundaer">Noch nicht ausgeliehen.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {ausleihen.map((a) => (
                <li key={a.id} className="rounded-lg border border-rand px-3 py-2 text-sm">
                  <p className="font-medium text-ueberschrift">
                    {formatiereDatumAusDate(a.geplantVon)} – {formatiereDatumAusDate(a.geplantBis)}
                    <span className="ml-2 font-normal text-sekundaer">
                      {a.entleiher.vorname} {a.entleiher.nachname}
                    </span>
                  </p>
                  <p className="text-xs text-tertiaer">
                    {STATUS_TEXT[a.status] ?? a.status}
                    {" · "}
                    {darfBearbeiten ? (
                      <Link href={`/ausleihen/${a.id}`} className="text-marke-gruen-dunkel hover:underline">
                        Vorgang {a.vorgangsnummer} mit Vertrag öffnen
                      </Link>
                    ) : (
                      <>Vorgang {a.vorgangsnummer}</>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {darfBearbeiten && optionen && (
        <details className="mt-6 rounded-xl border border-rand bg-flaeche p-4" open={fehler !== undefined && fehler !== "schadenPflichtfeld"}>
          <summary className="cursor-pointer text-sm font-semibold text-ueberschrift">Fahrzeug bearbeiten</summary>
          <form action={fahrzeugAktualisieren.bind(null, fahrzeug.id)} className="mt-4 flex flex-col gap-6">
            <FahrzeugFormularFelder optionen={optionen} mitAktiv standard={fahrzeug} />
            <button type="submit" className="h-10 w-fit rounded-lg bg-marke-gruen px-5 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel">
              Speichern
            </button>
            <FormularAenderungenSchutz />
          </form>
        </details>
      )}

      <ZurueckButton />
    </main>
  )
}
