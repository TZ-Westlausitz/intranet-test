"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { berechtigung, NichtBerechtigt } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { richTextSanitisieren } from "@/lib/rich-text"
import { FormularElementTyp, type FormularEinreichungStatus } from "@/generated/prisma/enums"
import { istFormularEmpfaenger } from "@/lib/formulare/sichtbarkeit"
import {
  formularZumAusfuellen,
  vorlageHatEinreichungen,
  vorlageHatEmpfaenger,
  vorlageDetailFuerVerwaltung,
  formularEmpfaengerPersonenIds,
} from "@/lib/formulare/abfragen"
import { formularAnhangPruefen, formularAnhangSpeichern } from "@/lib/formulare/anhaenge"
import { formularVorlageBilderPruefen, formularVorlageBilderSpeichern } from "@/lib/formulare/vorlage-bilder"
import { formularPdfErzeugen, titelOhneEmoji } from "@/lib/formulare/pdf"
import { dateiAblegen } from "@/lib/ablage"
import { benachrichtigungErstellen } from "@/lib/benachrichtigungen/erstellen"
import { FORMULAR_STATUS_LABEL } from "@/lib/formulare/status"

const GUELTIGE_TYPEN = new Set<string>(Object.values(FormularElementTyp))
const AUSWAHL_TYPEN = new Set<string>([FormularElementTyp.AUSWAHL_EINZEL, FormularElementTyp.AUSWAHL_MEHRFACH])
/** Gültige Werte für das (bei TRENNZEICHEN zweckentfremdete) `label`-Feld — siehe Kommentar am Model FormularElement. */
const TRENNZEICHEN_STILE = new Set(["PUNKTIERT", "DURCHGEZOGEN", "GESTRICHELT"])

function anhaengeAusFormData(formData: FormData, feldname: string): File[] {
  return formData.getAll(feldname).filter((wert): wert is File => wert instanceof File)
}

type GeprueftesElement = {
  typ: FormularElementTyp
  label: string | null
  pflicht: boolean
  inhalt: string | null
  optionen: string[]
  /** Index (in DERSELBEN Liste) des Elements, dessen Antwort über die Sichtbarkeit entscheidet — siehe Kommentar am Model FormularElement. `null` = immer sichtbar. */
  bedingungIndex: number | null
  bedingungWert: string | null
}

/**
 * Parst und prüft die Elemente-Liste (JSON aus dem Baukasten, siehe
 * FormularBaukasten) — Regel 5: dem Client-JSON nicht blind vertrauen,
 * jedes Element wird hier serverseitig neu geprüft, nicht nur clientseitig.
 * Die Bedingung (`bedingungIndex`/`bedingungWert`) wird erst in einem
 * zweiten Durchlauf geprüft, weil sie auf ein ANDERES Element derselben
 * Liste verweist — dessen Typ/Optionen müssen dafür schon feststehen.
 *
 * `entwurf: true` (siehe vorlageAlsEntwurfSpeichern) schaltet nur die
 * fachlichen Pflicht-Prüfungen ab (leere Liste, leeres Label, leere
 * Optionen, ungültige Bedingung wird einfach fallengelassen statt
 * abzubrechen) — die strukturelle Prüfung (gültiger Typ, TEXTBLOCK
 * braucht sanitisierbaren Inhalt) bleibt immer bestehen, damit auch ein
 * Entwurf nie kaputte Datensätze erzeugt.
 */
