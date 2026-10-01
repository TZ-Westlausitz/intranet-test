"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { berechtigung, NichtBerechtigt } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { richTextSanitisieren } from "@/lib/rich-text"
import { AufgabePrioritaet } from "@/generated/prisma/enums"

const RUECKKEHRPFAD = "/aufgaben/vorlagen"

/** Geteilt zwischen Erstellen und Aktualisieren — Muster felderLesenOderFehler in src/lib/infos/vorlagen-aktionen.ts. */
function felderLesenOderFehler(formData: FormData) {
  const titel = String(formData.get("titel") ?? "").trim()
  if (!titel) redirect(`${RUECKKEHRPFAD}?fehler=pflichtfeld`)

  const beschreibung = richTextSanitisieren(String(formData.get("beschreibung") ?? "")) || null

  const prioritaetEingabe = String(formData.get("prioritaet") ?? "")
  const prioritaet = Object.values(AufgabePrioritaet).includes(prioritaetEingabe as AufgabePrioritaet)
    ? (prioritaetEingabe as AufgabePrioritaet)
    : AufgabePrioritaet.MITTEL

  const faelligInTagenEingabe = String(formData.get("faelligInTagen") ?? "").trim()
  const faelligInTagen = faelligInTagenEingabe === "" ? null : Number.parseInt(faelligInTagenEingabe, 10)
  if (faelligInTagen !== null && (!Number.isFinite(faelligInTagen) || faelligInTagen < 0)) {
    redirect(`${RUECKKEHRPFAD}?fehler=faelligInTagen`)
  }

  const benutzbarPersonen = formData.getAll("benutzbarPersonen").map(String).filter(Boolean)
  const benutzbarGruppen = formData.getAll("benutzbarGruppen").map(String).filter(Boolean)
  const benutzbarAbteilungen = formData.getAll("benutzbarAbteilungen").map(String).filter(Boolean)

  return { titel, beschreibung, prioritaet, faelligInTagen, benutzbarPersonen, benutzbarGruppen, benutzbarAbteilungen }
}

export async function aufgabenVorlageErstellen(formData: FormData) {
  const kontext = await berechtigung({ benoetigteBerechtigung: "Wissensmanager" })
  const felder = felderLesenOderFehler(formData)

  await prisma.aufgabenVorlage.create({
    data: {
      titel: felder.titel,
      beschreibung: felder.beschreibung,
      prioritaet: felder.prioritaet,
      faelligInTagen: felder.faelligInTagen,
      erstelltVonId: kontext.personId,
      benutzbarPersonen: { create: felder.benutzbarPersonen.map((personId) => ({ personId })) },
      benutzbarGruppen: { create: felder.benutzbarGruppen.map((gruppeId) => ({ gruppeId })) },
      benutzbarAbteilungen: { create: felder.benutzbarAbteilungen.map((abteilungId) => ({ abteilungId })) },
    },
  })

  revalidatePath("/aufgaben")
  revalidatePath(RUECKKEHRPFAD)
  redirect(RUECKKEHRPFAD)
}

export async function aufgabenVorlageAktualisieren(vorlageId: string, formData: FormData) {
  await berechtigung({ benoetigteBerechtigung: "Wissensmanager" })
  const felder = felderLesenOderFehler(formData)

  await prisma.$transaction([
    prisma.aufgabenVorlageBenutzbarPerson.deleteMany({ where: { vorlageId } }),
    prisma.aufgabenVorlageBenutzbarGruppe.deleteMany({ where: { vorlageId } }),
    prisma.aufgabenVorlageBenutzbarAbteilung.deleteMany({ where: { vorlageId } }),
    prisma.aufgabenVorlageBenutzbarPerson.createMany({
      data: felder.benutzbarPersonen.map((personId) => ({ vorlageId, personId })),
    }),
    prisma.aufgabenVorlageBenutzbarGruppe.createMany({
      data: felder.benutzbarGruppen.map((gruppeId) => ({ vorlageId, gruppeId })),
    }),
    prisma.aufgabenVorlageBenutzbarAbteilung.createMany({
      data: felder.benutzbarAbteilungen.map((abteilungId) => ({ vorlageId, abteilungId })),
    }),
    prisma.aufgabenVorlage.update({
      where: { id: vorlageId },
      data: {
        titel: felder.titel,
        beschreibung: felder.beschreibung,
        prioritaet: felder.prioritaet,
        faelligInTagen: felder.faelligInTagen,
      },
    }),
  ])

  revalidatePath("/aufgaben")
  revalidatePath(RUECKKEHRPFAD)
  redirect(RUECKKEHRPFAD)
}

export async function aufgabenVorlageAktivSetzen(vorlageId: string, aktiv: boolean) {
  await berechtigung({ benoetigteBerechtigung: "Wissensmanager" })
  await prisma.aufgabenVorlage.update({ where: { id: vorlageId }, data: { aktiv } })
  revalidatePath("/aufgaben")
  revalidatePath(RUECKKEHRPFAD)
}

export async function aufgabenVorlageLoeschen(vorlageId: string) {
  await berechtigung({ benoetigteBerechtigung: "Wissensmanager" })
  const vorlage = await prisma.aufgabenVorlage.findUnique({ where: { id: vorlageId }, select: { id: true } })
  if (!vorlage) throw new NichtBerechtigt("Vorlage nicht gefunden")
  await prisma.aufgabenVorlage.delete({ where: { id: vorlageId } })
  revalidatePath("/aufgaben")
  revalidatePath(RUECKKEHRPFAD)
  redirect(RUECKKEHRPFAD)
}
