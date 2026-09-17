import { notFound, redirect } from "next/navigation"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { formatiereDatum, berlinerTagesbeginn } from "@/lib/datum"
import { dateiAblegen } from "@/lib/ablage"
import { naechsteVorgangsnummer } from "@/lib/vorgangsnummer"
import { nutzungsvereinbarungPdfErzeugen } from "@/lib/pdf/nutzungsvereinbarung"
import { AusleiheStatus } from "@/generated/prisma/enums"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import {
  Verfuegbarkeitskalender,
  monatsversatzAusSuchparameter,
} from "@/components/verfuegbarkeitskalender"
import { AnfrageFormular } from "./anfrage-formular"

/**
 * Anfrage stellen (Selbstbedienung).
 *
 * WICHTIG: Das Häkchen unten ist KEINE Unterschrift. Es drückt nur aus
 * "gelesen, Anfrage für diesen Zeitraum ist ernst gemeint". Die rechtlich
 * bindende Unterschrift der Nutzungsvereinbarung entsteht weiterhin auf dem
 * Gerät des Werkstattleiters bei der Übergabe (Regel in der CLAUDE.md).
 * Deshalb entsteht hier auch kein `Vereinbarung`-Datensatz — nur eine
 * Ausleihe mit Status ANGEFRAGT, mit einem vorbereiteten (unterschriebenen)
 * PDF-Entwurf für die Übergabe.
 */

async function fahrzeugAnfragen(formData: FormData) {
  "use server"

  const kontext = await berechtigung()

  const fahrzeugId = String(formData.get("fahrzeugId") ?? "")
  const zweck = String(formData.get("zweck") ?? "").trim()
  const fahrerName = String(formData.get("fahrer") ?? "").trim() || null
  const geplantVonEingabe = String(formData.get("geplantVon") ?? "")
  const geplantBisEingabe = String(formData.get("geplantBis") ?? "")
  const bestaetigt = formData.get("bestaetigt") === "on"

  // Eigene Fehlerkennung fürs Häkchen, damit der Hinweis direkt daneben
  // erscheinen kann statt in einer allgemeinen Sammelmeldung unterzugehen.
  if (!bestaetigt) {
    redirect(`/fahrzeug-mieten/${fahrzeugId}?fehler=haekchen`)
  }

  if (!fahrzeugId || !zweck || !geplantVonEingabe || !geplantBisEingabe) {
    redirect(`/fahrzeug-mieten/${fahrzeugId}?fehler=pflichtfeld`)
  }

  const geplantVon = new Date(`${geplantVonEingabe}T00:00:00`)
  const geplantBis = new Date(`${geplantBisEingabe}T23:59:59`)

  if (geplantBis < geplantVon) {
    redirect(`/fahrzeug-mieten/${fahrzeugId}?fehler=zeitraum`)
  }

  const fahrzeug = await prisma.fahrzeug.findUniqueOrThrow({ where: { id: fahrzeugId } })
  const jahr = geplantVon.getFullYear()

  const ausleihe = await prisma.$transaction(async (tx) => {
    const vorgangsnummer = await naechsteVorgangsnummer(tx, jahr)

    return tx.ausleihe.create({
      data: {
        vorgangsnummer,
        fahrzeugId,
        entleiherId: kontext.personId,
        fahrerName,
        zweck,
        geplantVon,
        geplantBis,
        status: AusleiheStatus.ANGEFRAGT,
      },
    })
  })

  // Entwurf jetzt schon erzeugen und ablegen, damit er bei der Übergabe
  // bereitliegt — noch nicht unterschrieben, siehe Kommentar am Schema-Feld.
  const pdfBytes = await nutzungsvereinbarungPdfErzeugen({
    mieterName: kontext.name,
    fahrerAbweichend: fahrerName ?? "",
    fahrzeugText: `${fahrzeug.bezeichnung} (${fahrzeug.kennzeichen})`,
    zeitraumText: `${formatiereDatum(geplantVonEingabe)} – ${formatiereDatum(geplantBisEingabe)}`,
  })
  const relativerPfad = `vereinbarungsentwuerfe/${ausleihe.id}.pdf`
  await dateiAblegen(relativerPfad, pdfBytes)
  await prisma.ausleihe.update({
    where: { id: ausleihe.id },
    data: { vereinbarungsentwurfPfad: relativerPfad },
  })

  redirect(`/ausleihen/${ausleihe.id}`)
}

export default async function FahrzeugAnfragenSeite({
  params,
  searchParams,
}: {
  params: Promise<{ fahrzeugId: string }>
  searchParams: Promise<{ fehler?: string; monat?: string }>
}) {
  await berechtigung()

  const { fahrzeugId } = await params
  const { fehler, monat } = await searchParams
  const monatsversatz = monatsversatzAusSuchparameter(monat)

  // Nur der jeweils angezeigte Monat, nicht "alles ab heute" — der Kalender
  // blättert jetzt beliebig weit in die Zukunft. berlinerTagesbeginn()/
  // Date.UTC() statt new Date(y, m, d): Letzteres baut Mitternacht in der
  // Zeitzone der ausführenden Umgebung (auf Vercel UTC), nicht in Berlin —
  // siehe Kommentar an berlinerTagesbeginn in src/lib/datum.ts.
  const heute = berlinerTagesbeginn()
  const angezeigterMonat = new Date(Date.UTC(heute.getUTCFullYear(), heute.getUTCMonth() + monatsversatz, 1))
  const monatsAnfang = angezeigterMonat
  const monatsEnde = new Date(Date.UTC(angezeigterMonat.getUTCFullYear(), angezeigterMonat.getUTCMonth() + 1, 1) - 1)

  const [fahrzeug, geplanteAusleihen] = await Promise.all([
    prisma.fahrzeug.findUnique({ where: { id: fahrzeugId } }),
    prisma.ausleihe.findMany({
      where: {
        fahrzeugId,
        geplantVon: { lte: monatsEnde },
        geplantBis: { gte: monatsAnfang },
        status: { notIn: [AusleiheStatus.ABGELEHNT, AusleiheStatus.STORNIERT] },
      },
      orderBy: { geplantVon: "asc" },
    }),
  ])

  if (!fahrzeug || !fahrzeug.aktiv || !fahrzeug.fuerPrivatausleiheFreigegeben) {
    notFound()
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Kopfleiste />
      <h1 className="text-2xl font-semibold text-ueberschrift">Fahrzeug anfragen</h1>
      <p className="mt-1 text-sm text-primaer">
        {fahrzeug.bezeichnung} · {fahrzeug.kennzeichen}
      </p>

      <div className="mt-6">
        <h2 className="text-sm font-medium text-sekundaer">Verfügbarkeit</h2>
        <div className="mt-2">
          <Verfuegbarkeitskalender
            belegteZeitraeume={geplanteAusleihen.map((a) => ({
              von: a.geplantVon,
              bis: a.geplantBis,
            }))}
            monatsversatz={monatsversatz}
            basePfad={`/fahrzeug-mieten/${fahrzeugId}`}
          />
        </div>
      </div>

      <AnfrageFormular fahrzeugId={fahrzeugId} aktion={fahrzeugAnfragen} fehler={fehler} />

      <ZurueckButton />
    </main>
  )
}
