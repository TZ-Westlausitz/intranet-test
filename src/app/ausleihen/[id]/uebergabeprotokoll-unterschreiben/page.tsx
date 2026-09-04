import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { createHash } from "node:crypto"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { dateiAblegen, dateiLoeschen } from "@/lib/ablage"
import { formatiereDatumAusDate } from "@/lib/datum"
import {
  ausgabeDatenZuFeldern,
  uebergabeprotokollPdfErzeugen,
  type AusgabeEntwurfDaten,
} from "@/lib/pdf/uebergabeprotokoll"
import { AusleiheStatus, DokumentArt, Protokollrichtung, Rolle, Tankfuellung } from "@/generated/prisma/enums"
import { Kopfleiste } from "@/components/kopfleiste"
import { Hinweis } from "@/components/hinweis"
import { ZurueckButton } from "@/components/zurueck-button"
import { ZweiUnterschriften } from "@/components/zwei-unterschriften"

/**
 * Die echte, rechtsverbindliche Unterschrift des Übergabeprotokolls
 * (Ausgabe-Teil) — anders als der Entwurf entsteht hier ein echtes
 * `Uebergabeprotokoll` (Regel 1+2+3: zeigt auf die aktuell gültige
 * Dokumentversion, append-only, genau ein AUSGABE-Protokoll pro Ausleihe).
 * Setzt wie bei der Nutzungsvereinbarung persönlichen Kontakt voraus.
 *
 * Die schon im Entwurf erfassten Angaben (Ort, Datum/Uhrzeit) liefern die
 * "Ort, Datum"-Angabe neben den Unterschriften — kein zusätzliches
 * Eingabefeld nötig.
 */

function dataUrlZuBytes(dataUrl: string): Uint8Array {
  const base64Teil = dataUrl.split(",")[1] ?? ""
  return new Uint8Array(Buffer.from(base64Teil, "base64"))
}

/** Hinter Caddy steht die echte Absenderadresse in `x-forwarded-for`. */
function clientIpAusHeaders(headerListe: Headers): string {
  const weitergeleitet = headerListe.get("x-forwarded-for")
  if (weitergeleitet) return weitergeleitet.split(",")[0]!.trim()
  return headerListe.get("x-real-ip") ?? ""
}

