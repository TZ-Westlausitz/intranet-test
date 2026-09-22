"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { berechtigung, NichtBerechtigt } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { MeldungStatus } from "@/generated/prisma/enums"
import { benachrichtigungErstellen } from "@/lib/benachrichtigungen/erstellen"
import { istKontaktstelle } from "@/lib/kontaktstelle/sichtbarkeit"
import { meldungAnhangPruefen, meldungAnhangSpeichern } from "@/lib/kontaktstelle/anhaenge"

const STATUS_LABEL: Record<string, string> = {
  EINGEGANGEN: "Eingegangen",
  IN_BEARBEITUNG: "In Bearbeitung",
  ABGESCHLOSSEN: "Abgeschlossen",
}

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
 */
export async function meldungKommentarErstellen(meldungId: string, formData: FormData) {
  const kontext = await berechtigung()

  const meldung = await prisma.meldung.findUnique({
    where: { id: meldungId },
    select: { id: true, titel: true, erstelltVonId: true },
  })
  if (!meldung) throw new NichtBerechtigt("Meldung nicht gefunden")

  const istMelderSelbst = meldung.erstelltVonId === kontext.personId
  if (!istMelderSelbst && !istKontaktstelle(kontext)) {
    throw new NichtBerechtigt("kein Zugriff auf diese Meldung")
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
 * Kommentar oben.
 */
export async function meldungStatusAktualisieren(meldungId: string, formData: FormData) {
  await berechtigung(undefined, { benoetigteBerechtigung: "Meldestelle" })

  const statusEingabe = String(formData.get("status") ?? "")
  if (!Object.values(MeldungStatus).includes(statusEingabe as MeldungStatus)) return

  const meldung = await prisma.meldung.update({
    where: { id: meldungId },
    data: { status: statusEingabe as MeldungStatus },
    select: { titel: true, erstelltVonId: true },
  })

  await benachrichtigungErstellen({
    personId: meldung.erstelltVonId,
    text: `Status deiner Meldung "${meldung.titel}" wurde auf "${STATUS_LABEL[statusEingabe]}" geändert`,
    link: `/kontaktstelle/${meldungId}`,
  })

  revalidatePath(`/kontaktstelle/${meldungId}`)
  revalidatePath("/kontaktstelle")
}