function elementeLesenOderFehler(
  formData: FormData,
  rueckkehrPfad: string,
  opts?: { entwurf?: boolean },
): GeprueftesElement[] {
  const entwurf = opts?.entwurf ?? false
  let roh: unknown
  try {
    roh = JSON.parse(String(formData.get("elemente") ?? "[]"))
  } catch {
    redirect(`${rueckkehrPfad}?fehler=elemente`)
  }
  if (!Array.isArray(roh)) redirect(`${rueckkehrPfad}?fehler=elemente`)
  if (roh.length === 0 && !entwurf) redirect(`${rueckkehrPfad}?fehler=keineElemente`)

  const elemente: GeprueftesElement[] = roh.map((eintrag) => {
    if (typeof eintrag !== "object" || eintrag === null) redirect(`${rueckkehrPfad}?fehler=elemente`)
    const e = eintrag as Record<string, unknown>
    const typ = String(e.typ ?? "")
    if (!GUELTIGE_TYPEN.has(typ)) redirect(`${rueckkehrPfad}?fehler=elemente`)

    const bedingungIndex = typeof e.bedingungIndex === "number" ? e.bedingungIndex : null
    const bedingungWert = typeof e.bedingungWert === "string" ? e.bedingungWert : null

    if (typ === FormularElementTyp.TEXTBLOCK) {
      const inhalt = richTextSanitisieren(String(e.inhalt ?? ""))
      if (!inhalt && !entwurf) redirect(`${rueckkehrPfad}?fehler=elemente`)
      return { typ: typ as FormularElementTyp, label: null, pflicht: false, inhalt: inhalt || null, optionen: [], bedingungIndex, bedingungWert }
    }

    if (typ === FormularElementTyp.TRENNZEICHEN) {
      const stil = String(e.label ?? "")
      if (!TRENNZEICHEN_STILE.has(stil)) redirect(`${rueckkehrPfad}?fehler=elemente`)
      return { typ: typ as FormularElementTyp, label: stil, pflicht: false, inhalt: null, optionen: [], bedingungIndex, bedingungWert }
    }

    const label = String(e.label ?? "").trim()
    if (!label && !entwurf) redirect(`${rueckkehrPfad}?fehler=elemente`)

    let optionen: string[] = []
    if (AUSWAHL_TYPEN.has(typ)) {
      const rohOptionen = Array.isArray(e.optionen) ? e.optionen : []
      optionen = rohOptionen.map((o) => String(o).trim()).filter(Boolean)
      if (optionen.length === 0 && !entwurf) redirect(`${rueckkehrPfad}?fehler=elemente`)
    }

    return { typ: typ as FormularElementTyp, label, pflicht: Boolean(e.pflicht), inhalt: null, optionen, bedingungIndex, bedingungWert }
  })

  // Bedingung darf nur auf ein FRÜHERES Auswahl(eine Option)-Element
  // zeigen, dessen Optionen den geforderten Wert auch tatsächlich enthalten
  // — sonst könnte ein Feld nie oder immer sichtbar sein, ohne dass das im
  // Baukasten auffällt. Im Entwurf wird eine (noch) ungültige Bedingung
  // einfach verworfen statt das Speichern zu blockieren.
  elemente.forEach((element, index) => {
    if (element.bedingungIndex === null) return
    const trigger = element.bedingungIndex >= 0 && element.bedingungIndex < index ? elemente[element.bedingungIndex] : null
    const gueltig =
      trigger !== null &&
      trigger.typ === FormularElementTyp.AUSWAHL_EINZEL &&
      element.bedingungWert !== null &&
      trigger.optionen.includes(element.bedingungWert)
    if (!gueltig) {
      if (entwurf) {
        element.bedingungIndex = null
        element.bedingungWert = null
      } else {
        redirect(`${rueckkehrPfad}?fehler=elemente`)
      }
    }
  })

  return elemente
}

/**
 * Liest Titel/Beschreibung/Empfänger/Benutzbar-für/PDF-Export — geteilt
 * zwischen Erstellen und Aktualisieren. `entwurf: true` (siehe
 * vorlageAlsEntwurfSpeichern) schaltet die fachlichen Pflichtfelder ab —
 * ein Entwurf darf unvollständig sein.
 */
