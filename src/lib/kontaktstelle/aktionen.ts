"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { berechtigung, NichtBerechtigt } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { MeldungStatus } from "@/generated/prisma/enums"
import { benachrichtigungErstellen } from "@/lib/benachrichtigungen/erstellen"
import { istKontaktstelle } from "@/lib/kontaktstelle/sichtbarkeit"
import { meldungAnhangPruefen, meldungAnhangSpeichern } from "@/lib/kontaktstelle/anhaenge"
import { meldungVerlaufFuerAnsicht } from "@/lib/kontaktstelle/abfragen"
import {
  MELDUNG_STATUS_LABEL,
  meldungChatAktiv,
  meldungEndgueltigArchiviert,
  meldungWartetAufBestaetigung,
} from "@/lib/kontaktstelle/status"

/** Alle Personen mit der Berechtigung "Meldestelle" — Empfänger für neue Meldungen/Nachrichten. */
async function meldestellenPersonen(ausgenommenId?: string) {
  const personen = await prisma.person.findMany({
    where: {
      aktiv: true,
      berechtigungen: { some: { berechtigung: { name: "Meldestelle", aktiv: true } } },
      ...(ausgenommenId ? { benutzername: { not: ausgenommenId } } : {}),
    },
    select: { benutzername: true },
  })
  return personen.map((p) => p.benutzername)
}

/** Zugriff nur für die meldende Person selbst oder die Kontaktstelle — Muster für meldungKommentarErstellen/meldungVerlaufLaden/meldungAlsGelesenMarkieren. */
async function meldungZugriffPruefen(meldungId: string, kontext: { personId: string; berechtigungen: string[] }) {
  const meldung = await prisma.meldung.findUnique({
    where: { id: meldungId },
    select: { id: true, titel: true, status: true, erstelltVonId: true, abschlussBestaetigtAm: true },
  })
  if (!meldung) throw new NichtBerechtigt("Meldung nicht gefunden")
  if (meldung.erstelltVonId !== kontext.personId && !istKontaktstelle(kontext)) {
    throw new NichtBerechtigt("kein Zugriff auf diese Meldung")
  }
  return meldung
}

/**
 * Meldung erstellen — jede angemeldete Person darf melden, keine
 * dedizierte Berechtigung nötig (Regel 5: berechtigung() trotzdem als
 * erste Zeile, auch ohne benoetigteBerechtigung). Der Benachrichtigungstext
 * an die Kontaktstelle enthält bewusst NIE den Namen der meldenden Person
 * — unabhängig von `istAnonym`, robuster als eine bedingte
 * Fallunterscheidung (siehe abfragen.ts für die eigentliche
 * Anonymitäts-Garantie beim Lesen).
 */
export async function meldungErstellen(formData: FormData) {
  const kontext = await berechtigung()

  const titel = String(formData.get("titel") ?? "").trim()
  const beschreibung = String(formData.get("beschreibung") ?? "").trim()
  const istAnonym = formData.get("istAnonym") === "on"

  if (!titel || !beschreibung) {
    redirect("/kontaktstelle?fehler=pflichtfeld")
  }

  const dateien = formData.getAll("anhaenge").filter((d): d is File => d instanceof File && d.size > 0)
  for (const datei of dateien) {
    if (meldungAnhangPruefen(datei)) {
      redirect("/kontaktstelle?fehler=anhang")
    }
  }

  const meldung = await prisma.meldung.create({
    data: { titel, beschreibung, istAnonym, erstelltVonId: kontext.personId },
  })

  for (const datei of dateien) {
    await meldungAnhangSpeichern(meldung.id, datei)
  }

  for (const personId of await meldestellenPersonen()) {
    await benachrichtigungErstellen({
      personId,
      text: `Neue Meldung eingegangen: "${titel}"`,
      link: `/kontaktstelle/${meldung.id}`,
    })
  }

  revalidatePath("/kontaktstelle")
  redirect(`/kontaktstelle/${meldung.id}`)
}

/**
 * Rückfrage/Antwort schreiben — Zugriff nur für die meldende Person selbst
 * oder die Kontaktstelle. Benachrichtigt je nach Richtung entweder direkt
 * die meldende Person (Antwort der Kontaktstelle) oder alle
 * Meldestellen-Personen (Nachricht der meldenden Person) — nie mit Namen
 * im Text.
 *
 * Chat erst ab "In Bearbeitung" nutzbar, bei endgültig archivierter
 * Meldung nie wieder (Rückmeldung 2026-09-22, siehe meldungChatAktiv) —
 * geprüft hier serverseitig, nicht nur durch ein ausgeblendetes Formular
 * in MeldungKommentare (Regel 5).
 */