async function uebergabeprotokollUnterschreiben(formData: FormData) {
  "use server"

  const kontext = await berechtigung([Rolle.WERKSTATTLEITER, Rolle.ADMINISTRATION])
  const ausleiheId = String(formData.get("ausleiheId") ?? "")

  const ausleihe = await prisma.ausleihe.findUniqueOrThrow({
    where: { id: ausleiheId },
    include: { fahrzeug: true, entleiher: true },
  })

  const ausgabeDaten = ausleihe.ausgabeprotokollEntwurfDaten as AusgabeEntwurfDaten | null

  // Über die UI nicht erreichbar (der Button erscheint nur bei VEREINBART
  // mit vorbereitetem Entwurf) — trotzdem serverseitig prüfen (Regel 5).
  if (ausleihe.status !== AusleiheStatus.VEREINBART || !ausleihe.ausgabeprotokollEntwurfPfad || !ausgabeDaten) {
    redirect(`/ausleihen/${ausleiheId}`)
  }

  const mieterDataUrl = String(formData.get("unterschriftMieter") ?? "")
  const firmaDataUrl = String(formData.get("unterschriftFirma") ?? "")
  if (!mieterDataUrl || !firmaDataUrl) {
    redirect(`/ausleihen/${ausleiheId}/uebergabeprotokoll-unterschreiben`)
  }

  const mieterPng = dataUrlZuBytes(mieterDataUrl)
  const firmaPng = dataUrlZuBytes(firmaDataUrl)

  const ortUndDatum = `${ausgabeDaten.ort}, ${formatiereDatumAusDate(new Date(ausgabeDaten.datumUhrzeit))}`

  // Die aktuell gültige Version — nicht zwingend Version 1, siehe Regel 1.
  const dokumentversion = await prisma.dokumentversion.findFirstOrThrow({
    where: {
      dokument: { art: DokumentArt.UEBERGABEPROTOKOLL, aktiv: true },
      freigegebenAm: { not: null },
      gueltigAb: { lte: new Date() },
    },
    orderBy: { versionsnummer: "desc" },
  })

  const ausgabeFelder = ausgabeDatenZuFeldern(ausgabeDaten, {
    fahrzeugText: `${ausleihe.fahrzeug.bezeichnung} (${ausleihe.fahrzeug.kennzeichen})`,
    mieterName: `${ausleihe.entleiher.vorname} ${ausleihe.entleiher.nachname}`,
    bezugVertragsdatum: `Ausleihe ${ausleihe.vorgangsnummer}`,
  })
  ausgabeFelder.unterschriften = { mieterPng, firmaPng, ortUndDatum }

  const pdfBytes = await uebergabeprotokollPdfErzeugen(ausgabeFelder)
  const pdfHash = createHash("sha256").update(pdfBytes).digest("hex")

  const mieterPngPfad = `unterschriften/${ausleiheId}-ausgabe-mieter.png`
  const firmaPngPfad = `unterschriften/${ausleiheId}-ausgabe-firma.png`
  const pdfPfad = `uebergabeprotokolle/${ausleiheId}-ausgabe.pdf`
  await dateiAblegen(mieterPngPfad, mieterPng)
  await dateiAblegen(firmaPngPfad, firmaPng)
  await dateiAblegen(pdfPfad, pdfBytes)

  const headerListe = await headers()

  await prisma.$transaction([
    prisma.uebergabeprotokoll.create({
      data: {
        ausleiheId,
        richtung: Protokollrichtung.AUSGABE,
        dokumentversionId: dokumentversion.id,
        zeitpunkt: new Date(ausgabeDaten.datumUhrzeit),
        ort: ausgabeDaten.ort,
        kilometerstand: Number.parseInt(ausgabeDaten.kilometerstand, 10),
        tankfuellung: ausgabeDaten.tankfuellung as Tankfuellung,
        karosserieInOrdnung: ausgabeDaten.zustand.karosserie !== "schaden",
        scheibenInOrdnung: ausgabeDaten.zustand.scheiben !== "schaden",
        reifenInOrdnung: ausgabeDaten.zustand.reifen !== "schaden",
        innenraumInOrdnung: ausgabeDaten.zustand.innenraum !== "schaden",
        bordwerkzeugInOrdnung: ausgabeDaten.zustand.bordwerkzeug !== "schaden",
        fahrzeugpapiereInOrdnung: ausgabeDaten.zustand.fahrzeugpapiere !== "schaden",
        ladekabelInOrdnung: ausgabeDaten.zustand.ladekabel !== "schaden",
        bemerkung: ausgabeDaten.vorschaeden || null,
        durchgefuehrtVonId: kontext.personId,
        unterschriftEntleiherPfad: mieterPngPfad,
        unterschriftFirmaPfad: firmaPngPfad,
        pdfPfad,
        pdfHash,
        schaeden: {
          create: ausgabeDaten.schadenspunkte.map((punkt) => ({
            position: punkt.zone,
            beschreibung: `${punkt.art}: ${punkt.beschreibung}`,
            neuAufgefallen: false,
          })),
        },
      },
    }),
    prisma.ausleihe.update({
      where: { id: ausleiheId },
      data: { status: AusleiheStatus.UEBERGEBEN, ausgabeprotokollEntwurfPfad: null },
    }),
  ])

  await dateiLoeschen(ausleihe.ausgabeprotokollEntwurfPfad)

  redirect(`/ausleihen/${ausleiheId}`)
}

export default async function UebergabeprotokollUnterschreibenSeite({
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

  const ausgabeDaten = ausleihe?.ausgabeprotokollEntwurfDaten as AusgabeEntwurfDaten | null

  if (!ausleihe || ausleihe.status !== AusleiheStatus.VEREINBART || !ausleihe.ausgabeprotokollEntwurfPfad || !ausgabeDaten) {
    redirect(`/ausleihen/${id}`)
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Kopfleiste name={kontext.name} />
      <p className="text-sm text-neutral-500">Ausleihe {ausleihe.vorgangsnummer}</p>
      <h1 className="text-2xl font-semibold text-marke-grau">Übergabeprotokoll unterschreiben</h1>

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
          <dd className="font-medium text-neutral-800">{ausgabeDaten.kilometerstand} km</dd>
        </div>
        <div className="flex justify-between">
          <dt>Ort, Datum</dt>
          <dd className="font-medium text-neutral-800">
            {ausgabeDaten.ort}, {formatiereDatumAusDate(new Date(ausgabeDaten.datumUhrzeit))}
          </dd>
        </div>
      </dl>

      <Hinweis>
        Beide Unterschriften entstehen jetzt, auf diesem Gerät, nacheinander
        — erst {ausleihe.entleiher.vorname} {ausleihe.entleiher.nachname},
        dann du als Vermieter/in. Reicht euch das Gerät weiter, bevor ihr
        unterschreibt.
      </Hinweis>

      <form action={uebergabeprotokollUnterschreiben} className="mt-6 flex flex-col gap-6">
        <input type="hidden" name="ausleiheId" value={ausleihe.id} />

        <ZweiUnterschriften />

        <button
          type="submit"
          className="rounded-lg bg-marke-gruen px-4 py-2.5 font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen focus-visible:outline-offset-2"
        >
          Übergabeprotokoll verbindlich unterschreiben
        </button>
      </form>

      <ZurueckButton />
    </main>
  )
}