function metadatenLesenOderFehler(formData: FormData, rueckkehrPfad: string, opts?: { entwurf?: boolean }) {
  const entwurf = opts?.entwurf ?? false
  const titel = String(formData.get("titel") ?? "").trim()
  if (!titel && !entwurf) redirect(`${rueckkehrPfad}?fehler=pflichtfeld`)

  const beschreibung = richTextSanitisieren(String(formData.get("beschreibung") ?? "")) || null

  // Inline in die Beschreibung eingefügte Bilder — Muster infoErstellen
  // (eigenes Formularfeld statt "anhaenge", damit die Reihenfolge zu den
  // cids eindeutig bleibt).
  const inlineBilder = anhaengeAusFormData(formData, "inlineBilder")
  const inlineCids = String(formData.get("inlineBilderCids") ?? "").split(",").filter(Boolean)
  const inlineBilderFehler = formularVorlageBilderPruefen(inlineBilder)
  if (inlineBilderFehler) redirect(`${rueckkehrPfad}?fehler=${inlineBilderFehler}`)

  // Empfänger der Einreichungen — Personen/Gruppen/Abteilungen gleichzeitig
  // wählbar (dasselbe InfoEmpfaengerAuswahl-Dreiergespann wie "Benutzbar
  // für" unten, nur mit eigenen Feldnamen, siehe FormularBaukasten).
  const empfaengerPersonen = formData.getAll("empfaengerPersonen").map(String).filter(Boolean)
  const empfaengerGruppen = formData.getAll("empfaengerGruppen").map(String).filter(Boolean)
  const empfaengerAbteilungen = formData.getAll("empfaengerAbteilungen").map(String).filter(Boolean)
  if (empfaengerPersonen.length === 0 && empfaengerGruppen.length === 0 && empfaengerAbteilungen.length === 0 && !entwurf) {
    redirect(`${rueckkehrPfad}?fehler=keinEmpfaenger`)
  }

  const benutzbarPersonen = formData.getAll("benutzbarPersonen").map(String).filter(Boolean)
  const benutzbarGruppen = formData.getAll("benutzbarGruppen").map(String).filter(Boolean)
  const benutzbarAbteilungen = formData.getAll("benutzbarAbteilungen").map(String).filter(Boolean)
  if (benutzbarPersonen.length === 0 && benutzbarGruppen.length === 0 && benutzbarAbteilungen.length === 0 && !entwurf) {
    redirect(`${rueckkehrPfad}?fehler=keineZielgruppe`)
  }

  const pdfExport = formData.get("pdfExport") === "on"

  return {
    titel,
    beschreibung,
    empfaengerPersonen,
    empfaengerGruppen,
    empfaengerAbteilungen,
    benutzbarPersonen,
    benutzbarGruppen,
    benutzbarAbteilungen,
    pdfExport,
    inlineBilder,
    inlineCids,
  }
}

/**
 * Speichert neu eingefügte Inline-Bilder und ersetzt ihre data-cid-Marker
 * im Inhalt durch den echten `src` — Muster
 * inlineBilderAufloesenUndSpeichern (src/lib/infos/aktionen.ts). Gibt den
 * ggf. angepassten Inhalt zurück, sonst unverändert `beschreibung`.
 */
async function inlineBilderAufloesenUndSpeichern(
  vorlageId: string,
  beschreibung: string | null,
  inlineBilder: File[],
  inlineCids: string[],
): Promise<string | null> {
  if (inlineBilder.length === 0 || inlineBilder.length !== inlineCids.length || !beschreibung) {
    return beschreibung
  }
  const gespeicherteBilder = await formularVorlageBilderSpeichern(vorlageId, inlineBilder)
  let aufgeloest = beschreibung
  gespeicherteBilder.forEach((bild, index) => {
    const cid = inlineCids[index]
    aufgeloest = aufgeloest.replace(
      `data-cid="${cid}"`,
      `data-cid="${cid}" src="/api/formulare/vorlagen/${vorlageId}/bilder/${bild.id}"`,
    )
  })
  return aufgeloest
}

/**
 * Verknüpft `bedingungElementId` nachträglich, in einem zweiten Schritt
 * NACH dem Anlegen der Elemente — der selbstreferenzierende Fremdschlüssel
 * kann nicht im selben verschachtelten `elemente: { create: [...] }` gesetzt
 * werden, weil die echten IDs der anderen Elemente erst durch dieses
 * Anlegen entstehen (siehe GeprueftesElement.bedingungIndex, der stattdessen
 * die Position in der Liste hält).
 */
async function bedingungenVerknuepfen(vorlageId: string, elemente: GeprueftesElement[]) {
  const zuVerknuepfen = elemente
    .map((el, index) => ({ index, bedingungIndex: el.bedingungIndex }))
    .filter((e): e is { index: number; bedingungIndex: number } => e.bedingungIndex !== null)
  if (zuVerknuepfen.length === 0) return

  const angelegt = await prisma.formularElement.findMany({
    where: { vorlageId },
    orderBy: { reihenfolge: "asc" },
    select: { id: true },
  })
  await prisma.$transaction(
    zuVerknuepfen.map(({ index, bedingungIndex }) =>
      prisma.formularElement.update({
        where: { id: angelegt[index].id },
        data: { bedingungElementId: angelegt[bedingungIndex].id },
      }),
    ),
  )
}

/** Lädt eine Vorlage samt Elementen für den Baukasten-Bearbeiten-Modus. */
export async function vorlageZumBearbeitenLaden(vorlageId: string) {
  await berechtigung(undefined, { benoetigteBerechtigung: "Wissensmanager" })
  const [vorlage, hatEinreichungen] = await Promise.all([
    vorlageDetailFuerVerwaltung(vorlageId),
    vorlageHatEinreichungen(vorlageId),
  ])
  return vorlage ? { vorlage, hatEinreichungen } : null
}

