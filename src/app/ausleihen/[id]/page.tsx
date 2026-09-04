import { notFound, redirect } from "next/navigation"
import Link from "next/link"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { AusleiheStatus, Protokollrichtung, Rolle } from "@/generated/prisma/enums"
import { STATUS_TEXT, NAECHSTER_SCHRITT } from "@/lib/ausleihe-status"
import { Kopfleiste } from "@/components/kopfleiste"
import { Hinweis } from "@/components/hinweis"
import { ZurueckButton } from "@/components/zurueck-button"

/**
 * "Löschen" heißt hier STORNIEREN, kein echtes DELETE: Der Status
 * `STORNIERT` existiert genau für diesen Fall, damit die Reservierung
 * nachvollziehbar bleibt (der ganze Zweck dieses Systems).
 *
 * Wer darf: die/der Entleiher/in selbst — auch während die Anfrage noch
 * ANGEFRAGT ist, das ist ihre/seine eigene Anfrage — oder Werkstattleitung/
 * Verwaltung, aber nur, wenn schon ZUGESAGT (für ANGEFRAGT gibt es dort
 * bereits "Ablehnen" unter /anfragen, kein zweiter Weg zum selben Ziel).
 */
async function reservierungStornieren(formData: FormData) {
  "use server"

  const kontext = await berechtigung()
  const ausleiheId = String(formData.get("ausleiheId") ?? "")

  const ausleihe = await prisma.ausleihe.findUnique({ where: { id: ausleiheId } })
  if (!ausleihe) {
    redirect(`/ausleihen/${ausleiheId}`)
  }

  const istEigeneAnfrage = ausleihe.entleiherId === kontext.personId
  const istWerkstatt =
    kontext.rollen.includes(Rolle.WERKSTATTLEITER) || kontext.rollen.includes(Rolle.ADMINISTRATION)

  const stornierbareStatus: AusleiheStatus[] = istEigeneAnfrage
    ? [AusleiheStatus.ANGEFRAGT, AusleiheStatus.ZUGESAGT]
    : istWerkstatt
      ? [AusleiheStatus.ZUGESAGT]
      : []

  await prisma.ausleihe.updateMany({
    where: { id: ausleiheId, status: { in: stornierbareStatus } },
    data: {
      status: AusleiheStatus.STORNIERT,
      entschiedenAm: new Date(),
      entschiedenVonId: kontext.personId,
    },
  })

  redirect(`/ausleihen/${ausleiheId}`)
}

/**
 * Übersicht einer einzelnen Ausleihe.
 *
 * Wird von zwei Seiten aus angesteuert: dem Werkstattleiter/der Verwaltung
 * (alle Ausleihen) und der/dem Entleiher/in selbst (nur die eigene) — daher
 * die Berechtigungsprüfung unten statt eines festen Rollenfilters in
 * `berechtigung()`.
 */
