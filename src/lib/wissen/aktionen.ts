"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { berechtigung, NichtBerechtigt } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { richTextSanitisieren } from "@/lib/rich-text"
import { wissensAnhaengePruefen, wissensAnhaengeSpeichern, wissensAnhangLoeschenIntern } from "@/lib/wissen/anhaenge"
import { artikelDetailFuerPerson } from "@/lib/wissen/abfragen"

function anhaengeAusFormData(formData: FormData): File[] {
  return formData.getAll("anhaenge").filter((wert): wert is File => wert instanceof File)
}

/**
 * Liest und validiert die Felder, die Anlegen und Bearbeiten eines Artikels
 * teilen — Muster: infoFelderLesenOderFehler (src/lib/infos/aktionen.ts),
 * hier deutlich schlanker (kein Kategorie/Bestätigung/Kommentare/Umfrage).
 */
async function artikelFelderLesenOderFehler(formData: FormData, rueckkehrPfad: string) {
  const titel = String(formData.get("titel") ?? "").trim()
  if (!titel) {
    redirect(`${rueckkehrPfad}?fehler=pflichtfeld`)
  }

  const empfaengerPersonen = formData.getAll("empfaengerPersonen").map(String).filter(Boolean)
  const empfaengerGruppen = formData.getAll("empfaengerGruppen").map(String).filter(Boolean)
  const empfaengerAbteilungen = formData.getAll("empfaengerAbteilungen").map(String).filter(Boolean)
  if (empfaengerPersonen.length === 0 && empfaengerGruppen.length === 0 && empfaengerAbteilungen.length === 0) {
    redirect(`${rueckkehrPfad}?fehler=keinEmpfaenger`)
  }

  const inhalt = richTextSanitisieren(String(formData.get("inhalt") ?? "")) || null

  const neueAnhaenge = anhaengeAusFormData(formData)
  const anhaengeFehler = wissensAnhaengePruefen(neueAnhaenge)
  if (anhaengeFehler) {
    redirect(`${rueckkehrPfad}?fehler=${anhaengeFehler}`)
  }

  return { titel, inhalt, empfaengerPersonen, empfaengerGruppen, empfaengerAbteilungen, neueAnhaenge }
}

/**
 * Lädt die volle Detailansicht für das Lese-Pop-up (ArtikelAnzeigenDialog)
 * — clientseitig direkt aufgerufen, keine eigene Seite dafür (Muster:
 * infoDetailLaden).
 */
export async function artikelDetailLaden(artikelId: string) {
  const kontext = await berechtigung()
  return artikelDetailFuerPerson(artikelId, kontext)
}

/** Baut den Rückkehrpfad aus Ordner-/Unterordner-Id — dieselbe Logik für Erfolg und Fehler. */
function rueckkehrPfadAus(ordnerId: string | null, unterordnerId: string | null): string {
  if (unterordnerId) return `/wissen/${ordnerId}/${unterordnerId}`
  return `/wissen/${ordnerId}`
}

/**
 * Legt einen Artikel an — ENTWEDER direkt im Ordner ODER in einem
 * Unterordner (siehe Kommentar am Model WissensArtikel). `ordnerId`/
 * `unterordnerId` kommen als gebundene Argumente von der jeweils
 * aufrufenden Seite (die kennt ihren eigenen Ort), nicht aus dem Formular
 * — Regel 5: nie dem Formularwert vertrauen, wo es nicht nötig ist.
 */
export async function artikelErstellen(ordnerId: string, unterordnerId: string | null, formData: FormData) {
  const kontext = await berechtigung({ benoetigteBerechtigung: "Wissensmanager" })
  const rueckkehrPfad = rueckkehrPfadAus(ordnerId, unterordnerId)

  const { titel, inhalt, empfaengerPersonen, empfaengerGruppen, empfaengerAbteilungen, neueAnhaenge } =
    await artikelFelderLesenOderFehler(formData, rueckkehrPfad)

  const artikel = await prisma.wissensArtikel.create({
    data: {
      titel,
      inhalt,
      ordnerId: unterordnerId ? null : ordnerId,
      unterordnerId,
      erstelltVonId: kontext.personId,
      empfaengerPersonen: { create: empfaengerPersonen.map((personId) => ({ personId })) },
      empfaengerGruppen: { create: empfaengerGruppen.map((gruppeId) => ({ gruppeId })) },
      empfaengerAbteilungen: { create: empfaengerAbteilungen.map((abteilungId) => ({ abteilungId })) },
    },
  })

  if (neueAnhaenge.length > 0) {
    await wissensAnhaengeSpeichern(artikel.id, neueAnhaenge, kontext.personId)
  }

  revalidatePath(rueckkehrPfad)
  revalidatePath("/wissen")
  redirect(rueckkehrPfad)
}