/**
 * Legt die Vorlage tatsächlich an — gemeinsamer Kern von `vorlageErstellen`
 * und `vorlageAlsEntwurfSpeichern` (Rückmeldung 2026-09-09: Nachfrage beim
 * Schließen des Baukastens ohne zu speichern), die sich nur darin
 * unterscheiden, wie streng `metadaten`/`elemente` vorher geprüft wurden
 * und ob `istEntwurf` gesetzt wird. Ein Entwurf ohne Titel bekommt einen
 * Platzhalter, damit die Datenbank-Spalte `NOT NULL` bleiben kann.
 */
async function vorlageAnlegen(
  erstelltVonId: string,
  metadaten: ReturnType<typeof metadatenLesenOderFehler>,
  elemente: GeprueftesElement[],
  istEntwurf: boolean,
) {
  const vorlage = await prisma.formularVorlage.create({
    data: {
      titel: metadaten.titel || "Entwurf ohne Titel",
      beschreibung: metadaten.beschreibung,
      pdfExport: metadaten.pdfExport,
      istEntwurf,
      // Ein Entwurf startet zusätzlich zur query-seitigen Ausblendung
      // (siehe verfuegbareFormulare/formularZumAusfuellen) auch selbst
      // inaktiv — dieselbe Vorsicht wie bei vorlageDuplizieren.
      aktiv: !istEntwurf,
      erstelltVonId,
      empfaengerPersonen: { create: metadaten.empfaengerPersonen.map((personId) => ({ personId })) },
      empfaengerGruppen: { create: metadaten.empfaengerGruppen.map((gruppeId) => ({ gruppeId })) },
      empfaengerAbteilungen: { create: metadaten.empfaengerAbteilungen.map((abteilungId) => ({ abteilungId })) },
      benutzbarPersonen: { create: metadaten.benutzbarPersonen.map((personId) => ({ personId })) },
      benutzbarGruppen: { create: metadaten.benutzbarGruppen.map((gruppeId) => ({ gruppeId })) },
      benutzbarAbteilungen: { create: metadaten.benutzbarAbteilungen.map((abteilungId) => ({ abteilungId })) },
      elemente: {
        create: elemente.map((el, index) => ({
          typ: el.typ,
          label: el.label,
          pflicht: el.pflicht,
          inhalt: el.inhalt,
          reihenfolge: index,
          bedingungWert: el.bedingungWert,
          optionen: { create: el.optionen.map((wert, optionIndex) => ({ wert, reihenfolge: optionIndex })) },
        })),
      },
    },
  })

  await bedingungenVerknuepfen(vorlage.id, elemente)

  const aufgeloesteBeschreibung = await inlineBilderAufloesenUndSpeichern(
    vorlage.id,
    metadaten.beschreibung,
    metadaten.inlineBilder,
    metadaten.inlineCids,
  )
  if (aufgeloesteBeschreibung !== metadaten.beschreibung) {
    await prisma.formularVorlage.update({ where: { id: vorlage.id }, data: { beschreibung: aufgeloesteBeschreibung } })
  }

  revalidatePath("/formulare")
  revalidatePath("/formulare/verwalten")
  redirect("/formulare/verwalten")
}

export async function vorlageErstellen(formData: FormData) {
  const kontext = await berechtigung(undefined, { benoetigteBerechtigung: "Wissensmanager" })
  // "+ Formular" ist ein Pop-Up direkt auf /formulare/verwalten (Rückmeldung
  // 2026-09-09) — keine eigene Seite mehr, Fehler landen deshalb dort.
  const rueckkehrPfad = "/formulare/verwalten"

  const metadaten = metadatenLesenOderFehler(formData, rueckkehrPfad)
  const elemente = elementeLesenOderFehler(formData, rueckkehrPfad)

  await vorlageAnlegen(kontext.personId, metadaten, elemente, false)
}

/**
 * Speichert den Baukasten-Stand als Entwurf — ausgelöst, wenn der
 * "+ Formular"-Dialog ohne normales Speichern geschlossen wird (Abbrechen/
 * Escape, siehe FormularBaukasten/EntwurfBestaetigenDialog) und sich die
 * Person dafür entscheidet, statt die Eingaben zu verwerfen. Anders als
 * `vorlageErstellen` KEINE fachlichen Pflichtprüfungen (siehe
 * metadatenLesenOderFehler/elementeLesenOderFehler, `entwurf: true`) —
 * ein Entwurf darf unvollständig sein, muss aber strukturell gültig
 * bleiben.
 */
