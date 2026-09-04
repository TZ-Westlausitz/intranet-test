import { Prisma } from "@/generated/prisma/client"
import type { Projekt, Projektmitglied } from "@/generated/prisma/client"
import { ProjektmitgliedRolle, ProjektStatus } from "@/generated/prisma/enums"

import { prisma } from "@/lib/db"
import { NichtBerechtigt } from "@/lib/auth/berechtigung"

/**
 * Ein Projekt ist sichtbar für jede Person mit einer AKTIVEN
 * Mitgliedschaft (siehe Model Projektmitglied) — nicht über
 * Standort/Abteilung/Rolle wie sonst im Projekt üblich. Analog zu
 * `sichtbarFuer` in src/lib/termine/abfragen.ts.
 */
export function projektSichtbarFuer(personId: string): Prisma.ProjektWhereInput {
  return {
    // Dieselbe Regel wie projektZugriffTrotzPlanung, nur als Query
    // ausgedrückt (dort nicht direkt aufrufbar) — bei einer Änderung dort
    // auch hier nachziehen.
    OR: [
      { status: { not: ProjektStatus.PLANUNG }, mitglieder: { some: { personId, ausgeschiedenAm: null } } },
      {
        status: ProjektStatus.PLANUNG,
        mitglieder: { some: { personId, ausgeschiedenAm: null, rolle: ProjektmitgliedRolle.LEITUNG } },
      },
    ],
  }
}

/**
 * Während der Planung ist ein Projekt nur für die Leitung sichtbar/nutzbar
 * — andere Mitglieder werden erst beim "Projekt starten" (projektStarten)
 * benachrichtigt und bekommen dann Zugriff. Prüft NICHT ausgeschiedenAm —
 * das bleibt Sache der jeweiligen Aufrufstelle (dort ohnehin schon
 * vorhanden).
 */
export function projektZugriffTrotzPlanung(projektStatus: ProjektStatus, mitgliedRolle: ProjektmitgliedRolle): boolean {
  return projektStatus !== ProjektStatus.PLANUNG || mitgliedRolle === ProjektmitgliedRolle.LEITUNG
}

/**
 * Schreibbar bis einschließlich 23:59:59 Uhr des `ende`-Tages, danach
 * automatisch schreibgeschützt — ebenso bei ABGESCHLOSSEN/ABGEBROCHEN,
 * unabhängig vom Datum. Wird bei jeder schreibenden Aktion neu berechnet,
 * kein Hintergrundjob (gleiches Prinzip wie TerminErinnerung).
 */
export function istProjektSchreibgeschuetzt(projekt: Pick<Projekt, "status" | "ende">): boolean {
  if (projekt.status === ProjektStatus.ABGESCHLOSSEN || projekt.status === ProjektStatus.ABGEBROCHEN) {
    return true
  }
  const endeDesEndeTages = new Date(projekt.ende)
  endeDesEndeTages.setHours(23, 59, 59, 999)
  return new Date() > endeDesEndeTages
}

/**
 * Reine Boolean-Prüfung ohne Fehlerwurf — für Stellen, die kein
 * NichtBerechtigt werfen wollen/können, z. B. eine Download-Route, die
 * stattdessen mit 404 antwortet (siehe
 * src/app/api/aufgaben/[aufgabeId]/anhaenge/[anhangId]/route.ts).
 */
export async function istAktivesProjektmitglied(projektId: string, personId: string): Promise<boolean> {
  const [projekt, mitglied] = await Promise.all([
    prisma.projekt.findUnique({ where: { id: projektId }, select: { status: true } }),
    prisma.projektmitglied.findUnique({ where: { projektId_personId: { projektId, personId } } }),
  ])
  if (!projekt || !mitglied || mitglied.ausgeschiedenAm !== null) return false
  return projektZugriffTrotzPlanung(projekt.status, mitglied.rolle)
}

/**
 * Prüft die Mitgliedschaft (und optional Leitungsrolle/Schreibrecht) für
 * eine Projekt-Aktion — wirft NichtBerechtigt, wenn die Voraussetzung
 * fehlt. Wird von jeder Projekt-Aktion als zweite Zeile aufgerufen, direkt
 * nach berechtigung() (siehe dort: Datensatz-Sichtbarkeit ist bewusst
 * NICHT Teil der zentralen Rechtefunktion, genau wie bei Auftrag/Termin —
 * dieser Helfer ist das baustein-lokale Pendant zu `sichtbarFuer` und den
 * inline-Prüfungen in src/lib/auftraege/aktionen.ts).
 *
 * `erfordertSchreibrecht` gilt NICHT für das Bearbeiten des Projekts selbst
 * oder die Mitgliederverwaltung — eine Leitung muss an ein abgelaufenes
 * Projekt noch herankommen, um das Enddatum zu verlängern oder den Status
 * zu ändern.
 */
export async function projektMitgliedschaftPruefen(
  projektId: string,
  personId: string,
  optionen?: { nurLeitung?: boolean; erfordertSchreibrecht?: boolean },
): Promise<{ projekt: Projekt; mitglied: Projektmitglied }> {
  const projekt = await prisma.projekt.findUnique({ where: { id: projektId } })
  if (!projekt) {
    throw new NichtBerechtigt("Projekt nicht gefunden")
  }

  const mitglied = await prisma.projektmitglied.findUnique({
    where: { projektId_personId: { projektId, personId } },
  })
  if (!mitglied || mitglied.ausgeschiedenAm !== null) {
    throw new NichtBerechtigt("kein aktives Mitglied dieses Projekts")
  }

  if (!projektZugriffTrotzPlanung(projekt.status, mitglied.rolle)) {
    throw new NichtBerechtigt("Projekt ist noch in der Planung, nur die Leitung hat bisher Zugriff")
  }

  if (optionen?.nurLeitung && mitglied.rolle !== ProjektmitgliedRolle.LEITUNG) {
    throw new NichtBerechtigt("nur die Leitung darf das")
  }

  if (optionen?.erfordertSchreibrecht && istProjektSchreibgeschuetzt(projekt)) {
    throw new NichtBerechtigt("Projekt ist schreibgeschützt (Enddatum erreicht oder abgeschlossen)")
  }

  return { projekt, mitglied }
}
