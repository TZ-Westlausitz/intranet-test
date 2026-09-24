"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { berechtigung, NichtBerechtigt } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { chatSichtbarFuer, direktSchluesselBilden } from "@/lib/chat/sichtbarkeit"
import {
  konversationNachrichten as konversationNachrichtenAbfrage,
  konversationTeilnehmerUndGelesenStand,
} from "@/lib/chat/abfragen"
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

  const andere = await prisma.person.findUnique({ where: { benutzername: andereId }, select: { aktiv: true } })
  if (!andere?.aktiv) throw new NichtBerechtigt("Person nicht gefunden")

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
 *
 * Beide Quellen (Einzelauswahl UND Gruppen-Abkürzung) werden serverseitig
 * auf `aktiv: true` geprüft — Rückmeldung 2026-09-24: eine deaktivierte
 * Person soll in KEINE neue Aktivität mehr eingebunden werden, auch nicht
 * über den Umweg "ganze Abteilung auswählen". Die Auswahlliste im Formular
 * filtert das schon vor, das hier ist die eigentliche Absicherung.
 */
export async function gruppenchatErstellen(formData: FormData) {
  const kontext = await berechtigung()
  const titel = String(formData.get("titel") ?? "").trim()
  if (!titel) throw new NichtBerechtigt("Bitte einen Namen für die Gruppe eingeben")

  const personenIds = formData.getAll("mitgliederPersonen").map(String).filter(Boolean)
  const gruppenIds = formData.getAll("mitgliederGruppen").map(String).filter(Boolean)

  const [ausgewaehltePersonen, gruppenMitglieder] = await Promise.all([
    personenIds.length > 0
      ? prisma.person.findMany({ where: { benutzername: { in: personenIds }, aktiv: true }, select: { benutzername: true } })
      : [],
    gruppenIds.length > 0
      ? prisma.personGruppe.findMany({
          where: { gruppeId: { in: gruppenIds }, person: { aktiv: true } },
          select: { personId: true },
        })
      : [],
  ])

  const mitgliederIds = new Set<string>([
    kontext.personId,
    ...ausgewaehltePersonen.map((p) => p.benutzername),
    ...gruppenMitglieder.map((m) => m.personId),
  ])
  if (mitgliederIds.size < 2) throw new NichtBerechtigt("Bitte mindestens eine weitere Person oder Gruppe auswählen")

  const konversation = await prisma.chatKonversation.create({
    data: {
      titel,
      teilnehmer: {
        create: Array.from(mitgliederIds).map((personId) => ({
          personId,
          // Die erstellende Person bekommt automatisch Gruppenadminrechte
          // (kann sie an weitere Mitglieder weitergeben, siehe
          // gruppeAdminMachen) — alle anderen starten als normales
          // Mitglied.
          istGruppenAdmin: personId === kontext.personId,
        })),
      },
    },
  })
  redirect(`/chat/${konversation.id}`)
}

/**
 * Prüft Gruppenadminrechte für eine der drei Mitgliederverwaltungs-
 * Aktionen unten — nur für frei angelegte Gruppen (`gruppeId: null`,
 * `titel` gesetzt) von Bedeutung. Der automatische Gruppenchat einer
 * Abteilung/Gruppe wird über /admin/gruppen verwaltet, nicht hier; eine
 * Direktnachricht hat gar keine Mitgliederverwaltung.
 */
async function gruppenAdminPruefen(konversationId: string, personId: string) {
  const konversation = await prisma.chatKonversation.findUnique({ where: { id: konversationId } })
  if (!konversation || konversation.gruppeId !== null || konversation.titel === null) {
    throw new NichtBerechtigt("Keine frei angelegte Gruppe")
  }
  const mitglied = await prisma.chatKonversationTeilnehmer.findUnique({
    where: { konversationId_personId: { konversationId, personId } },
  })
  if (!mitglied?.istGruppenAdmin) {
    throw new NichtBerechtigt("Nur Gruppenadmins dürfen das")
  }
  return konversation
}

/**
 * Fügt weitere Personen zu einer frei angelegten Gruppe hinzu — nur für
 * Gruppenadmins (siehe gruppenAdminPruefen), Auswahl über `PersonenAuswahl`
 * (Feldname "mitglieder"). Bereits vorhandene Mitglieder werden ignoriert
 * statt einen Fehler zu werfen (`skipDuplicates`), `aktiv: true` wird
 * serverseitig erneut geprüft (Muster gruppenchatErstellen).
 */