export async function vorlageAlsEntwurfSpeichern(formData: FormData) {
  const kontext = await berechtigung(undefined, { benoetigteBerechtigung: "Wissensmanager" })
  const rueckkehrPfad = "/formulare/verwalten"

  const metadaten = metadatenLesenOderFehler(formData, rueckkehrPfad, { entwurf: true })
  const elemente = elementeLesenOderFehler(formData, rueckkehrPfad, { entwurf: true })

  await vorlageAnlegen(kontext.personId, metadaten, elemente, true)
}

/**
 * Aktualisiert eine Vorlage — solange sie noch keine Einreichungen hat,
 * inklusive der Elemente (kompletter Ersatz, Muster artikelAktualisieren).
 * Sobald es Einreichungen gibt, friert die Struktur ein (siehe Plan): nur
 * Metadaten (Titel/Beschreibung/Empfänger/Benutzbar-für/PDF-Export/Aktiv)
 * werden dann noch übernommen, ein mitgeschicktes "elemente"-Feld wird
 * ignoriert.
 */
export async function vorlageAktualisieren(vorlageId: string, formData: FormData) {
  await berechtigung(undefined, { benoetigteBerechtigung: "Wissensmanager" })
  // Bearbeiten ist ein Pop-Up auf /formulare/verwalten (Rückmeldung
  // 2026-09-09), keine eigene Seite mehr — Fehler landen deshalb dort.
  const rueckkehrPfad = "/formulare/verwalten"

  const metadaten = metadatenLesenOderFehler(formData, rueckkehrPfad)
  const hatEinreichungen = await vorlageHatEinreichungen(vorlageId)
  const beschreibung = await inlineBilderAufloesenUndSpeichern(
    vorlageId,
    metadaten.beschreibung,
    metadaten.inlineBilder,
    metadaten.inlineCids,
  )

  const metadatenUpdate = {
    titel: metadaten.titel,
    beschreibung,
    pdfExport: metadaten.pdfExport,
    // Jede erfolgreiche normale Speicherung graduiert einen Entwurf
    // endgültig zu einem echten Formular (no-op, falls schon echt) —
    // dieser Weg läuft immer durch die vollen Pflichtprüfungen oben.
    istEntwurf: false,
  }

  // Empfänger UND Benutzbar-für komplett ersetzen — unabhängig davon, ob es
  // schon Einreichungen gibt (nur die Elemente-Struktur friert ein, siehe
  // Plan; wer die Einreichungen bekommt/das Formular sehen darf, bleibt
  // jederzeit änderbar).
  const empfaengerUndBenutzbarErsetzen = [
    prisma.formularEmpfaengerPerson.deleteMany({ where: { vorlageId } }),
    prisma.formularEmpfaengerGruppe.deleteMany({ where: { vorlageId } }),
    prisma.formularEmpfaengerAbteilung.deleteMany({ where: { vorlageId } }),
    prisma.formularEmpfaengerPerson.createMany({
      data: metadaten.empfaengerPersonen.map((personId) => ({ vorlageId, personId })),
    }),
    prisma.formularEmpfaengerGruppe.createMany({
      data: metadaten.empfaengerGruppen.map((gruppeId) => ({ vorlageId, gruppeId })),
    }),
    prisma.formularEmpfaengerAbteilung.createMany({
      data: metadaten.empfaengerAbteilungen.map((abteilungId) => ({ vorlageId, abteilungId })),
    }),
    prisma.formularBenutzbarPerson.deleteMany({ where: { vorlageId } }),
    prisma.formularBenutzbarGruppe.deleteMany({ where: { vorlageId } }),
    prisma.formularBenutzbarAbteilung.deleteMany({ where: { vorlageId } }),
    prisma.formularBenutzbarPerson.createMany({
      data: metadaten.benutzbarPersonen.map((personId) => ({ vorlageId, personId })),
    }),
    prisma.formularBenutzbarGruppe.createMany({
      data: metadaten.benutzbarGruppen.map((gruppeId) => ({ vorlageId, gruppeId })),
    }),
    prisma.formularBenutzbarAbteilung.createMany({
      data: metadaten.benutzbarAbteilungen.map((abteilungId) => ({ vorlageId, abteilungId })),
    }),
  ]

  if (hatEinreichungen) {
    await prisma.$transaction([
      ...empfaengerUndBenutzbarErsetzen,
      prisma.formularVorlage.update({ where: { id: vorlageId }, data: metadatenUpdate }),
    ])
  } else {
    const elemente = elementeLesenOderFehler(formData, rueckkehrPfad)

    await prisma.$transaction([
      ...empfaengerUndBenutzbarErsetzen,
      // Elemente komplett ersetzen — Cascade räumt die alten Optionen mit auf.
      prisma.formularElement.deleteMany({ where: { vorlageId } }),
      prisma.formularVorlage.update({
        where: { id: vorlageId },
        data: {
          ...metadatenUpdate,
          elemente: {
            create: elemente.map((el, index) => ({
              typ: el.typ,
              label: el.label,
              pflicht: el.pflicht,
              inhalt: el.inhalt,
              reihenfolge: index,
              bedingungWert: el.bedingungWert,
              optionen: { create: el.optionen.map((wert, optionIndex) => ({ wert, reihenfolge: optionIndex })) },
            })),
          },
        },
      }),
    ])

    await bedingungenVerknuepfen(vorlageId, elemente)
  }

  revalidatePath("/formulare")
  revalidatePath("/formulare/verwalten")
  redirect("/formulare/verwalten")
}

