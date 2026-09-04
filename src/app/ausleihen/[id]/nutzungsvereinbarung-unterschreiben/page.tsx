import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { createHash } from "node:crypto"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { dateiAblegen, dateiLoeschen } from "@/lib/ablage"
import { formatiereDatumAusDate } from "@/lib/datum"
import { nutzungsvereinbarungPdfErzeugen } from "@/lib/pdf/nutzungsvereinbarung"
import { AusleiheStatus, DokumentArt, Rolle } from "@/generated/prisma/enums"
import { Kopfleiste } from "@/components/kopfleiste"
import { Hinweis } from "@/components/hinweis"
import { ZurueckButton } from "@/components/zurueck-button"
import { ZweiUnterschriften } from "@/components/zwei-unterschriften"

/**
 * Die echte, rechtsverbindliche Unterschrift der Nutzungsvereinbarung —
 * anders als der Entwurf (Regel 1+2: erst mit Unterschrift entsteht die
 * echte `Vereinbarung`, sie zeigt auf die aktuell gültige
 * `Dokumentversion`). Setzt voraus, dass Werkstattleiter und Mieter/in
 * persönlich zusammen am Gerät des Werkstattleiters sind (siehe CLAUDE.md,
 * "Baustein 1" — kein Remote-Fall).
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

async function vereinbarungUnterschreiben(formData: FormData) {
  "use server"

  const kontext = await berechtigung([Rolle.WERKSTATTLEITER, Rolle.ADMINISTRATION])
  const ausleiheId = String(formData.get("ausleiheId") ?? "")

  const ausleihe = await prisma.ausleihe.findUniqueOrThrow({
    where: { id: ausleiheId },
    include: { fahrzeug: true, entleiher: true },
  })

  // Über die UI nicht erreichbar (der Button erscheint nur bei ZUGESAGT mit
  // vorbereitetem Entwurf) — trotzdem serverseitig prüfen, nicht nur
  // ausblenden (Regel 5).
  if (ausleihe.status !== AusleiheStatus.ZUGESAGT || !ausleihe.vereinbarungsentwurfPfad) {
    redirect(`/ausleihen/${ausleiheId}`)
  }

  const ort = String(formData.get("ort") ?? "").trim()
  const mieterDataUrl = String(formData.get("unterschriftMieter") ?? "")
  const firmaDataUrl = String(formData.get("unterschriftFirma") ?? "")
  if (!ort || !mieterDataUrl || !firmaDataUrl) {
    redirect(`/ausleihen/${ausleiheId}/nutzungsvereinbarung-unterschreiben`)
  }

  const mieterPng = dataUrlZuBytes(mieterDataUrl)
  const firmaPng = dataUrlZuBytes(firmaDataUrl)
  const ortUndDatum = `${ort}, ${formatiereDatumAusDate(new Date())}`

  // Die aktuell gültige Version — nicht zwingend Version 1: Ändert sich der
  // Wortlaut, zeigt eine neue Unterschrift auf die neue Version, alte
  // Vereinbarungen bleiben ihrer damaligen Version zugeordnet (Regel 1).
  const dokumentversion = await prisma.dokumentversion.findFirstOrThrow({
    where: {
      dokument: { art: DokumentArt.NUTZUNGSVEREINBARUNG, aktiv: true },
      freigegebenAm: { not: null },
      gueltigAb: { lte: new Date() },
    },
    orderBy: { versionsnummer: "desc" },
  })

  const pdfBytes = await nutzungsvereinbarungPdfErzeugen(
    {
      mieterName: `${ausleihe.entleiher.vorname} ${ausleihe.entleiher.nachname}`,
      fahrerAbweichend: ausleihe.fahrerName ?? "",
      fahrzeugText: `${ausleihe.fahrzeug.bezeichnung} (${ausleihe.fahrzeug.kennzeichen})`,
      zeitraumText: `${formatiereDatumAusDate(ausleihe.geplantVon)} – ${formatiereDatumAusDate(ausleihe.geplantBis)}`,
    },
    { mieterPng, firmaPng, ortUndDatum },
  )
  const pdfHash = createHash("sha256").update(pdfBytes).digest("hex")

  const mieterPngPfad = `unterschriften/${ausleiheId}-mieter.png`
  const firmaPngPfad = `unterschriften/${ausleiheId}-firma.png`
  const pdfPfad = `vereinbarungen/${ausleiheId}.pdf`
  await dateiAblegen(mieterPngPfad, mieterPng)
  await dateiAblegen(firmaPngPfad, firmaPng)
  await dateiAblegen(pdfPfad, pdfBytes)

  const headerListe = await headers()

  await prisma.$transaction([
    prisma.vereinbarung.create({
      data: {
        ausleiheId,
        dokumentversionId: dokumentversion.id,
        unterschriftEntleiherPfad: mieterPngPfad,
        unterschriftFirmaPfad: firmaPngPfad,
        unterschriebenVonFirmaId: kontext.personId,
        selbstbeteiligungCent: dokumentversion.selbstbeteiligungCent,
        pdfPfad,
        pdfHash,
        versionHash: dokumentversion.inhaltHash,
        ipAdresse: clientIpAusHeaders(headerListe),
        userAgent: headerListe.get("user-agent") ?? "",
      },
    }),
    prisma.ausleihe.update({
      where: { id: ausleiheId },
      data: { status: AusleiheStatus.VEREINBART, vereinbarungsentwurfPfad: null },
    }),
  ])

  await dateiLoeschen(ausleihe.vereinbarungsentwurfPfad)

  redirect(`/ausleihen/${ausleiheId}`)
}

export default async function NutzungsvereinbarungUnterschreibenSeite({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const kontext = await berechtigung([Rolle.WERKSTATTLEITER, Rolle.ADMINISTRATION])
  const { id } = await params

  const ausleihe = await prisma.ausleihe.findUnique({
    where: { id },
    include: { fahrzeug: { include: { standort: true } }, entleiher: true },
  })

  if (!ausleihe || ausleihe.status !== AusleiheStatus.ZUGESAGT || !ausleihe.vereinbarungsentwurfPfad) {
    redirect(`/ausleihen/${id}`)
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Kopfleiste name={kontext.name} />
      <p className="text-sm text-neutral-500">Ausleihe {ausleihe.vorgangsnummer}</p>
      <h1 className="text-2xl font-semibold text-marke-grau">Nutzungsvereinbarung unterschreiben</h1>

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
      </dl>

      <Hinweis>
        Beide Unterschriften entstehen jetzt, auf diesem Gerät, nacheinander
        — erst {ausleihe.entleiher.vorname} {ausleihe.entleiher.nachname},
        dann du als Vermieter/in. Reicht euch das Gerät weiter, bevor ihr
        unterschreibt.
      </Hinweis>

      <form action={vereinbarungUnterschreiben} className="mt-6 flex flex-col gap-6">
        <input type="hidden" name="ausleiheId" value={ausleihe.id} />

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Ort der Unterschrift</span>
          <input
            type="text"
            name="ort"
            required
            defaultValue={ausleihe.fahrzeug.standort?.name}
            className="rounded-lg border border-neutral-300 px-3 py-2.5 text-base focus:border-marke-gruen focus:outline focus:outline-2 focus:outline-marke-gruen"
          />
        </label>

        <ZweiUnterschriften />

        <button
          type="submit"
          className="rounded-lg bg-marke-gruen px-4 py-2.5 font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen focus-visible:outline-offset-2"
        >
          Vereinbarung verbindlich unterschreiben
        </button>
      </form>

      <ZurueckButton />
    </main>
  )
}
