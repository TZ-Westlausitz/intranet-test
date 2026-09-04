import { redirect } from "next/navigation"
import { createHash } from "node:crypto"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { dateiAblegen, dateiLesen, dateiLoeschen } from "@/lib/ablage"
import { formatiereDatumAusDate } from "@/lib/datum"
import {
  ausgabeDatenZuFeldern,
  ruecknahmeDatenZuFeldern,
  uebergabeprotokollPdfErzeugen,
  type AusgabeEntwurfDaten,
  type RuecknahmeEntwurfDaten,
} from "@/lib/pdf/uebergabeprotokoll"
import { geldwerterVorteilCentBerechnen, kalendertageBerechnen } from "@/lib/steuer/geldwerter-vorteil"
import {
  AusleiheStatus,
  DokumentArt,
  Protokollrichtung,
  Rolle,
  Tankfuellung,
} from "@/generated/prisma/enums"
import { Kopfleiste } from "@/components/kopfleiste"
import { Hinweis } from "@/components/hinweis"
import { ZurueckButton } from "@/components/zurueck-button"
import { ZweiUnterschriften } from "@/components/zwei-unterschriften"

/**
 * Die echte, rechtsverbindliche Unterschrift des Übergabeprotokolls
 * (Rücknahme-Teil) — analog zur Ausgabe-Unterschrift, aber das PDF muss
 * jetzt BEIDE Hälften zeigen. Da jede Signatur ihr eigenes, unveränderliches
 * Snapshot-PDF bekommt (Regel 2), zeichnen wir die Ausgabe-Unterschriften
 * aus ihren gespeicherten PNGs hier erneut mit — sonst würden sie aus dem
 * neu erzeugten, jetzt kompletten PDF verschwinden.
 */

function dataUrlZuBytes(dataUrl: string): Uint8Array {
  const base64Teil = dataUrl.split(",")[1] ?? ""
  return new Uint8Array(Buffer.from(base64Teil, "base64"))
}

