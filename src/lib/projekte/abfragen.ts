import { prisma } from "@/lib/db"
import { AufgabeStatus, ProjektStatus } from "@/generated/prisma/enums"
import { projektSichtbarFuer } from "@/lib/projekte/mitgliedschaft"

/** "Meine Projekte" für die Übersichtsseite /aufgaben/projekte. */
export async function projekteFuerPerson(personId: string) {
  return prisma.projekt.findMany({
    where: projektSichtbarFuer(personId),
    orderBy: [{ status: "asc" }, { ende: "asc" }],
  })
}

/**
 * Admin-Modus (siehe Kontext.adminModusAktiv): jedes noch nicht
 * abgeschlossene/abgebrochene Projekt firmenweit, ohne Mitgliedschafts-
 * Einschränkung — rein lesend, siehe Plan "Admin-Modus".
 */
export async function alleProjekte() {
  return prisma.projekt.findMany({
    where: { status: { notIn: [ProjektStatus.ABGESCHLOSSEN, ProjektStatus.ABGEBROCHEN] } },
    orderBy: [{ status: "asc" }, { ende: "asc" }],
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
        include: { person: { select: { vorname: true, nachname: true } } },
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
    where: { projektId: { not: null }, status: { not: AufgabeStatus.ERLEDIGT } },
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
