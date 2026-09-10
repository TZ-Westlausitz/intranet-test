"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { berechtigung, NichtBerechtigt } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { chatSichtbarFuer, direktSchluesselBilden } from "@/lib/chat/sichtbarkeit"
import { konversationNachrichten as konversationNachrichtenAbfrage } from "@/lib/chat/abfragen"
import { chatAnhaengePruefen, chatAnhaengeSpeichern } from "@/lib/chat/anhaenge"

const NACHRICHT_MAX_LAENGE = 4000

const ANHANG_FEHLER_TEXT: Record<string, string> = {
  zuGross: "Eine Datei ist zu groß (maximal 15 MB je Anhang).",
  typUngueltig: "Nicht unterstützter Dateityp. Erlaubt sind PDF und Fotos (JPG, PNG, WEBP, HEIC).",
}

function anhaengeAusFormData(formData: FormData): File[] {
  return formData.getAll("anhaenge").filter((wert): wert is File => wert instanceof File && wert.size > 0)
}

/**
 * Öffnet die Direktnachricht mit der über `PersonenAuswahl` (Feldname
 * "andereId") gewählten Person — legt sie bei Bedarf an (Muster `upsert`
 * über den eindeutigen `direktSchluessel`, verhindert doppelte
 * Konversationen zwischen denselben zwei Personen) und leitet zur
 * Konversationsansicht weiter. Hinter "+ Neuer Chat" (Rückmeldung
 * 2026-09-10, vorher "+ Neue Nachricht") — bewusst NUR zwischen zwei
 * Mitarbeitenden, für mehrere Personen gibt es "+ Neue Gruppe" (siehe
 * gruppenchatErstellen).
 */
export async function direktkonversationOeffnen(formData: FormData) {
  const kontext = await berechtigung()
  const andereId = String(formData.get("andereId") ?? "")
  if (!andereId) throw new NichtBerechtigt("Keine Person ausgewählt")
  if (andereId === kontext.personId) throw new NichtBerechtigt("Keine Direktnachricht mit sich selbst")

  const andere = await prisma.person.findUnique({ where: { benutzername: andereId }, select: { benutzername: true } })
  if (!andere) throw new NichtBerechtigt("Person nicht gefunden")

  const schluessel = direktSchluesselBilden(kontext.personId, andereId)
  const konversation = await prisma.chatKonversation.upsert({
    where: { direktSchluessel: schluessel },
    create: {
      direktSchluessel: schluessel,
      teilnehmer: { create: [{ personId: kontext.personId }, { personId: andereId }] },
    },
    update: {},
  })
  redirect(`/chat/${konversation.id}`)
}

/**
 * Öffnet den Gruppenchat einer Gruppe — legt ihn beim ersten Aufruf an
 * (`upsert` über `gruppeId`, siehe Kommentar am Model ChatKonversation:
 * lazy statt im Voraus für jede Gruppe). Nur für aktuelle Mitglieder,
 * sonst 404-artiger Fehler wie überall sonst bei fehlender Sichtbarkeit.
 */
export async function gruppenchatOeffnen(gruppeId: string) {
  const kontext = await berechtigung()
  const istMitglied = await prisma.personGruppe.findUnique({
    where: { personId_gruppeId: { personId: kontext.personId, gruppeId } },
  })
  if (!istMitglied) throw new NichtBerechtigt("Kein Mitglied dieser Gruppe")

  const konversation = await prisma.chatKonversation.upsert({
    where: { gruppeId },
    create: { gruppeId },
    update: {},
  })
  redirect(`/chat/${konversation.id}`)
}

/**
 * Legt eine frei zusammengestellte Gruppe an (Rückmeldung 2026-09-10:
 * "+ Neue Gruppe", Auswahl über `InfoEmpfaengerAuswahl` mit den
 * Feldnamen "mitgliederPersonen"/"mitgliederGruppen") — anders als der
 * automatische Gruppenchat (siehe gruppenchatOeffnen) mit einer FESTEN
 * Teilnehmerliste ab Anlage, kein Bezug auf eine bestehende Gruppe. Eine
 * ausgewählte Gruppe ist nur eine Sammel-Abkürzung: ihre AKTUELLEN
 * Mitglieder werden einmalig übernommen, spätere Mitgliedschafts-
 * Änderungen wirken sich auf diese Gruppe nicht mehr aus. Die erstellende
 * Person wird automatisch mit aufgenommen.
 */