export default async function AusleiheSeite({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ stornieren?: string }>
}) {
  const kontext = await berechtigung()

  const { id } = await params
  const { stornieren } = await searchParams

  const ausleihe = await prisma.ausleihe.findUnique({
    where: { id },
    include: { fahrzeug: true, entleiher: true, vereinbarung: true, protokolle: true },
  })

  const istEigeneAnfrage = ausleihe !== null && ausleihe.entleiherId === kontext.personId
  const istWerkstatt =
    kontext.rollen.includes(Rolle.WERKSTATTLEITER) || kontext.rollen.includes(Rolle.ADMINISTRATION)

  const darfSehen = ausleihe !== null && (istEigeneAnfrage || istWerkstatt)

  // Bewusst derselbe 404 für "gibt es nicht" und "gehört dir nicht" — sonst
  // ließe sich über den Statuscode erraten, welche IDs existieren.
  if (!ausleihe || !darfSehen) {
    notFound()
  }

  const darfStornieren =
    (ausleihe.status === AusleiheStatus.ZUGESAGT && (istEigeneAnfrage || istWerkstatt)) ||
    (ausleihe.status === AusleiheStatus.ANGEFRAGT && istEigeneAnfrage)

  const ausgabeProtokoll = ausleihe.protokolle.find((p) => p.richtung === Protokollrichtung.AUSGABE)
  const ruecknahmeProtokoll = ausleihe.protokolle.find((p) => p.richtung === Protokollrichtung.RUECKNAHME)

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Kopfleiste name={kontext.name} />
      <p className="text-sm text-neutral-500">Ausleihe {ausleihe.vorgangsnummer}</p>
      <h1 className="text-2xl font-semibold text-marke-grau">
        {ausleihe.fahrzeug.bezeichnung}
      </h1>

      <dl className="mt-6 flex flex-col gap-3 text-sm">
        <div className="flex justify-between border-b border-neutral-100 pb-2">
          <dt className="text-neutral-500">Entleiher/in</dt>
          <dd className="font-medium">
            {ausleihe.entleiher.vorname} {ausleihe.entleiher.nachname}
          </dd>
        </div>
        {ausleihe.fahrerName && (
          <div className="flex justify-between border-b border-neutral-100 pb-2">
            <dt className="text-neutral-500">Fahrer</dt>
            <dd className="font-medium">{ausleihe.fahrerName}</dd>
          </div>
        )}
        <div className="flex justify-between border-b border-neutral-100 pb-2">
          <dt className="text-neutral-500">Zeitraum</dt>
          <dd className="font-medium">
            {ausleihe.geplantVon.toLocaleDateString("de-DE")}–
            {ausleihe.geplantBis.toLocaleDateString("de-DE")}
          </dd>
        </div>
        <div className="flex justify-between border-b border-neutral-100 pb-2">
          <dt className="text-neutral-500">Zweck</dt>
          <dd className="font-medium">{ausleihe.zweck}</dd>
        </div>
        <div className="flex justify-between border-b border-neutral-100 pb-2">
          <dt className="text-neutral-500">Status</dt>
          <dd className="font-medium">{STATUS_TEXT[ausleihe.status] ?? ausleihe.status}</dd>
        </div>
        {ausleihe.status === "ABGELEHNT" && ausleihe.ablehnungsgrund && (
          <div className="flex justify-between border-b border-neutral-100 pb-2">
            <dt className="text-neutral-500">Grund</dt>
            <dd className="font-medium">{ausleihe.ablehnungsgrund}</dd>
          </div>
        )}
      </dl>

      {NAECHSTER_SCHRITT[ausleihe.status] && (
        <p className="mt-8 rounded-lg border border-dashed border-neutral-300 p-4 text-sm text-neutral-500">
          {NAECHSTER_SCHRITT[ausleihe.status]}
        </p>
      )}

      {ausleihe.vereinbarungsentwurfPfad && (
        <div className="mt-4 rounded-lg border border-neutral-200 p-4">
          <p className="text-sm text-neutral-600">
            Der vorbereitete Entwurf der Nutzungsvereinbarung liegt bereit für
            die Übergabe. Über den Link kannst du ihn ansehen oder
            herunterladen.
          </p>
          <Link
            href={`/api/ausleihen/${ausleihe.id}/vereinbarungsentwurf`}
            target="_blank"
            className="mt-2 inline-block text-sm font-semibold text-marke-gruen-dunkel underline hover:text-marke-grau"
          >
            Nutzungsvereinbarung (PDF) ansehen
          </Link>
        </div>
      )}

      {ausleihe.vereinbarung && (
        <div className="mt-4 rounded-lg border border-neutral-200 p-4">
          <p className="text-sm text-neutral-600">
            Die Nutzungsvereinbarung ist unterschrieben.
          </p>
          <Link
            href={`/api/ausleihen/${ausleihe.id}/vereinbarung`}
            target="_blank"
            className="mt-2 inline-block text-sm font-semibold text-marke-gruen-dunkel underline hover:text-marke-grau"
          >
            Nutzungsvereinbarung (PDF) ansehen
          </Link>
        </div>
      )}

      {ausleihe.status === AusleiheStatus.ZUGESAGT &&
        istWerkstatt &&
        ausleihe.vereinbarungsentwurfPfad && (
          <div className="mt-4">
            <Link
              href={`/ausleihen/${ausleihe.id}/nutzungsvereinbarung-unterschreiben`}
              className="flex w-fit rounded-lg bg-marke-gruen px-4 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
            >
              Nutzungsvereinbarung unterschreiben
            </Link>
          </div>
        )}

      {ausleihe.ausgabeprotokollEntwurfPfad && (
        <div className="mt-4 rounded-lg border border-neutral-200 p-4">
          <p className="text-sm text-neutral-600">
            Der vorbereitete Entwurf des Übergabeprotokolls liegt bereit.
            Über den Link kannst du ihn ansehen oder herunterladen.
          </p>
          <Link
            href={`/api/ausleihen/${ausleihe.id}/ausgabeprotokollentwurf`}
            target="_blank"
            className="mt-2 inline-block text-sm font-semibold text-marke-gruen-dunkel underline hover:text-marke-grau"
          >
            Übergabeprotokoll (PDF) ansehen
          </Link>
        </div>
      )}

      {(ruecknahmeProtokoll || ausgabeProtokoll) && (
        <div className="mt-4 rounded-lg border border-neutral-200 p-4">
          <p className="text-sm text-neutral-600">
            {ruecknahmeProtokoll
              ? "Das Übergabeprotokoll ist vollständig unterschrieben (Ausgabe und Rücknahme)."
              : "Das Übergabeprotokoll (Ausgabe) ist unterschrieben."}
          </p>
          <Link
            href={`/api/ausleihen/${ausleihe.id}/uebergabeprotokoll`}
            target="_blank"
            className="mt-2 inline-block text-sm font-semibold text-marke-gruen-dunkel underline hover:text-marke-grau"
          >
            Übergabeprotokoll (PDF) ansehen
          </Link>
        </div>
      )}

      {ausleihe.status === AusleiheStatus.VEREINBART && istWerkstatt && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/ausleihen/${ausleihe.id}/uebergabeprotokoll-anlegen`}
            className="flex w-fit rounded-lg bg-marke-gruen px-4 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
          >
            {ausleihe.ausgabeprotokollEntwurfPfad
              ? "Übergabeprotokoll bearbeiten"
              : "Übergabeprotokoll anlegen"}
          </Link>

          {ausleihe.ausgabeprotokollEntwurfPfad && (
            <Link
              href={`/ausleihen/${ausleihe.id}/uebergabeprotokoll-unterschreiben`}
              className="flex w-fit rounded-lg border border-marke-gruen px-4 py-2.5 text-sm font-semibold text-marke-gruen-dunkel transition hover:bg-marke-gruen/10"
            >
              Übergabeprotokoll unterschreiben
            </Link>
          )}
        </div>
      )}

      {ausleihe.status === AusleiheStatus.UEBERGEBEN && istWerkstatt && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/ausleihen/${ausleihe.id}/ruecknahmeprotokoll-anlegen`}
            className="flex w-fit rounded-lg bg-marke-gruen px-4 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
          >
            {ausleihe.ruecknahmeprotokollEntwurfDaten
              ? "Rücknahmeprotokoll bearbeiten"
              : "Rücknahme protokollieren"}
          </Link>

          {ausleihe.ruecknahmeprotokollEntwurfDaten && (
            <Link
              href={`/ausleihen/${ausleihe.id}/ruecknahmeprotokoll-unterschreiben`}
              className="flex w-fit rounded-lg border border-marke-gruen px-4 py-2.5 text-sm font-semibold text-marke-gruen-dunkel transition hover:bg-marke-gruen/10"
            >
              Rücknahmeprotokoll unterschreiben
            </Link>
          )}
        </div>
      )}

      {darfStornieren &&
        (stornieren === "1" ? (
          <div className="mt-8 flex flex-col gap-3">
            <Hinweis>
              Reservierung wirklich stornieren? Das kann nicht rückgängig
              gemacht werden.
            </Hinweis>
            <div className="flex gap-2">
              <form action={reservierungStornieren}>
                <input type="hidden" name="ausleiheId" value={ausleihe.id} />
                <button
                  type="submit"
                  className="rounded-lg bg-marke-orange px-3 py-1.5 text-sm font-semibold text-neutral-900 transition hover:brightness-95"
                >
                  Ja, stornieren
                </button>
              </form>
              <Link
                href={`/ausleihen/${ausleihe.id}`}
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-400"
              >
                Abbrechen
              </Link>
            </div>
          </div>
        ) : (
          <Link
            href={`/ausleihen/${ausleihe.id}?stornieren=1`}
            className="mt-8 flex w-fit text-sm font-medium text-red-700 underline hover:text-red-800"
          >
            Reservierung stornieren
          </Link>
        ))}

      <ZurueckButton />
    </main>
  )
}
