import { notFound, redirect } from "next/navigation"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { naechsteVorgangsnummer } from "@/lib/vorgangsnummer"
import { AusleiheStatus, Rolle } from "@/generated/prisma/enums"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import {
  Verfuegbarkeitskalender,
  monatsversatzAusSuchparameter,
} from "@/components/verfuegbarkeitskalender"
import { AusleiheAnlegenFormular } from "./ausleihe-anlegen-formular"

/**
 * Ausleihe anlegen — der erste Schritt im Lebenszyklus.
 *
 * Der Kollege fragt mündlich beim Werkstattleiter an; sagt der zu, trägt er
 * hier Entleiher, Zeitraum und Zweck ein. Die Ausleihe entsteht direkt als
 * ZUGESAGT — eine eigene Anfragephase gibt es in dieser Fassung noch nicht
 * (siehe Kommentar am AusleiheStatus im Schema).
 *
 * VERFÜGBARKEIT: Der Kalender unten zeigt nur Überschneidungen mit anderen
 * PRIVATEN Ausleihen. Ob das Fahrzeug betrieblich gebraucht wird, weiß
 * allein der Werkstattleiter — die Seite entscheidet nichts, sie zeigt nur,
 * was sie kennt (Regel 9).
 */

async function ausleiheAnlegen(formData: FormData) {
  "use server"

  const kontext = await berechtigung([Rolle.WERKSTATTLEITER, Rolle.ADMINISTRATION])

  const fahrzeugId = String(formData.get("fahrzeugId") ?? "")
  const entleiherId = String(formData.get("entleiherId") ?? "")
  const zweck = String(formData.get("zweck") ?? "").trim()
  const geplantVonEingabe = String(formData.get("geplantVon") ?? "")
  const geplantBisEingabe = String(formData.get("geplantBis") ?? "")

  if (!fahrzeugId || !entleiherId || !zweck || !geplantVonEingabe || !geplantBisEingabe) {
    redirect(`/fahrzeuge/${fahrzeugId}/ausleihe-anlegen?fehler=pflichtfeld`)
  }

  // Von 00:00 bis 23:59:59 des jeweiligen Tages — der Werkstattleiter gibt
  // Tage an ("Wochenende"), keine Uhrzeiten.
  const geplantVon = new Date(`${geplantVonEingabe}T00:00:00`)
  const geplantBis = new Date(`${geplantBisEingabe}T23:59:59`)

  if (geplantBis < geplantVon) {
    redirect(`/fahrzeuge/${fahrzeugId}/ausleihe-anlegen?fehler=zeitraum`)
  }

  const jahr = geplantVon.getFullYear()

  const ausleihe = await prisma.$transaction(async (tx) => {
    const vorgangsnummer = await naechsteVorgangsnummer(tx, jahr)

    return tx.ausleihe.create({
      data: {
        vorgangsnummer,
        fahrzeugId,
        entleiherId,
        zweck,
        geplantVon,
        geplantBis,
        status: AusleiheStatus.ZUGESAGT,
        entschiedenAm: new Date(),
        entschiedenVonId: kontext.personId,
      },
    })
  })

  redirect(`/ausleihen/${ausleihe.id}`)
}

export default async function AusleiheAnlegenSeite({
  params,
  searchParams,
}: {
  params: Promise<{ fahrzeugId: string }>
  searchParams: Promise<{ fehler?: string; monat?: string }>
}) {
  const kontext = await berechtigung([Rolle.WERKSTATTLEITER, Rolle.ADMINISTRATION])

  const { fahrzeugId } = await params
  const { fehler, monat } = await searchParams
  const monatsversatz = monatsversatzAusSuchparameter(monat)

  const fahrzeug = await prisma.fahrzeug.findUnique({ where: { id: fahrzeugId } })
  if (!fahrzeug || !fahrzeug.aktiv || !fahrzeug.fuerPrivatausleiheFreigegeben) {
    notFound()
  }

  // Nur der jeweils angezeigte Monat, nicht "alles ab heute" — der Kalender
  // blättert jetzt beliebig weit in die Zukunft.
  const heute = new Date()
  const angezeigterMonat = new Date(heute.getFullYear(), heute.getMonth() + monatsversatz, 1)
  const monatsAnfang = angezeigterMonat
  const monatsEnde = new Date(
    angezeigterMonat.getFullYear(),
    angezeigterMonat.getMonth() + 1,
    0,
    23, 59, 59,
  )

  const [entleiherOptionen, geplanteAusleihen] = await Promise.all([
    prisma.person.findMany({
      where: { aktiv: true },
      orderBy: [{ nachname: "asc" }, { vorname: "asc" }],
    }),
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

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Kopfleiste name={kontext.name} />
      <h1 className="text-2xl font-semibold text-marke-grau">Ausleihe anlegen</h1>
      <p className="mt-1 text-sm text-neutral-600">
        {fahrzeug.bezeichnung} · {fahrzeug.kennzeichen}
      </p>

      <div className="mt-6">
        <h2 className="text-sm font-medium text-neutral-500">Verfügbarkeit</h2>
        <div className="mt-2">
          <Verfuegbarkeitskalender
            belegteZeitraeume={geplanteAusleihen.map((a) => ({
              von: a.geplantVon,
              bis: a.geplantBis,
            }))}
            monatsversatz={monatsversatz}
            basePfad={`/fahrzeuge/${fahrzeugId}/ausleihe-anlegen`}
          />
        </div>
      </div>

      <AusleiheAnlegenFormular
        fahrzeugId={fahrzeugId}
        aktion={ausleiheAnlegen}
        entleiherOptionen={entleiherOptionen}
        fehler={fehler}
      />

      <ZurueckButton />
    </main>
  )
}