export async function gruppenchatErstellen(formData: FormData) {
  const kontext = await berechtigung()
  const titel = String(formData.get("titel") ?? "").trim()
  if (!titel) throw new NichtBerechtigt("Bitte einen Namen für die Gruppe eingeben")

  const personenIds = formData.getAll("mitgliederPersonen").map(String).filter(Boolean)
  const gruppenIds = formData.getAll("mitgliederGruppen").map(String).filter(Boolean)

  const gruppenMitglieder =
    gruppenIds.length > 0
      ? await prisma.personGruppe.findMany({ where: { gruppeId: { in: gruppenIds } }, select: { personId: true } })
      : []

  const mitgliederIds = new Set<string>([kontext.personId, ...personenIds, ...gruppenMitglieder.map((m) => m.personId)])
  if (mitgliederIds.size < 2) throw new NichtBerechtigt("Bitte mindestens eine weitere Person oder Gruppe auswählen")

  const konversation = await prisma.chatKonversation.create({
    data: {
      titel,
      teilnehmer: { create: Array.from(mitgliederIds).map((personId) => ({ personId })) },
    },
  })
  redirect(`/chat/${konversation.id}`)
}

/**
 * Sendet eine Nachricht — prüft NUR, dass die Person aktuell Teilnehmer
 * ist (`chatSichtbarFuer`, Muster überall sonst in der App), sanitisiert
 * Text NICHT als Rich-Text (bewusst schlichter String, siehe Kommentar am
 * Model ChatNachricht). Text ODER mindestens ein Anhang ist Pflicht, nicht
 * zwingend beides (Foto ohne Bildunterschrift ist ein gültiger Chat).
 *
 * Erzeugt bewusst KEINE allgemeine Benachrichtigung (Rückmeldung
 * 2026-09-10: "nur unten auf dem Chat-Symbol, nicht oben bei der
 * allgemeinen Glocke") — der Ungelesen-Zähler auf ChatWidget/`/chat`
 * kommt unabhängig davon direkt aus `ChatKonversationGelesen`
 * (meineKonversationen), läuft also unverändert weiter.
 */
export async function nachrichtSenden(konversationId: string, formData: FormData) {
  const kontext = await berechtigung()
  const konversation = await prisma.chatKonversation.findFirst({
    where: { id: konversationId, ...chatSichtbarFuer(kontext.personId) },
    select: { id: true, gruppeId: true },
  })
  if (!konversation) throw new NichtBerechtigt("Konversation nicht sichtbar")

  const text = String(formData.get("text") ?? "").trim().slice(0, NACHRICHT_MAX_LAENGE)
  const dateien = anhaengeAusFormData(formData)
  const anhangFehler = chatAnhaengePruefen(dateien)
  if (anhangFehler) throw new Error(ANHANG_FEHLER_TEXT[anhangFehler])
  if (!text && dateien.length === 0) return

  const nachricht = await prisma.chatNachricht.create({
    data: { konversationId, absenderId: kontext.personId, text: text || null },
  })
  if (dateien.length > 0) {
    await chatAnhaengeSpeichern(nachricht.id, dateien)
  }
  await prisma.chatKonversationGelesen.upsert({
    where: { konversationId_personId: { konversationId, personId: kontext.personId } },
    create: { konversationId, personId: kontext.personId },
    update: { zuletztGelesenAm: new Date() },
  })

  revalidatePath("/chat")
}

/** Markiert eine Konversation als (bis jetzt) gelesen — für den Ungelesen-Zähler. */
export async function konversationAlsGelesenMarkieren(konversationId: string) {
  const kontext = await berechtigung()
  const konversation = await prisma.chatKonversation.findFirst({
    where: { id: konversationId, ...chatSichtbarFuer(kontext.personId) },
    select: { id: true },
  })
  if (!konversation) throw new NichtBerechtigt("Konversation nicht sichtbar")

  await prisma.chatKonversationGelesen.upsert({
    where: { konversationId_personId: { konversationId, personId: kontext.personId } },
    create: { konversationId, personId: kontext.personId },
    update: { zuletztGelesenAm: new Date() },
  })
  revalidatePath("/chat")
}

/**
 * Für das Erstladen UND das Hintergrund-Polling (siehe
 * ChatKonversationAnsicht) — als Server Action direkt aus der Client
 * Component aufrufbar, Muster `vorlageZumBearbeitenLaden`. `seitIso`
 * gesetzt: nur neuere Nachrichten (Polling), sonst die ganze Historie.
 */
export async function konversationNachrichtenLaden(konversationId: string, seitIso?: string) {
  const kontext = await berechtigung()
  const konversation = await prisma.chatKonversation.findFirst({
    where: { id: konversationId, ...chatSichtbarFuer(kontext.personId) },
    select: { id: true },
  })
  if (!konversation) throw new NichtBerechtigt("Konversation nicht sichtbar")

  return konversationNachrichtenAbfrage(konversationId, seitIso ? new Date(seitIso) : undefined)
}
