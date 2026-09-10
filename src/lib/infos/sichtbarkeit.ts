import { Prisma } from "@/generated/prisma/client"

import { prisma } from "@/lib/db"

/**
 * Eine Info ist sichtbar für eine Person, wenn sie direkt Empfänger ist,
 * Mitglied einer der Empfänger-Gruppen ODER aktiv einer der
 * Empfänger-Abteilungen zugehörig ist (siehe Kommentar am Model Info) —
 * analog zu `projektSichtbarFuer` in src/lib/projekte/mitgliedschaft.ts —
 * UND zusätzlich schon veröffentlicht ist (siehe Info.veroeffentlichtAm),
 * es sei denn die anfragende Person hat sie selbst erstellt (damit sie
 * einen noch nicht veröffentlichten, per "Geplant am" vorgemerkten
 * Beitrag im eigenen Feed kontrollieren/bearbeiten kann).
 *
 * `istEntwurf` (Rückmeldung 2026-09-09, nicht zu verwechseln mit "Geplant
 * am" oben — ein geplanter Beitrag ist fertig und wartet nur auf seinen
 * Termin, ein Entwurf ist unfertig) ist IMMER ausgeschlossen, auch für die
 * erstellende Person selbst — Entwürfe laufen über eine eigene, private
 * Liste (siehe eigeneInfoEntwuerfe), nicht über den normalen Feed.
 *
 * Bekannte, bewusst nicht behobene Lücke: die "Geplant am"-Ausnahme greift
 * nur, wenn die erstellende Person selbst auch technisch Empfänger ist —
 * postet jemand an eine Abteilung, der er selbst nicht angehört, sieht er
 * seinen eigenen Beitrag im eigenen Feed nicht. Bestand schon vor "Geplant
 * am" genauso (keine Ausnahme für die erstellende Person), hier nicht
 * mitrepariert.
 */
export function infoSichtbarFuer(personId: string): Prisma.InfoWhereInput {
  const jetzt = new Date()
  return {
    AND: [
      { istEntwurf: false },
      { OR: [{ veroeffentlichtAm: { lte: jetzt } }, { erstelltVonId: personId }] },
      {
        OR: [
          { empfaengerPersonen: { some: { personId } } },
          { empfaengerGruppen: { some: { gruppe: { mitglieder: { some: { personId } } } } } },
          {
            empfaengerAbteilungen: {
              some: {
                abteilung: {
                  zugehoerigkeiten: {
                    some: { personId, OR: [{ bisDatum: null }, { bisDatum: { gt: jetzt } }] },
                  },
                },
              },
            },
          },
        ],
      },
    ],
  }
}

/**
 * Reine Boolean-Prüfung ohne Fehlerwurf-Kontext — für Server Actions, die
 * selbst entscheiden, ob sie NichtBerechtigt werfen (Bestätigen/
 * Kommentieren) oder mit 404 antworten (Anhang-Download-Route).
 */
export async function istInfoEmpfaenger(infoId: string, personId: string): Promise<boolean> {
  const treffer = await prisma.info.findFirst({
    where: { id: infoId, ...infoSichtbarFuer(personId) },
    select: { id: true },
  })
  return treffer !== null
}

/**
 * Aktive Zugehörigkeit zur Abteilung "Geschäftsführung" — Voraussetzung
 * (zusätzlich zur Berechtigung "Infos") für den "Im Namen des
 * Unternehmens veröffentlichen"-Schalter beim Erstellen (siehe Kommentar
 * am Model Info, Feld alsUnternehmen). Kein zeitlich begrenztes Feld an
 * Zugehoerigkeit außer bisDatum — offen (null) oder noch in der Zukunft
 * zählt als aktiv, exakt wie bei den übrigen Zugehörigkeits-Prüfungen im
 * Adminbereich.
 */
export async function istGeschaeftsfuehrung(personId: string): Promise<boolean> {
  const jetzt = new Date()
  const treffer = await prisma.zugehoerigkeit.findFirst({
    where: {
      personId,
      abteilung: { name: "Geschäftsführung" },
      OR: [{ bisDatum: null }, { bisDatum: { gt: jetzt } }],
    },
    select: { id: true },
  })
  return treffer !== null
}

/**
 * Bearbeiten darf: die erstellende Person (solange sie noch die
 * Berechtigung "Infos" hat — die berechtigt zum Erstellen UND zum
 * Bearbeiten der eigenen Infos, aber NICHT zum Löschen), ODER wer die
 * Berechtigung "Bearbeiten" (redaktionell, jede Info) ODER "Löschen &
 * Bearbeiten" hat. Siehe Chat vom 2026-09-06 für die Herleitung.
 */
export function darfInfoBearbeiten(
  info: { erstelltVonId: string },
  kontext: { personId: string; berechtigungen: string[] },
): boolean {
  return (
    (info.erstelltVonId === kontext.personId && kontext.berechtigungen.includes("Infos")) ||
    kontext.berechtigungen.includes("Bearbeiten") ||
    kontext.berechtigungen.includes("Löschen & Bearbeiten")
  )
}

/**
 * Löschen darf NUR "Löschen & Bearbeiten" — bewusst nicht die erstellende
 * Person automatisch, auch nicht mit "Infos" oder "Bearbeiten" allein:
 * Löschen kann im Zweifel Beweisketten verschwinden lassen, deshalb an
 * eine eigene, selten vergebene Berechtigung gebunden statt an
 * Autorenschaft.
 */
export function darfInfoLoeschen(kontext: { berechtigungen: string[] }): boolean {
  return kontext.berechtigungen.includes("Löschen & Bearbeiten")
}

/**
 * Deduplizierte Menge der effektiven, noch aktiven Empfänger einer Info
 * (Personen ∪ aktive Gruppenmitglieder ∪ aktiv Abteilungs-Zugehörige,
 * jeweils gefiltert auf Person.aktiv) — Nenner für den Bestätigungsstand
 * ("X von Y bestätigt"). Wird bei jeder Anzeige neu berechnet statt
 * gespeichert: Gruppen-/Abteilungs-Zugehörigkeit ändert sich, der Stand
 * soll den aktuellen Personenkreis widerspiegeln, nicht den zum
 * Erstellungszeitpunkt.
 */
export async function infoEmpfaengerIds(infoId: string): Promise<string[]> {
  const jetzt = new Date()
  const [direkt, ueberGruppe, ueberAbteilung] = await Promise.all([
    prisma.infoEmpfaengerPerson.findMany({
      where: { infoId, person: { aktiv: true } },
      select: { personId: true },
    }),
    prisma.infoEmpfaengerGruppe.findMany({
      where: { infoId },
      select: { gruppe: { select: { mitglieder: { where: { person: { aktiv: true } }, select: { personId: true } } } } },
    }),
    prisma.infoEmpfaengerAbteilung.findMany({
      where: { infoId },
      select: {
        abteilung: {
          select: {
            zugehoerigkeiten: {
              where: { person: { aktiv: true }, OR: [{ bisDatum: null }, { bisDatum: { gt: jetzt } }] },
              select: { personId: true },
            },
          },
        },
      },
    }),
  ])

  const ids = new Set<string>(direkt.map((d) => d.personId))
  for (const gruppe of ueberGruppe) {
    for (const mitglied of gruppe.gruppe.mitglieder) {
      ids.add(mitglied.personId)
    }
  }
  for (const abteilung of ueberAbteilung) {
    for (const zugehoerigkeit of abteilung.abteilung.zugehoerigkeiten) {
      ids.add(zugehoerigkeit.personId)
    }
  }
  return [...ids]
}
