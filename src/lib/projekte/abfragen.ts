import { prisma } from "@/lib/db"
import { AufgabeStatus, ProjektStatus } from "@/generated/prisma/enums"
import { projektSichtbarFuer } from "@/lib/projekte/mitgliedschaft"

const TERMINAL_STATUS = [ProjektStatus.ABGESCHLOSSEN, ProjektStatus.ABGEBROCHEN]

// Für die Zeitstrahl-Vorschau je Projekt auf der Übersichtsseite
// /aufgaben/projekte (Rückmeldung 2026-09-30) — dieselben Rohdaten, die die
// Detailseite ohnehin selbst zu zwischenzieleMitFortschritt() verarbeitet.
const MIT_ZEITSTRAHL_DATEN = {
  zwischenziele: { orderBy: { frist: "asc" as const } },
  aufgaben: { select: { status: true, zwischenzielId: true } },
}

/** "Meine Projekte" für die Übersichtsseite /aufgaben/projekte — alle Status gemischt, die Seite selbst trennt aktiv/fertig. */
export async function projekteFuerPerson(personId: string) {
  return prisma.projekt.findMany({
    where: projektSichtbarFuer(personId),
    include: MIT_ZEITSTRAHL_DATEN,
    orderBy: [{ status: "asc" }, { ende: "asc" }],
  })
}

/**
 * Admin-Modus (siehe Kontext.adminModusAktiv): jedes noch nicht
 * abgeschlossene/abgebrochene (= aktive) Projekt firmenweit, ohne
 * Mitgliedschafts-Einschränkung — rein lesend, siehe Plan "Admin-Modus".
 * Abgeschlossene/abgebrochene Projekte firmenweit liefert stattdessen
 * `alleFertigenProjekte`, getrennt gehalten, weil die Übersichtsseite
 * beide unterschiedlich anzeigt (mit/ohne Zeitstrahl).
 */
export async function alleProjekte() {
  return prisma.projekt.findMany({
    where: { status: { notIn: TERMINAL_STATUS } },
    include: MIT_ZEITSTRAHL_DATEN,
    orderBy: [{ status: "asc" }, { ende: "asc" }],
  })
}

/** Admin-Modus: alle abgeschlossenen/abgebrochenen Projekte firmenweit, für die Spalte "Fertige Projekte" — bewusst ohne Zwischenziele/Aufgaben, dort gibt's keinen Zeitstrahl mehr. */
export async function alleFertigenProjekte() {
  return prisma.projekt.findMany({
    where: { status: { in: TERMINAL_STATUS } },
    orderBy: [{ ende: "desc" }],
  })
}

/**
 * Aufgaben-Zähler je Zwischenziel (Rückmeldung zur früher verwirrenden
 * globalen Fortschrittsanzeige über dem Zeitstrahl — deshalb pro
 * Zwischenziel, nicht global über alle Aufgaben). `erreicht` wird
 * abgeleitet statt gespeichert (siehe Kommentar am Model Zwischenziel):
 * erst wenn es mindestens eine Aufgabe hat und alle davon erledigt sind,
 * gilt es als erreicht. Geteilt zwischen Projekt-Detailseite und der
 * Zeitstrahl-Vorschau auf der Übersichtsseite.
 */
export function zwischenzieleMitFortschritt<Z extends { id: string; titel: string; frist: Date }>(
  zwischenziele: Z[],
  aufgaben: { status: AufgabeStatus | null; zwischenzielId: string | null }[],
) {
  return zwischenziele.map((z) => {
    const zugehoerig = aufgaben.filter((a) => a.zwischenzielId === z.id)
    const aufgabenErledigt = zugehoerig.filter((a) => a.status === AufgabeStatus.ERLEDIGT).length
    return {
      ...z,
      erreicht: zugehoerig.length > 0 && aufgabenErledigt === zugehoerig.length,
      aufgabenErledigt,
      aufgabenGesamt: zugehoerig.length,
    }
  })
}

/** Kopfbereich + Zeitstrahl + Mitgliederliste der Projekt-Detailseite. */
export async function projektDetails(projektId: string) {
  return prisma.projekt.findUnique({
    where: { id: projektId },
    include: {
      erstelltVon: { select: { vorname: true, nachname: true } },
      mitglieder: {
        where: { ausgeschiedenAm: null },
        include: { person: { select: { vorname: true, nachname: true, aktiv: true } } },
        orderBy: [{ rolle: "asc" }, { beigetretenAm: "asc" }],
      },
      zwischenziele: { orderBy: { frist: "asc" } },
    },
  })
}

/** Aufgaben eines Projekts, für die Gruppierung nach Zwischenziel auf der Detailseite. */
export async function projektAufgaben(projektId: string) {
  return prisma.aufgabe.findMany({
    where: { projektId },
    include: {
      erstelltVon: { select: { vorname: true, nachname: true } },
      zugewiesenAn: { select: { vorname: true, nachname: true } },
      anhaenge: { select: { id: true, dateiname: true, groesseBytes: true, mimetyp: true } },
    },
    orderBy: [{ erstelltAm: "asc" }],
  })
}

export async function projektDokumente(projektId: string) {
  return prisma.projektDokument.findMany({
    where: { projektId },
    include: { hochgeladenVon: { select: { vorname: true, nachname: true } } },
    orderBy: { hochgeladenAm: "desc" },
  })
}

/**
 * Noch nicht erledigte Projekt-Aufgaben, die einer Person zugewiesen sind —
 * für einen Hinweis-Abschnitt auf der persönlichen To-do-Seite (siehe
 * ToDosSeite). Bewusst nur lesend/verlinkend dort: Status ändern,
 * bearbeiten, löschen bleibt Sache der Projektseite selbst, damit es dafür
 * nur eine Bedienstelle gibt statt zwei unabhängig gepflegte.
 */
export async function projektAufgabenFuerPerson(personId: string) {
  return prisma.aufgabe.findMany({
    where: { zugewiesenAnId: personId, status: { not: AufgabeStatus.ERLEDIGT } },
    include: {
      projekt: { select: { id: true, titel: true } },
      zwischenziel: { select: { titel: true } },
    },
    orderBy: [{ faelligAm: { sort: "asc", nulls: "last" } }, { erstelltAm: "asc" }],
  })
}

/**
 * Admin-Modus (siehe Kontext.adminModusAktiv): dieselbe Liste wie
 * `projektAufgabenFuerPerson`, aber jede noch nicht erledigte
 * Projekt-Aufgabe firmenweit statt nur die eigenen — inklusive Name der
 * zugewiesenen Person, weil das anders als bei der persönlichen Variante
 * nicht mehr implizit "ich" ist.
 */
export async function alleOffenenProjektAufgaben() {
  return prisma.aufgabe.findMany({
    where: {
      projektId: { not: null },
      status: { not: AufgabeStatus.ERLEDIGT },
      projekt: { status: { notIn: [ProjektStatus.ABGESCHLOSSEN, ProjektStatus.ABGEBROCHEN] } },
    },
    include: {
      projekt: { select: { id: true, titel: true } },
      zwischenziel: { select: { titel: true } },
      zugewiesenAn: { select: { vorname: true, nachname: true } },
    },
    orderBy: [{ faelligAm: { sort: "asc", nulls: "last" } }, { erstelltAm: "asc" }],
  })
}

export async function projektNachrichten(projektId: string) {
  return prisma.projektnachricht.findMany({
    where: { projektId },
    include: { person: { select: { vorname: true, nachname: true } } },
    orderBy: { erstelltAm: "asc" },
  })
}
