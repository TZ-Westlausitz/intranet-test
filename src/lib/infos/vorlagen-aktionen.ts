"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { berechtigung, NichtBerechtigt } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { richTextSanitisieren } from "@/lib/rich-text"

const RUECKKEHRPFAD = "/newsfeed/vorlagen"

/**
 * Liest Titel/Inhalt/Kategorie/Einstellungen/Benutzbar-für — geteilt
 * zwischen Erstellen und Aktualisieren, Muster metadatenLesenOderFehler
 * in src/lib/formulare/aktionen.ts. Anders als dort ist "Benutzbar für"
 * hier NIE pflicht (leer = für alle offen, siehe infoVorlageSichtbarFuer).
 */
function felderLesenOderFehler(formData: FormData) {
  const titel = String(formData.get("titel") ?? "").trim()
  if (!titel) redirect(`${RUECKKEHRPFAD}?fehler=pflichtfeld`)

  const inhalt = richTextSanitisieren(String(formData.get("inhalt") ?? "")) || null
  const kategorieId = String(formData.get("kategorieId") ?? "").trim() || null
  const mitBestaetigung = formData.get("mitBestaetigung") === "on"
  const kommentareErlaubt = formData.get("kommentareErlaubt") === "on"

  const benutzbarPersonen = formData.getAll("benutzbarPersonen").map(String).filter(Boolean)
  const benutzbarGruppen = formData.getAll("benutzbarGruppen").map(String).filter(Boolean)
  const benutzbarAbteilungen = formData.getAll("benutzbarAbteilungen").map(String).filter(Boolean)

  return { titel, inhalt, kategorieId, mitBestaetigung, kommentareErlaubt, benutzbarPersonen, benutzbarGruppen, benutzbarAbteilungen }
}

export async function infoVorlageErstellen(formData: FormData) {
  const kontext = await berechtigung({ benoetigteBerechtigung: "Wissensmanager" })
  const felder = felderLesenOderFehler(formData)

  await prisma.infoVorlage.create({
    data: {
      titel: felder.titel,
      inhalt: felder.inhalt,
      kategorieId: felder.kategorieId,
      mitBestaetigung: felder.mitBestaetigung,
      kommentareErlaubt: felder.kommentareErlaubt,
      erstelltVonId: kontext.personId,
      benutzbarPersonen: { create: felder.benutzbarPersonen.map((personId) => ({ personId })) },
      benutzbarGruppen: { create: felder.benutzbarGruppen.map((gruppeId) => ({ gruppeId })) },
      benutzbarAbteilungen: { create: felder.benutzbarAbteilungen.map((abteilungId) => ({ abteilungId })) },
    },
  })

  revalidatePath("/newsfeed")
  revalidatePath(RUECKKEHRPFAD)
  redirect(RUECKKEHRPFAD)
}

export async function infoVorlageAktualisieren(vorlageId: string, formData: FormData) {
  await berechtigung({ benoetigteBerechtigung: "Wissensmanager" })
  const felder = felderLesenOderFehler(formData)

  await prisma.$transaction([
    prisma.infoVorlageBenutzbarPerson.deleteMany({ where: { vorlageId } }),
    prisma.infoVorlageBenutzbarGruppe.deleteMany({ where: { vorlageId } }),
    prisma.infoVorlageBenutzbarAbteilung.deleteMany({ where: { vorlageId } }),
    prisma.infoVorlageBenutzbarPerson.createMany({
      data: felder.benutzbarPersonen.map((personId) => ({ vorlageId, personId })),
    }),
    prisma.infoVorlageBenutzbarGruppe.createMany({
      data: felder.benutzbarGruppen.map((gruppeId) => ({ vorlageId, gruppeId })),
    }),
    prisma.infoVorlageBenutzbarAbteilung.createMany({
      data: felder.benutzbarAbteilungen.map((abteilungId) => ({ vorlageId, abteilungId })),
    }),
    prisma.infoVorlage.update({
      where: { id: vorlageId },
      data: {
        titel: felder.titel,
        inhalt: felder.inhalt,
        kategorieId: felder.kategorieId,
        mitBestaetigung: felder.mitBestaetigung,
        kommentareErlaubt: felder.kommentareErlaubt,
      },
    }),
  ])

  revalidatePath("/newsfeed")
  revalidatePath(RUECKKEHRPFAD)
  redirect(RUECKKEHRPFAD)
}

export async function infoVorlageAktivSetzen(vorlageId: string, aktiv: boolean) {
  await berechtigung({ benoetigteBerechtigung: "Wissensmanager" })
  await prisma.infoVorlage.update({ where: { id: vorlageId }, data: { aktiv } })
  revalidatePath("/newsfeed")
  revalidatePath(RUECKKEHRPFAD)
}

export async function infoVorlageLoeschen(vorlageId: string) {
  await berechtigung({ benoetigteBerechtigung: "Wissensmanager" })
  const vorlage = await prisma.infoVorlage.findUnique({ where: { id: vorlageId }, select: { id: true } })
  if (!vorlage) throw new NichtBerechtigt("Vorlage nicht gefunden")
  await prisma.infoVorlage.delete({ where: { id: vorlageId } })
  revalidatePath("/newsfeed")
  revalidatePath(RUECKKEHRPFAD)
  redirect(RUECKKEHRPFAD)
}
