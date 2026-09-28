import { prisma } from "@/lib/db"

/**
 * Gemeinsamer Abfrage-Baustein für die Kontakte-Übersicht und die
 * Personen-Detailseite — dieselbe Zugehörigkeits-/Gruppen-Form wie im
 * bestehenden Adminbereich (siehe src/app/(verwaltung)/admin/benutzer/page.tsx,
 * dort bewusst weiterhin inline belassen, kein Umbau einer funktionierenden
 * Admin-Seite hier).
 */
function aktiveZugehoerigkeitenInclude(jetzt: Date) {
  return {
    where: { OR: [{ bisDatum: null }, { bisDatum: { gt: jetzt } }] },
    include: { standort: true, abteilung: true },
  }
}

/** Für /kontakte: alle aktiven Personen mit ihren aktuellen Zugehörigkeiten und Gruppen. */
export async function aktivePersonenUebersicht() {
  const jetzt = new Date()
  return prisma.person.findMany({
    where: { aktiv: true },
    include: {
      zugehoerigkeiten: aktiveZugehoerigkeitenInclude(jetzt),
      gruppen: { include: { gruppe: true } },
    },
    orderBy: [{ nachname: "asc" }, { vorname: "asc" }],
  })
}

/**
 * Für /kontakte/[personId] — `null`, wenn die Person gar nicht existiert.
 * Bewusst KEIN `aktiv`-Filter auf der Person selbst (nur bei den
 * Zugehörigkeiten): eine alte @Erwähnung in einem Newsfeed-Beitrag auf eine
 * inzwischen deaktivierte Person (Regel 4: Person wird nie gelöscht) soll
 * nicht ins Leere laufen, sondern "Nicht mehr aktiv" zeigen können.
 */
export async function personKontaktDetail(personId: string) {
  const jetzt = new Date()
  return prisma.person.findUnique({
    where: { benutzername: personId },
    include: {
      zugehoerigkeiten: aktiveZugehoerigkeitenInclude(jetzt),
      gruppen: { include: { gruppe: true } },
    },
  })
}

/** Schlanke Liste für die Personen-Auswahl (Startseiten-Einstellungen, Kontakte-Kachel) — nur Name, kein voller Datensatz wie aktivePersonenUebersicht. */
export async function personenAuswahlListe() {
  return prisma.person.findMany({
    where: { aktiv: true },
    select: { benutzername: true, vorname: true, nachname: true },
    orderBy: [{ nachname: "asc" }, { vorname: "asc" }],
  })
}

/** Für die Kontakte-Kachel auf der Startseite — die gewählten Personen in der ausgewählten Reihenfolge, deaktivierte Personen fallen dabei still raus (Regel 4). */
export async function personenFuerKachel(personenIds: string[]) {
  if (personenIds.length === 0) return []
  const personen = await prisma.person.findMany({
    where: { benutzername: { in: personenIds }, aktiv: true },
    select: { benutzername: true, vorname: true, nachname: true, profilbildPfad: true },
  })
  const nachId = new Map(personen.map((p) => [p.benutzername, p]))
  return personenIds.map((id) => nachId.get(id)).filter((p): p is NonNullable<typeof p> => p !== undefined)
}