export async function meldungKommentarErstellen(meldungId: string, formData: FormData) {
  const kontext = await berechtigung()
  const meldung = await meldungZugriffPruefen(meldungId, kontext)
  const istMelderSelbst = meldung.erstelltVonId === kontext.personId

  if (!meldungChatAktiv(meldung)) {
    throw new NichtBerechtigt("Chat ist gerade nicht verfügbar")
  }

  const text = String(formData.get("text") ?? "").trim()
  if (!text) return

  const dateien = formData.getAll("anhaenge").filter((d): d is File => d instanceof File && d.size > 0)
  for (const datei of dateien) {
    if (meldungAnhangPruefen(datei)) {
      throw new NichtBerechtigt("Anhang ungültig")
    }
  }

  const kommentar = await prisma.meldungKommentar.create({
    data: { meldungId, personId: kontext.personId, text },
  })

  for (const datei of dateien) {
    await meldungAnhangSpeichern(meldungId, datei, kommentar.id)
  }

  // Eigene Nachricht zählt nicht als "ungelesen" für sich selbst — Muster nachrichtSenden (Chat).
  await prisma.meldungGelesen.upsert({
    where: { meldungId_personId: { meldungId, personId: kontext.personId } },
    create: { meldungId, personId: kontext.personId },
    update: { zuletztGelesenAm: new Date() },
  })

  if (istMelderSelbst) {
    for (const personId of await meldestellenPersonen()) {
      await benachrichtigungErstellen({
        personId,
        text: `Neue Nachricht zu einer Meldung: "${meldung.titel}"`,
        link: `/kontaktstelle/${meldungId}`,
      })
    }
  } else {
    await benachrichtigungErstellen({
      personId: meldung.erstelltVonId,
      text: `Neue Antwort auf deine Meldung "${meldung.titel}"`,
      link: `/kontaktstelle/${meldungId}`,
    })
  }

  revalidatePath(`/kontaktstelle/${meldungId}`)
}

/**
 * Status ändern — dediziertes Berechtigungs-Gate (Muster
 * `projektErstellen`), nicht nur die pro-Meldung-Zugriffsprüfung wie beim
 * Kommentar oben. Legt bei einer tatsächlichen Änderung zusätzlich einen
 * MeldungStatusEintrag an (Rückmeldung 2026-09-22) — erscheint als
 * Systemzeile "Status auf ... geändert" im Verlauf (siehe
 * meldungVerlaufFuerAnsicht). Klickt die Kontaktstelle den bereits
 * aktiven Status erneut (Schieberegler verhindert das schon clientseitig),
 * passiert serverseitig bewusst nichts — kein doppelter Verlaufseintrag,
 * keine doppelte Benachrichtigung.
 *
 * Bei einer endgültig archivierten Meldung (mit "Ja" auf die
 * Abschluss-Rückfrage bestätigt) ist JEDE Statusänderung gesperrt — dauert
 * für immer, kein Wieder-Öffnen vorgesehen (Rückmeldung 2026-09-22:
 * "Vorgang dauerhaft abgeschlossen"). Ein Wechsel NACH "Abgeschlossen"
 * setzt `abschlussBestaetigtAm` zurücksichtshalber auf null zurück (sollte
 * ohnehin schon so sein) und löst statt der generischen Statusmeldung die
 * eigentliche Rückfrage per Benachrichtigungstext aus — beantwortet wird
 * sie auf der Meldungsseite selbst (siehe MeldungAbschlussAbfrage).
 */
export async function meldungStatusAktualisieren(meldungId: string, formData: FormData) {
  await berechtigung({ benoetigteBerechtigung: "Meldestelle" })

  const statusEingabe = String(formData.get("status") ?? "")
  if (!Object.values(MeldungStatus).includes(statusEingabe as MeldungStatus)) return

  const bisherigeMeldung = await prisma.meldung.findUnique({
    where: { id: meldungId },
    select: { status: true, abschlussBestaetigtAm: true },
  })
  if (!bisherigeMeldung || bisherigeMeldung.status === statusEingabe) return
  if (meldungEndgueltigArchiviert(bisherigeMeldung)) {
    throw new NichtBerechtigt("Meldung ist endgültig abgeschlossen und archiviert")
  }

  const meldung = await prisma.meldung.update({
    where: { id: meldungId },
    data: { status: statusEingabe as MeldungStatus, abschlussBestaetigtAm: null },
    select: { titel: true, erstelltVonId: true },
  })

  await prisma.meldungStatusEintrag.create({
    data: { meldungId, status: statusEingabe as MeldungStatus },
  })

  const text =
    statusEingabe === MeldungStatus.ABGESCHLOSSEN
      ? `Deine Meldung "${meldung.titel}" wurde abgeschlossen — konnte dein Anliegen geklärt werden?`
      : `Status deiner Meldung "${meldung.titel}" wurde auf "${MELDUNG_STATUS_LABEL[statusEingabe]}" geändert`
  await benachrichtigungErstellen({ personId: meldung.erstelltVonId, text, link: `/kontaktstelle/${meldungId}` })

  revalidatePath(`/kontaktstelle/${meldungId}`)
  revalidatePath("/kontaktstelle")
}