async function ruecknahmeprotokollUnterschreiben(formData: FormData) {
  "use server"

  const kontext = await berechtigung([Rolle.WERKSTATTLEITER, Rolle.ADMINISTRATION])
  const ausleiheId = String(formData.get("ausleiheId") ?? "")

  const ausleihe = await prisma.ausleihe.findUniqueOrThrow({
    where: { id: ausleiheId },
    include: { fahrzeug: true, entleiher: true, protokolle: true },
  })

  const ausgabeDaten = ausleihe.ausgabeprotokollEntwurfDaten as AusgabeEntwurfDaten | null
  const ruecknahmeDaten = ausleihe.ruecknahmeprotokollEntwurfDaten as RuecknahmeEntwurfDaten | null
  const ausgabeProtokoll = ausleihe.protokolle.find((p) => p.richtung === Protokollrichtung.AUSGABE)

  // Über die UI nicht erreichbar — trotzdem serverseitig prüfen (Regel 5).
  if (ausleihe.status !== AusleiheStatus.UEBERGEBEN || !ausgabeDaten || !ruecknahmeDaten || !ausgabeProtokoll) {
    redirect(`/ausleihen/${ausleiheId}`)
  }

  const mieterDataUrl = String(formData.get("unterschriftMieter") ?? "")
  const firmaDataUrl = String(formData.get("unterschriftFirma") ?? "")
  if (!mieterDataUrl || !firmaDataUrl) {
    redirect(`/ausleihen/${ausleiheId}/ruecknahmeprotokoll-unterschreiben`)
  }

  const mieterPng = dataUrlZuBytes(mieterDataUrl)
  const firmaPng = dataUrlZuBytes(firmaDataUrl)
  const ortUndDatum = `${ruecknahmeDaten.ort}, ${formatiereDatumAusDate(new Date(ruecknahmeDaten.datumUhrzeit))}`

  // Die aktuell gültige Version — nicht zwingend dieselbe, die bei der
  // Ausgabe galt (Regel 1).
  const dokumentversion = await prisma.dokumentversion.findFirstOrThrow({
    where: {
      dokument: { art: DokumentArt.UEBERGABEPROTOKOLL, aktiv: true },
      freigegebenAm: { not: null },
      gueltigAb: { lte: new Date() },
    },
    orderBy: { versionsnummer: "desc" },
  })

  const ausgabeMieterPng = await dateiLesen(ausgabeProtokoll.unterschriftEntleiherPfad)
  const ausgabeFirmaPng = await dateiLesen(ausgabeProtokoll.unterschriftFirmaPfad)
  const ausgabeOrtUndDatum = `${ausgabeDaten.ort}, ${formatiereDatumAusDate(new Date(ausgabeDaten.datumUhrzeit))}`

  const ausgabeFelder = ausgabeDatenZuFeldern(ausgabeDaten, {
    fahrzeugText: `${ausleihe.fahrzeug.bezeichnung} (${ausleihe.fahrzeug.kennzeichen})`,
    mieterName: `${ausleihe.entleiher.vorname} ${ausleihe.entleiher.nachname}`,
    bezugVertragsdatum: `Ausleihe ${ausleihe.vorgangsnummer}`,
  })
  ausgabeFelder.unterschriften = {
    mieterPng: new Uint8Array(ausgabeMieterPng),
    firmaPng: new Uint8Array(ausgabeFirmaPng),
    ortUndDatum: ausgabeOrtUndDatum,
  }

  const ruecknahmeFelder = ruecknahmeDatenZuFeldern(ruecknahmeDaten)
  ruecknahmeFelder.unterschriften = { mieterPng, firmaPng, ortUndDatum }

  const pdfBytes = await uebergabeprotokollPdfErzeugen(ausgabeFelder, ruecknahmeFelder)
  const pdfHash = createHash("sha256").update(pdfBytes).digest("hex")

  const mieterPngPfad = `unterschriften/${ausleiheId}-ruecknahme-mieter.png`
  const firmaPngPfad = `unterschriften/${ausleiheId}-ruecknahme-firma.png`
  const pdfPfad = `uebergabeprotokolle/${ausleiheId}-ruecknahme.pdf`
  await dateiAblegen(mieterPngPfad, mieterPng)
  await dateiAblegen(firmaPngPfad, firmaPng)
  await dateiAblegen(pdfPfad, pdfBytes)

  // --- Ergebnis der Ausleihe: einmalig hier berechnet, siehe Kommentar am
  // Schema-Feld `gefahreneKilometer` — nie erneut angefasst.
  const ruecknahmeZeitpunkt = new Date(ruecknahmeDaten.datumUhrzeit)
  const ruecknahmeKilometerstand = Number.parseInt(ruecknahmeDaten.kilometerstand, 10)
  const gefahreneKilometer = ruecknahmeKilometerstand - ausgabeProtokoll.kilometerstand
  const kalendertage = kalendertageBerechnen(ausgabeProtokoll.zeitpunkt, ruecknahmeZeitpunkt)
  const bruttolistenpreisCentBeiAusleihe = ausleihe.fahrzeug.bruttolistenpreisCent
  // Ohne hinterlegten Listenpreis ist der geldwerte Vorteil nicht
  // berechenbar (siehe ">>> ANPASSEN" im Seed) — dann bleibt das Feld leer,
  // statt mit einer falschen Null zu rechnen.
  const geldwerterVorteilCent =
    bruttolistenpreisCentBeiAusleihe !== null
      ? geldwerterVorteilCentBerechnen(bruttolistenpreisCentBeiAusleihe, gefahreneKilometer)
      : null

  await prisma.$transaction([
    prisma.uebergabeprotokoll.create({
      data: {
        ausleiheId,
        richtung: Protokollrichtung.RUECKNAHME,
        dokumentversionId: dokumentversion.id,
        zeitpunkt: ruecknahmeZeitpunkt,
        ort: ruecknahmeDaten.ort,
        kilometerstand: ruecknahmeKilometerstand,
        tankfuellung: ruecknahmeDaten.tankfuellung as Tankfuellung,
        karosserieInOrdnung: ruecknahmeDaten.zustand.karosserie !== "schaden",
        scheibenInOrdnung: ruecknahmeDaten.zustand.scheiben !== "schaden",
        reifenInOrdnung: ruecknahmeDaten.zustand.reifen !== "schaden",
        innenraumInOrdnung: ruecknahmeDaten.zustand.innenraum !== "schaden",
        bordwerkzeugInOrdnung: ruecknahmeDaten.zustand.bordwerkzeug !== "schaden",
        fahrzeugpapiereInOrdnung: ruecknahmeDaten.zustand.fahrzeugpapiere !== "schaden",
        ladekabelInOrdnung: ruecknahmeDaten.zustand.ladekabel !== "schaden",
        bemerkung: ruecknahmeDaten.schaeden || null,
        durchgefuehrtVonId: kontext.personId,
        unterschriftEntleiherPfad: mieterPngPfad,
        unterschriftFirmaPfad: firmaPngPfad,
        pdfPfad,
        pdfHash,
        schaeden: {
          create: ruecknahmeDaten.schadenspunkte.map((punkt) => ({
            position: punkt.zone,
            beschreibung: `${punkt.art}: ${punkt.beschreibung}`,
            neuAufgefallen: !punkt.istVorschaden,
          })),
        },
      },
    }),
    prisma.ausleihe.update({
      where: { id: ausleiheId },
      data: {
        status: AusleiheStatus.ZURUECKGEGEBEN,
        ausgabeprotokollEntwurfPfad: null,
        gefahreneKilometer,
        kalendertage,
        bruttolistenpreisCentBeiAusleihe,
        geldwerterVorteilCent,
      },
    }),
  ])

  if (ausleihe.ausgabeprotokollEntwurfPfad) {
    await dateiLoeschen(ausleihe.ausgabeprotokollEntwurfPfad)
  }

  redirect(`/ausleihen/${ausleiheId}`)
}