/** Bearbeitet einen bestehenden Artikel — dieselben Felder wie beim Anlegen, der Ordner-Bezug bleibt unverändert. */
export async function artikelAktualisieren(artikelId: string, formData: FormData) {
  const kontext = await berechtigung({ benoetigteBerechtigung: "Wissensmanager" })

  const artikel = await prisma.wissensArtikel.findUnique({
    where: { id: artikelId },
    include: { unterordner: { select: { ordnerId: true } } },
  })
  if (!artikel) throw new NichtBerechtigt("Artikel nicht gefunden")

  const rueckkehrPfad = rueckkehrPfadAus(artikel.unterordner?.ordnerId ?? artikel.ordnerId, artikel.unterordnerId)

  const { titel, inhalt, empfaengerPersonen, empfaengerGruppen, empfaengerAbteilungen, neueAnhaenge } =
    await artikelFelderLesenOderFehler(formData, rueckkehrPfad)

  await prisma.$transaction([
    prisma.wissensEmpfaengerPerson.deleteMany({ where: { artikelId } }),
    prisma.wissensEmpfaengerGruppe.deleteMany({ where: { artikelId } }),
    prisma.wissensEmpfaengerAbteilung.deleteMany({ where: { artikelId } }),
    prisma.wissensEmpfaengerPerson.createMany({ data: empfaengerPersonen.map((personId) => ({ artikelId, personId })) }),
    prisma.wissensEmpfaengerGruppe.createMany({ data: empfaengerGruppen.map((gruppeId) => ({ artikelId, gruppeId })) }),
    prisma.wissensEmpfaengerAbteilung.createMany({
      data: empfaengerAbteilungen.map((abteilungId) => ({ artikelId, abteilungId })),
    }),
    prisma.wissensArtikel.update({ where: { id: artikelId }, data: { titel, inhalt } }),
  ])

  if (neueAnhaenge.length > 0) {
    await wissensAnhaengeSpeichern(artikelId, neueAnhaenge, kontext.personId)
  }

  revalidatePath(rueckkehrPfad)
  revalidatePath("/wissen")
  redirect(rueckkehrPfad)
}

/**
 * Echtes Löschen (anders als Ordner/Unterordner) — ein Artikel ist der
 * eigentliche Inhalt, kein Ordnungsbegriff. Kein Redirect danach: die
 * Löschen-Aktion kann auch von der "Zuletzt bearbeitet"-Liste auf /wissen
 * aus aufgerufen werden, wo ein Sprung in den Ordner des gelöschten
 * Artikels überraschend wäre — nur revalidatePath, die Seite bleibt stehen.
 */
export async function artikelLoeschen(artikelId: string) {
  await berechtigung({ benoetigteBerechtigung: "Wissensmanager" })

  const artikel = await prisma.wissensArtikel.findUnique({
    where: { id: artikelId },
    include: { unterordner: { select: { ordnerId: true } } },
  })
  if (!artikel) return

  await prisma.wissensArtikel.delete({ where: { id: artikelId } })

  revalidatePath(rueckkehrPfadAus(artikel.unterordner?.ordnerId ?? artikel.ordnerId, artikel.unterordnerId))
  revalidatePath("/wissen")
}

/** Entfernt einen einzelnen Anhang — Anhänge lassen sich nur nachträglich löschen, nicht ergänzen (Muster: Info). */
export async function artikelAnhangLoeschen(anhangId: string) {
  await berechtigung({ benoetigteBerechtigung: "Wissensmanager" })

  const anhang = await prisma.wissensAnhang.findUnique({
    where: { id: anhangId },
    include: { artikel: { include: { unterordner: { select: { ordnerId: true } } } } },
  })
  if (!anhang) return

  await wissensAnhangLoeschenIntern(anhangId)

  const { artikel } = anhang
  revalidatePath(rueckkehrPfadAus(artikel.unterordner?.ordnerId ?? artikel.ordnerId, artikel.unterordnerId))
}

/** Kein echtes Löschen (siehe Kommentar am Model) — erneutes Anlegen mit demselben Namen reaktiviert einen deaktivierten Ordner (Muster: Info-Kategorien). */
export async function ordnerErstellen(formData: FormData) {
  await berechtigung({ benoetigteBerechtigung: "Wissensmanager" })
  const name = String(formData.get("name") ?? "").trim()
  if (!name) return
  await prisma.wissensOrdner.upsert({ where: { name }, update: { aktiv: true }, create: { name } })
  revalidatePath("/wissen")
}

export async function ordnerUmbenennen(ordnerId: string, formData: FormData) {
  await berechtigung({ benoetigteBerechtigung: "Wissensmanager" })
  const name = String(formData.get("name") ?? "").trim()
  if (!name) return
  await prisma.wissensOrdner.update({ where: { id: ordnerId }, data: { name } })
  revalidatePath("/wissen")
  revalidatePath(`/wissen/${ordnerId}`)
}

export async function ordnerAktivSetzen(ordnerId: string, aktiv: boolean) {
  await berechtigung({ benoetigteBerechtigung: "Wissensmanager" })
  await prisma.wissensOrdner.update({ where: { id: ordnerId }, data: { aktiv } })
  revalidatePath("/wissen")
}

export async function unterordnerErstellen(ordnerId: string, formData: FormData) {
  await berechtigung({ benoetigteBerechtigung: "Wissensmanager" })
  const name = String(formData.get("name") ?? "").trim()
  if (!name) return
  await prisma.wissensUnterordner.upsert({
    where: { ordnerId_name: { ordnerId, name } },
    update: { aktiv: true },
    create: { ordnerId, name },
  })
  revalidatePath(`/wissen/${ordnerId}`)
}

export async function unterordnerUmbenennen(unterordnerId: string, formData: FormData) {
  await berechtigung({ benoetigteBerechtigung: "Wissensmanager" })
  const name = String(formData.get("name") ?? "").trim()
  if (!name) return
  const unterordner = await prisma.wissensUnterordner.update({ where: { id: unterordnerId }, data: { name } })
  revalidatePath(`/wissen/${unterordner.ordnerId}`)
  revalidatePath(`/wissen/${unterordner.ordnerId}/${unterordnerId}`)
}

export async function unterordnerAktivSetzen(unterordnerId: string, aktiv: boolean) {
  await berechtigung({ benoetigteBerechtigung: "Wissensmanager" })
  const unterordner = await prisma.wissensUnterordner.update({ where: { id: unterordnerId }, data: { aktiv } })
  revalidatePath(`/wissen/${unterordner.ordnerId}`)
}