/**
 * Antwort der meldenden Person auf "Konnte dein Anliegen geklärt werden?"
 * (Rückmeldung 2026-09-22) — nur nach einem Abschluss durch die
 * Kontaktstelle und nur EINMAL beantwortbar (`meldungWartetAufBestaetigung`).
 * Bewusst NICHT über `meldungZugriffPruefen`, weil die Kontaktstelle diese
 * Entscheidung NICHT treffen darf, auch wenn sie sonst jede Meldung sehen
 * kann — das ist die Entscheidung der meldenden Person allein.
 *
 * "Ja": `abschlussBestaetigtAm` wird gesetzt, Status bleibt ABGESCHLOSSEN —
 * damit ist die Meldung endgültig archiviert (siehe
 * meldungEndgueltigArchiviert), kein neuer MeldungStatusEintrag nötig, der
 * Status selbst ändert sich ja nicht.
 * "Nein": Status zurück auf IN_BEARBEITUNG (eigener MeldungStatusEintrag,
 * erscheint normal im Verlauf), der Chat bleibt/wird wieder nutzbar.
 */
export async function meldungAbschlussBestaetigen(meldungId: string, formData: FormData) {
  const kontext = await berechtigung()

  const meldung = await prisma.meldung.findUnique({
    where: { id: meldungId },
    select: { titel: true, erstelltVonId: true, status: true, abschlussBestaetigtAm: true },
  })
  if (!meldung || meldung.erstelltVonId !== kontext.personId) {
    throw new NichtBerechtigt("kein Zugriff auf diese Meldung")
  }
  if (!meldungWartetAufBestaetigung(meldung)) return

  const antwort = String(formData.get("antwort") ?? "")

  if (antwort === "ja") {
    await prisma.meldung.update({ where: { id: meldungId }, data: { abschlussBestaetigtAm: new Date() } })
    for (const personId of await meldestellenPersonen()) {
      await benachrichtigungErstellen({
        personId,
        text: `Anliegen als geklärt bestätigt: "${meldung.titel}"`,
        link: `/kontaktstelle/${meldungId}`,
      })
    }
  } else if (antwort === "nein") {
    await prisma.meldung.update({ where: { id: meldungId }, data: { status: MeldungStatus.IN_BEARBEITUNG } })
    await prisma.meldungStatusEintrag.create({ data: { meldungId, status: MeldungStatus.IN_BEARBEITUNG } })
    for (const personId of await meldestellenPersonen()) {
      await benachrichtigungErstellen({
        personId,
        text: `Anliegen laut Rückmeldung noch nicht geklärt: "${meldung.titel}"`,
        link: `/kontaktstelle/${meldungId}`,
      })
    }
  } else {
    return
  }

  revalidatePath(`/kontaktstelle/${meldungId}`)
  revalidatePath("/kontaktstelle")
}

/**
 * Für das Erstladen UND das Hintergrund-Polling (Rückmeldung 2026-09-22:
 * "Chat sollte sich selbst aktualisieren") — Muster
 * `konversationNachrichtenLaden` im Chat-Baustein: als Server Action
 * direkt aus MeldungKommentare aufrufbar, kein `<form>` nötig. `seitIso`
 * gesetzt: nur neuere Einträge (Polling), sonst der ganze Verlauf.
 * Liefert `chatAktiv` mit, damit eine Statusänderung durch die
 * Kontaktstelle das Antwortformular bei der meldenden Person auch ohne
 * Neuladen freischaltet.
 */
export async function meldungVerlaufLaden(meldungId: string, seitIso?: string) {
  const kontext = await berechtigung()
  const meldung = await meldungZugriffPruefen(meldungId, kontext)
  const eintraege = await meldungVerlaufFuerAnsicht(meldungId, kontext, seitIso ? new Date(seitIso) : undefined)
  return { eintraege, chatAktiv: meldungChatAktiv(meldung) }
}

/** Markiert eine Meldung als (bis jetzt) gelesen — für den "neue Nachrichten"-Zähler, Muster konversationAlsGelesenMarkieren. */
export async function meldungAlsGelesenMarkieren(meldungId: string) {
  const kontext = await berechtigung()
  await meldungZugriffPruefen(meldungId, kontext)
  await prisma.meldungGelesen.upsert({
    where: { meldungId_personId: { meldungId, personId: kontext.personId } },
    create: { meldungId, personId: kontext.personId },
    update: { zuletztGelesenAm: new Date() },
  })
}