export default async function RuecknahmeprotokollUnterschreibenSeite({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const kontext = await berechtigung([Rolle.WERKSTATTLEITER, Rolle.ADMINISTRATION])
  const { id } = await params

  const ausleihe = await prisma.ausleihe.findUnique({
    where: { id },
    include: { fahrzeug: true, entleiher: true },
  })

  const ruecknahmeDaten = ausleihe?.ruecknahmeprotokollEntwurfDaten as RuecknahmeEntwurfDaten | null

  if (!ausleihe || ausleihe.status !== AusleiheStatus.UEBERGEBEN || !ruecknahmeDaten) {
    redirect(`/ausleihen/${id}`)
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Kopfleiste name={kontext.name} />
      <p className="text-sm text-neutral-500">Ausleihe {ausleihe.vorgangsnummer}</p>
      <h1 className="text-2xl font-semibold text-marke-grau">Rücknahmeprotokoll unterschreiben</h1>

      <dl className="mt-4 flex flex-col gap-2 text-sm text-neutral-600">
        <div className="flex justify-between">
          <dt>Fahrzeug</dt>
          <dd className="font-medium text-neutral-800">
            {ausleihe.fahrzeug.bezeichnung} ({ausleihe.fahrzeug.kennzeichen})
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>Mieter/in</dt>
          <dd className="font-medium text-neutral-800">
            {ausleihe.entleiher.vorname} {ausleihe.entleiher.nachname}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>Kilometerstand</dt>
          <dd className="font-medium text-neutral-800">{ruecknahmeDaten.kilometerstand} km</dd>
        </div>
        <div className="flex justify-between">
          <dt>Ort, Datum</dt>
          <dd className="font-medium text-neutral-800">
            {ruecknahmeDaten.ort}, {formatiereDatumAusDate(new Date(ruecknahmeDaten.datumUhrzeit))}
          </dd>
        </div>
      </dl>

      <Hinweis>
        Beide Unterschriften entstehen jetzt, auf diesem Gerät, nacheinander
        — erst {ausleihe.entleiher.vorname} {ausleihe.entleiher.nachname},
        dann du als Vermieter/in. Reicht euch das Gerät weiter, bevor ihr
        unterschreibt.
      </Hinweis>

      <form action={ruecknahmeprotokollUnterschreiben} className="mt-6 flex flex-col gap-6">
        <input type="hidden" name="ausleiheId" value={ausleihe.id} />

        <ZweiUnterschriften />

        <button
          type="submit"
          className="rounded-lg bg-marke-gruen px-4 py-2.5 font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen focus-visible:outline-offset-2"
        >
          Rücknahmeprotokoll verbindlich unterschreiben
        </button>
      </form>

      <ZurueckButton />
    </main>
  )
}