/**
 * Aktivieren nur, wenn mindestens ein Empfänger hinterlegt ist — sonst
 * gäbe es niemanden, der eingehende Einreichungen sähe (siehe
 * vorlageHatEmpfaenger). Betrifft vor allem frisch duplizierte Vorlagen
 * (siehe vorlageDuplizieren), deren Empfänger erst noch für den neuen
 * Standort/Zweck eingetragen werden müssen. Deaktivieren geht immer.
 */
export async function vorlageAktivSetzen(vorlageId: string, aktiv: boolean) {
  await berechtigung(undefined, { benoetigteBerechtigung: "Wissensmanager" })
  if (aktiv) {
    const vorlage = await prisma.formularVorlage.findUnique({ where: { id: vorlageId }, select: { istEntwurf: true } })
    if (vorlage?.istEntwurf) redirect("/formulare/verwalten?fehler=entwurfAktivierung")
    if (!(await vorlageHatEmpfaenger(vorlageId))) redirect("/formulare/verwalten?fehler=keinEmpfaengerAktivierung")
  }
  await prisma.formularVorlage.update({ where: { id: vorlageId }, data: { aktiv } })
  revalidatePath("/formulare")
  revalidatePath("/formulare/verwalten")
}

/**
 * Dupliziert eine Vorlage — Titel/Beschreibung/PDF-Export/Elemente/
 * Optionen werden übernommen, Empfänger UND "Benutzbar für" bewusst NICHT
 * (Rückmeldung 2026-09-09/10: dasselbe Formular soll sich ohne erneutes
 * Abtippen auf einen anderen Standort ummünzen lassen, z. B. "Krankmeldung"
 * je Praxis mit eigener Praxisleitung als Empfänger UND eigener Praxis
 * als Zielgruppe — beides muss also neu gesetzt werden, nicht nur der
 * Empfänger). Die Kopie startet deshalb inaktiv (siehe vorlageAktivSetzen)
 * — erst wenn jemand dort einen Empfänger einträgt, lässt sie sich
 * aktivieren; ohne "Benutzbar für" lässt sie sich nicht einmal speichern
 * (siehe metadatenLesenOderFehler, "keineZielgruppe" gilt unverändert).
 * Landet zurück auf /formulare/verwalten, wo die Kopie mit dem "Keine
 * Nutzer"-Hinweis auftaucht — Bearbeiten (siehe FormularBearbeitenDialog)
 * ist seit der Umstellung auf ein Pop-Up (Rückmeldung 2026-09-09) kein
 * eigenes Ziel mehr, auf das sich direkt weiterleiten ließe.
 */
export async function vorlageDuplizieren(vorlageId: string) {
  const kontext = await berechtigung(undefined, { benoetigteBerechtigung: "Wissensmanager" })

  const original = await prisma.formularVorlage.findUnique({
    where: { id: vorlageId },
    include: {
      elemente: { orderBy: { reihenfolge: "asc" }, include: { optionen: { orderBy: { reihenfolge: "asc" } } } },
    },
  })
  if (!original) throw new NichtBerechtigt("Vorlage nicht gefunden")

  await prisma.formularVorlage.create({
    data: {
      titel: `${original.titel} (Kopie)`,
      beschreibung: original.beschreibung,
      pdfExport: original.pdfExport,
      aktiv: false,
      erstelltVonId: kontext.personId,
      elemente: {
        create: original.elemente.map((el, index) => ({
          typ: el.typ,
          label: el.label,
          pflicht: el.pflicht,
          inhalt: el.inhalt,
          reihenfolge: index,
          optionen: { create: el.optionen.map((o, optionIndex) => ({ wert: o.wert, reihenfolge: optionIndex })) },
        })),
      },
      // empfaengerPersonen/-Gruppen/-Abteilungen UND
      // benutzbarPersonen/-Gruppen/-Abteilungen bewusst leer.
    },
  })

  revalidatePath("/formulare/verwalten")
  redirect("/formulare/verwalten")
}