export async function gruppeMitgliedHinzufuegen(konversationId: string, formData: FormData) {
  const kontext = await berechtigung()
  await gruppenAdminPruefen(konversationId, kontext.personId)

  const personenIds = formData.getAll("mitglieder").map(String).filter(Boolean)
  if (personenIds.length === 0) return

  const personen = await prisma.person.findMany({
    where: { benutzername: { in: personenIds }, aktiv: true },
    select: { benutzername: true },
  })

  await prisma.chatKonversationTeilnehmer.createMany({
    data: personen.map((p) => ({ konversationId, personId: p.benutzername })),
    skipDuplicates: true,
  })
  revalidatePath(`/chat/${konversationId}`)
}

/**
 * Entfernt eine Person aus einer frei angelegten Gruppe — nur für
 * Gruppenadmins. Lässt mindestens ein Mitglied übrig, sonst bliebe eine
 * Gruppe ohne jeden Teilnehmer zurück (der Nachrichtenverlauf bleibt in
 * jedem Fall bestehen, Regel 2 sinngemäß — hier geht es nur um die
 * Teilnehmerliste).
 */
export async function gruppeMitgliedEntfernen(konversationId: string, personId: string) {
  const kontext = await berechtigung()
  await gruppenAdminPruefen(konversationId, kontext.personId)

  const anzahl = await prisma.chatKonversationTeilnehmer.count({ where: { konversationId } })
  if (anzahl <= 1) throw new NichtBerechtigt("Die Gruppe braucht mindestens ein Mitglied")

  await prisma.chatKonversationTeilnehmer.delete({
    where: { konversationId_personId: { konversationId, personId } },
  })
  revalidatePath(`/chat/${konversationId}`)
}

/**
 * Gibt einem bestehenden Mitglied Gruppenadminrechte — nur für
 * Gruppenadmins, dieselben Rechte wie die erstellende Person (Rückmeldung
 * 2026-09-24). Bewusst nur diese Richtung (Vergeben), kein Entziehen —
 * nicht angefragt.
 */
