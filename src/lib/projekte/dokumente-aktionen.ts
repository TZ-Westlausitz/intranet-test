"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { berechtigung, NichtBerechtigt } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { ProjektmitgliedRolle } from "@/generated/prisma/enums"
import { projektMitgliedschaftPruefen } from "@/lib/projekte/mitgliedschaft"
import {
  projektDokumentAnhaengePruefen,
  projektDokumenteSpeichern,
  projektDokumentLoeschenIntern,
} from "@/lib/projekte/dokumente"

/** Lädt eine oder mehrere Dateien in den Dokumentenbereich eines Projekts hoch — jedes aktive Mitglied darf das. */
export async function projektDokumentHochladen(projektId: string, formData: FormData) {
  const kontext = await berechtigung()
  await projektMitgliedschaftPruefen(projektId, kontext.personId, { erfordertSchreibrecht: true })

  const dateien = formData.getAll("dateien").filter((wert): wert is File => wert instanceof File)
  if (dateien.length === 0) return

  const fehler = projektDokumentAnhaengePruefen(dateien)
  if (fehler) {
    redirect(`/aufgaben/projekte/${projektId}?fehler=${fehler}`)
  }

  await projektDokumenteSpeichern(projektId, dateien, kontext.personId)

  revalidatePath(`/aufgaben/projekte/${projektId}`)
}

/** Löschen bleibt allein der Leitung vorbehalten — bewusst nicht auch der hochladenden Person, siehe Rückmeldung dazu. */
export async function projektDokumentLoeschen(projektId: string, dokumentId: string) {
  const kontext = await berechtigung()
  const { mitglied } = await projektMitgliedschaftPruefen(projektId, kontext.personId, { erfordertSchreibrecht: true })

  const dokument = await prisma.projektDokument.findUnique({ where: { id: dokumentId } })
  if (!dokument || dokument.projektId !== projektId) {
    throw new NichtBerechtigt("Dokument nicht gefunden")
  }

  if (mitglied.rolle !== ProjektmitgliedRolle.LEITUNG) {
    throw new NichtBerechtigt("nur die Leitung darf Dokumente löschen")
  }

  await projektDokumentLoeschenIntern(dokumentId)

  revalidatePath(`/aufgaben/projekte/${projektId}`)
}