/** Nur löschbar, solange es keine Einreichungen gibt (siehe Plan) — sonst deaktivieren. */
export async function vorlageLoeschen(vorlageId: string) {
  await berechtigung(undefined, { benoetigteBerechtigung: "Wissensmanager" })
  if (await vorlageHatEinreichungen(vorlageId)) {
    throw new NichtBerechtigt("Vorlage hat bereits Einreichungen — nur noch deaktivierbar")
  }
  await prisma.formularVorlage.delete({ where: { id: vorlageId } })
  revalidatePath("/formulare")
  revalidatePath("/formulare/verwalten")
  redirect("/formulare/verwalten")
}

/**
 * Reicht ein ausgefülltes Formular ein — jeder angemeldete Mitarbeitende
 * darf, sofern die Vorlage für ihn sichtbar ist (kein
 * benoetigteBerechtigung-Check wie bei den Verwaltungsaktionen).
 */
export async function formularEinreichen(vorlageId: string, formData: FormData) {
  const kontext = await berechtigung()
  const rueckkehrPfad = `/formulare/${vorlageId}`

  const vorlage = await formularZumAusfuellen(vorlageId, kontext)
  if (!vorlage) throw new NichtBerechtigt("Formular nicht sichtbar")

  const antwortenDaten: { elementId: string; wertText: string | null; wertMehrfach: string[]; wertJa: boolean | null }[] = []
  const dateiAntworten: { elementId: string; datei: File }[] = []

  for (const element of vorlage.elemente) {
    if (element.typ === FormularElementTyp.TEXTBLOCK || element.typ === FormularElementTyp.TRENNZEICHEN) continue

    // Bedingt sichtbares Element (siehe FormularElement.bedingungElementId)
    // — der Trigger-Wert entscheidet unabhängig davon, was der Client sonst
    // noch mitschickt (Regel 5). Nicht erfüllt: kein Pflichtfeld-Zwang,
    // keine gespeicherte Antwort — genau wie ein optionales, leer
    // gelassenes Feld. DATEI bekommt dabei bewusst gar keinen Eintrag
    // (Muster: ein optionales DATEI-Feld ohne Datei bekommt auch keinen).
    if (element.bedingungElementId) {
      const triggerWert = String(formData.get(`element_${element.bedingungElementId}`) ?? "")
      if (triggerWert !== element.bedingungWert) {
        if (element.typ !== FormularElementTyp.DATEI) {
          antwortenDaten.push({ elementId: element.id, wertText: null, wertMehrfach: [], wertJa: null })
        }
        continue
      }
    }

    if (element.typ === FormularElementTyp.DATEI) {
      const datei = formData.get(`element_${element.id}`)
      if (datei instanceof File && datei.size > 0) {
        const fehler = formularAnhangPruefen(datei)
        if (fehler) redirect(`${rueckkehrPfad}?fehler=${fehler}`)
        dateiAntworten.push({ elementId: element.id, datei })
      } else if (element.pflicht) {
        redirect(`${rueckkehrPfad}?fehler=pflichtfeld`)
      }
      continue
    }

    if (element.typ === FormularElementTyp.CHECKBOX) {
      antwortenDaten.push({
        elementId: element.id,
        wertText: null,
        wertMehrfach: [],
        wertJa: formData.get(`element_${element.id}`) === "on",
      })
      continue
    }

    if (element.typ === FormularElementTyp.AUSWAHL_MEHRFACH) {
      const gueltigeWerte = new Set(element.optionen.map((o) => o.wert))
      const gewaehlt = formData.getAll(`element_${element.id}`).map(String).filter((w) => gueltigeWerte.has(w))
      if (element.pflicht && gewaehlt.length === 0) redirect(`${rueckkehrPfad}?fehler=pflichtfeld`)
      antwortenDaten.push({ elementId: element.id, wertText: null, wertMehrfach: gewaehlt, wertJa: null })
      continue
    }

    const wert = String(formData.get(`element_${element.id}`) ?? "").trim()
    if (!wert) {
      if (element.pflicht) redirect(`${rueckkehrPfad}?fehler=pflichtfeld`)
      antwortenDaten.push({ elementId: element.id, wertText: null, wertMehrfach: [], wertJa: null })
      continue
    }

    if (element.typ === FormularElementTyp.AUSWAHL_EINZEL) {
      const gueltigeWerte = new Set(element.optionen.map((o) => o.wert))
      if (!gueltigeWerte.has(wert)) redirect(`${rueckkehrPfad}?fehler=elemente`)
    }

    antwortenDaten.push({ elementId: element.id, wertText: wert, wertMehrfach: [], wertJa: null })
  }

  const einreichung = await prisma.formularEinreichung.create({
    data: {
      vorlageId,
      eingereichtVonId: kontext.personId,
      antworten: { create: antwortenDaten },
    },
  })

  for (const { elementId, datei } of dateiAntworten) {
    await formularAnhangSpeichern(einreichung.id, elementId, datei)
  }

  if (vorlage.pdfExport) {
    const anhaenge = await prisma.formularEinreichungAnhang.findMany({ where: { einreichungId: einreichung.id } })
    const pdfBytes = await formularPdfErzeugen({
      titel: vorlage.titel,
      eingereichtVon: kontext.name,
      eingereichtAm: einreichung.eingereichtAm,
      elemente: vorlage.elemente.map((e) => ({ id: e.id, typ: e.typ, label: e.label, inhalt: e.inhalt })),
      antworten: antwortenDaten,
      anhaenge: anhaenge.map((a) => ({ elementId: a.elementId, dateiname: a.dateiname })),
    })
    const pfad = `formulare/${einreichung.id}/ausgefuellt.pdf`
    await dateiAblegen(pfad, pdfBytes)
    await prisma.$transaction([
      prisma.formularEinreichung.update({ where: { id: einreichung.id }, data: { pdfPfad: pfad } }),
      prisma.formularEinreichungAnhang.create({
        data: {
          einreichungId: einreichung.id,
          dateiname: `${titelOhneEmoji(vorlage.titel) || "Formular"}.pdf`,
          pfad,
          mimetyp: "application/pdf",
          groesseBytes: pdfBytes.byteLength,
        },
      }),
    ])
  }

  const empfaengerIds = (await formularEmpfaengerPersonenIds(vorlageId)).filter((id) => id !== kontext.personId)
  await Promise.all(
    empfaengerIds.map((personId) =>
      benachrichtigungErstellen({
        personId,
        text: `Neue Einreichung: "${vorlage.titel}"`,
        link: `/formulare/einreichungen/${einreichung.id}`,
      }),
    ),
  )

  revalidatePath("/formulare")
  redirect(`/formulare/einreichungen/${einreichung.id}`)
}