export async function gruppeAdminMachen(konversationId: string, personId: string) {
  const kontext = await berechtigung()
  await gruppenAdminPruefen(konversationId, kontext.personId)

  await prisma.chatKonversationTeilnehmer.update({
    where: { konversationId_personId: { konversationId, personId } },
    data: { istGruppenAdmin: true },
  })
  revalidatePath(`/chat/${konversationId}`)
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
 * Liefert IMMER auch den aktuellen Gelesen-Stand mit (nicht nur bei neuen
 * Nachrichten) — sonst würde sich der zweite Haken einer eigenen, schon
 * anzeigten Nachricht nie nachträglich einfärben, wenn die Gegenseite sie
 * erst später liest.
 */
export async function konversationNachrichtenLaden(konversationId: string, seitIso?: string) {
  const kontext = await berechtigung()
  const konversation = await prisma.chatKonversation.findFirst({
    where: { id: konversationId, ...chatSichtbarFuer(kontext.personId) },
    select: { id: true, gruppeId: true },
  })
  if (!konversation) throw new NichtBerechtigt("Konversation nicht sichtbar")

  const [nachrichten, gelesenStand] = await Promise.all([
    konversationNachrichtenAbfrage(konversationId, seitIso ? new Date(seitIso) : undefined),
    konversationTeilnehmerUndGelesenStand(konversation),
  ])
  return { nachrichten, ...gelesenStand }
}

/**
 * Stummschalten/Aufheben (Rückmeldung 2026-09-24, Vorbild Überblick) —
 * gilt für jede Konversation (Direktnachricht wie Gruppe), ändert nur die
 * eigene Sicht (Ungelesen-Zähler/Kachel-Markierung), nicht den Empfang.
 */
export async function konversationStummSchalten(konversationId: string, stumm: boolean) {
  const kontext = await berechtigung()
  const konversation = await prisma.chatKonversation.findFirst({
    where: { id: konversationId, ...chatSichtbarFuer(kontext.personId) },
    select: { id: true },
  })
  if (!konversation) throw new NichtBerechtigt("Konversation nicht sichtbar")

  await prisma.chatKonversationGelesen.upsert({
    where: { konversationId_personId: { konversationId, personId: kontext.personId } },
    create: { konversationId, personId: kontext.personId, stumm },
    update: { stumm },
  })
  revalidatePath(`/chat/${konversationId}`)
  revalidatePath("/chat")
}

/**
 * Archivieren/Wiederherstellen (Rückmeldung 2026-09-24) — blendet die
 * Konversation aus der eigenen Chat-Liste aus, bis entweder manuell
 * wiederhergestellt wird oder eine neue Nachricht eintrifft (siehe
 * meineKonversationen: `istArchiviert` wird bei jeder Anfrage neu
 * berechnet, kein Hintergrundjob).
 */
export async function konversationArchivieren(konversationId: string, archiviert: boolean) {
  const kontext = await berechtigung()
  const konversation = await prisma.chatKonversation.findFirst({
    where: { id: konversationId, ...chatSichtbarFuer(kontext.personId) },
    select: { id: true },
  })
  if (!konversation) throw new NichtBerechtigt("Konversation nicht sichtbar")

  const archiviertAm = archiviert ? new Date() : null
  await prisma.chatKonversationGelesen.upsert({
    where: { konversationId_personId: { konversationId, personId: kontext.personId } },
    create: { konversationId, personId: kontext.personId, archiviertAm },
    update: { archiviertAm },
  })
  revalidatePath(`/chat/${konversationId}`)
  revalidatePath("/chat")
}

/**
 * Chat verlassen — nur bei einer frei angelegten Gruppe (Rückmeldung
 * 2026-09-24: bei Direktnachricht und dem automatischen Abteilungs-
 * Gruppenchat gibt es dafür kein sinnvolles Äquivalent, siehe
 * ChatGruppenMenuDialog). Verlässt die letzte verbliebene Admin-Person die
 * Gruppe, werden ALLE übrigen Mitglieder automatisch Admin — sonst bliebe
 * die Gruppe für niemanden mehr verwaltbar (dasselbe Bootstrap-Prinzip wie
 * bei der Migration bestehender Gruppen, siehe Kommentar am Feld
 * `istGruppenAdmin`). Verlässt das letzte verbleibende Mitglied, wird die
 * Konversation komplett gelöscht — niemand könnte sie ohnehin noch sehen.
 */
export async function gruppeVerlassen(konversationId: string) {
  const kontext = await berechtigung()
  const konversation = await prisma.chatKonversation.findUnique({ where: { id: konversationId } })
  if (!konversation || konversation.gruppeId !== null || konversation.titel === null) {
    throw new NichtBerechtigt("Keine frei angelegte Gruppe")
  }

  const eigenesMitglied = await prisma.chatKonversationTeilnehmer.findUnique({
    where: { konversationId_personId: { konversationId, personId: kontext.personId } },
  })
  if (!eigenesMitglied) throw new NichtBerechtigt("Kein Mitglied dieser Gruppe")

  await prisma.chatKonversationTeilnehmer.delete({
    where: { konversationId_personId: { konversationId, personId: kontext.personId } },
  })

  const uebrige = await prisma.chatKonversationTeilnehmer.findMany({ where: { konversationId } })
  if (uebrige.length === 0) {
    await prisma.chatKonversation.delete({ where: { id: konversationId } })
  } else {
    if (eigenesMitglied.istGruppenAdmin && !uebrige.some((m) => m.istGruppenAdmin)) {
      await prisma.chatKonversationTeilnehmer.updateMany({ where: { konversationId }, data: { istGruppenAdmin: true } })
    }
    // Statusnachricht für die übrigen Mitglieder (Rückmeldung 2026-09-24)
    // — nur sinnvoll, wenn noch jemand da ist, der sie lesen kann.
    // `absenderId` bleibt die verlassende Person (Regel 4: Person bleibt
    // bestehen), `istSystemnachricht` sorgt für die schlichte Darstellung
    // statt einer normalen Sprechblase, siehe ChatKonversationAnsicht.
    await prisma.chatNachricht.create({
      data: {
        konversationId,
        absenderId: kontext.personId,
        text: `${kontext.name} hat die Gruppe verlassen`,
        istSystemnachricht: true,
      },
    })
  }

  revalidatePath("/chat")
  redirect("/chat")
}