/**
 * Nur ein hinterlegter Empfänger (Person, Gruppen- oder Abteilungsmitglied)
 * darf den Status setzen. Benachrichtigt bei einer tatsächlichen Änderung
 * die einreichende Person (Rückmeldung 2026-09-22) — Muster
 * meldungStatusAktualisieren im Kontaktstelle-Baustein: kein doppeltes
 * Benachrichtigen, wenn derselbe Status erneut gesetzt wird, und keine
 * Benachrichtigung an sich selbst, falls Empfänger und Einreichende
 * dieselbe Person sind.
 */
export async function einreichungStatusSetzen(einreichungId: string, status: FormularEinreichungStatus) {
  const kontext = await berechtigung()

  const einreichung = await prisma.formularEinreichung.findUnique({
    where: { id: einreichungId },
    select: { id: true, vorlageId: true, status: true, eingereichtVonId: true, vorlage: { select: { titel: true } } },
  })
  if (!einreichung) throw new NichtBerechtigt("Einreichung nicht gefunden")
  if (!(await istFormularEmpfaenger(einreichung.vorlageId, kontext.personId))) {
    throw new NichtBerechtigt("nur der Empfänger darf den Status ändern")
  }
  if (einreichung.status === status) return

  await prisma.formularEinreichung.update({ where: { id: einreichungId }, data: { status } })

  if (einreichung.eingereichtVonId !== kontext.personId) {
    await benachrichtigungErstellen({
      personId: einreichung.eingereichtVonId,
      text: `Status deiner Einreichung "${einreichung.vorlage.titel}" wurde auf "${FORMULAR_STATUS_LABEL[status]}" geändert`,
      link: `/formulare/einreichungen/${einreichungId}`,
    })
  }

  revalidatePath(`/formulare/einreichungen/${einreichungId}`)
  revalidatePath("/formulare")
}
