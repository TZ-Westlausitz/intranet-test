/**
 * Modulares Startseiten-Raster (Tablet/Desktop) — Baustein "Modulare
 * Startseite", Schritt 1 am 2026-09-28, Schritt 2 (neue Modul-Inhalte
 * Formulare/Kontakte, wählbare Formen BREIT/HOCH) direkt danach. Jede
 * Person stellt unter /einstellungen selbst ein, welches Modul in welcher
 * Form in welchem der 8 Rasterfelder erscheint.
 *
 * Die 8 Felder sind in einem 4-spaltigen, 2-zeiligen Raster nummeriert
 * (0 = oben links, 3 = oben rechts, 4 = unten links, 7 = unten rechts):
 *
 *   0 1 2 3
 *   4 5 6 7
 *
 * `position` speichert immer die OBEN-LINKS-Zelle einer Platzierung. Formen:
 * - KLEIN: 1×1 (jede Position gültig)
 * - BREIT: 2×1 (Position braucht Platz nach rechts — Spalte 0-2)
 * - HOCH:  1×2 (Position braucht Platz nach unten — nur Zeile 0)
 * - GROSS: 2×2 (Spalte 0-2 UND Zeile 0 — bisher nur Newsfeed)
 *
 * Newsfeed bietet zusätzlich HOCH an (Rückmeldung 2026-09-28) — die
 * Beitragsliste ist ohnehin eine schmale, scrollende Spalte, das passt gut
 * in eine schmale hohe Zelle. BREIT (kurz und breit) passt dagegen NICHT
 * zu Beitragskarten, die von Natur aus mehr Höhe als Breite brauchen —
 * deshalb bewusst nicht angeboten, keine eigene "Ticker"-Darstellung dafür
 * gebaut.
 *
 * Manche Module brauchen zusätzlich zu Position+Form eine Unterauswahl
 * (KONTAKTE: 3–5 Personen, WISSENSBEREICH: 1–3 Ordner, FORMULARE bei BREIT:
 * bis zu 5 Vorlagen als Schnellzugriff) — siehe `brauchtUnterauswahl` und
 * die jeweiligen Felder auf `StartseitePlatzierung`. Die übrigen Module
 * sind mit Modul+Form fertig konfiguriert.
 */

export type StartseiteModulId =
  | "NEWSFEED"
  | "KALENDER"
  | "AUFGABEN"
  | "WISSENSBEREICH"
  | "FAHRZEUGE"
  | "TODO_LISTE"
  | "GEPLANTE_AKTIONEN"
  | "FORMULARE"
  | "KONTAKTE"

export type StartseiteForm = "KLEIN" | "BREIT" | "HOCH" | "GROSS"

/**
 * Randfarbe je Modul (Rückmeldung 2026-09-30: "wie bekommen wir das
 * Farbthema der Kästchen in ein sinnvolles Muster?") — fest am Modul,
 * nicht an der Rasterposition, damit ein Modul immer an seiner Farbe
 * wiedererkennbar bleibt, egal wo es im eigenen Raster liegt. GRUEN für
 * die Hauptthemen (Newsfeed, Aufgaben, Formulare, To-Do-Liste), ORANGE
 * für die übrigen (Kalender, Wissensbereich, Kontakte, Fahrzeuge,
 * Geplante Aktionen). Vorher hatte jede Kachel ihre Randfarbe einzeln
 * hardcodiert, ohne erkennbares Muster (u. a. zwei zufällige
 * "gruen-dunkel"-Ausreißer bei Aufgaben/Formulare) — jetzt EINE Quelle,
 * siehe modulAkzentKlassen().
 */
export type StartseiteAkzent = "GRUEN" | "ORANGE"

export type StartseiteModulKatalogEintrag = {
  id: StartseiteModulId
  name: string
  /** Erlaubte Formen, erster Eintrag ist die im Auswahl-Pop-up voreingestellte. */
  formen: StartseiteForm[]
  akzent: StartseiteAkzent
}

/** Reihenfolge hier bestimmt auch die Reihenfolge im Auswahl-Pop-up der Einstellungen-Seite. */
export const STARTSEITE_MODUL_KATALOG: StartseiteModulKatalogEintrag[] = [
  { id: "NEWSFEED", name: "Newsfeed", formen: ["GROSS", "HOCH"], akzent: "GRUEN" },
  { id: "KALENDER", name: "Kalender", formen: ["KLEIN"], akzent: "ORANGE" },
  { id: "AUFGABEN", name: "Aufgaben", formen: ["KLEIN"], akzent: "GRUEN" },
  { id: "WISSENSBEREICH", name: "Wissensbereich", formen: ["KLEIN", "BREIT", "HOCH"], akzent: "ORANGE" },
  { id: "FORMULARE", name: "Formulare", formen: ["KLEIN", "BREIT"], akzent: "GRUEN" },
  { id: "KONTAKTE", name: "Kontakte", formen: ["KLEIN", "BREIT"], akzent: "ORANGE" },
  { id: "FAHRZEUGE", name: "Fahrzeuge", formen: ["KLEIN"], akzent: "ORANGE" },
  { id: "TODO_LISTE", name: "To-Do-Liste", formen: ["KLEIN"], akzent: "GRUEN" },
  { id: "GEPLANTE_AKTIONEN", name: "Geplante Aktionen", formen: ["KLEIN"], akzent: "ORANGE" },
]

export function modulName(id: StartseiteModulId): string {
  return STARTSEITE_MODUL_KATALOG.find((m) => m.id === id)?.name ?? id
}

export function modulErlaubteFormen(id: StartseiteModulId): StartseiteForm[] {
  return STARTSEITE_MODUL_KATALOG.find((m) => m.id === id)?.formen ?? ["KLEIN"]
}

/** Tailwind-Klassen für Rand+Hover einer Kachel, passend zu ihrem Modul-Akzent (siehe STARTSEITE_MODUL_KATALOG). */
export function modulAkzentKlassen(id: StartseiteModulId): string {
  const akzent = STARTSEITE_MODUL_KATALOG.find((m) => m.id === id)?.akzent ?? "GRUEN"
  return akzent === "GRUEN" ? "border-t-marke-gruen hover:border-marke-gruen" : "border-t-marke-orange hover:border-marke-orange"
}

/**
 * KONTAKTE (jede Form) und WISSENSBEREICH (jede Form) brauchen immer eine
 * Unterauswahl, FORMULARE nur bei der Form BREIT (Rückmeldung 2026-09-28:
 * das rechte der beiden inneren Kästchen dort zeigt gewählte Vorlagen als
 * Schnellzugriff — bei KLEIN ist dafür kein Platz). Läuft nach Modul+Form-
 * Wahl über einen zweiten Schritt im Einstellungen-Pop-up.
 */
export function brauchtUnterauswahl(modul: StartseiteModulId, form: StartseiteForm): boolean {
  if (modul === "KONTAKTE" || modul === "WISSENSBEREICH") return true
  if (modul === "FORMULARE" && form === "BREIT") return true
  return false
}

export const KONTAKTE_MIN = 3
export const KONTAKTE_MAX = 5
export const WISSENSBEREICH_MAX_ORDNER_HOCH = 3
export const FORMULARE_MAX_SHORTCUTS = 5

export type StartseitePlatzierung = {
  position: number
  modul: StartseiteModulId
  form: StartseiteForm
  /** Nur KONTAKTE: 3–5 ausgewählte Personen (Benutzername). */
  personenIds?: string[]
  /** Nur WISSENSBEREICH: 1 Ordner (KLEIN/BREIT) oder bis zu 3 (HOCH). */
  ordnerIds?: string[]
  /** Nur FORMULARE bei der Form BREIT: bis zu 5 gewählte Vorlagen als Schnellzugriff. */
  formularIds?: string[]
}

/**
 * Die heutige feste Anordnung als Standard — News/Kalender/Aufgaben/Wissen/
 * To-Do-Liste (Rückmeldung 2026-09-28), identisch zur ursprünglichen festen
 * Startseite.
 */
export const STARTSEITE_STANDARD: StartseitePlatzierung[] = [
  { position: 0, modul: "NEWSFEED", form: "GROSS" },
  { position: 2, modul: "KALENDER", form: "KLEIN" },
  { position: 3, modul: "AUFGABEN", form: "KLEIN" },
  { position: 6, modul: "WISSENSBEREICH", form: "KLEIN" },
  { position: 7, modul: "TODO_LISTE", form: "KLEIN" },
]

/** Alle Rasterzellen, die eine Platzierung an dieser Position/Form belegt — leer, wenn die Form dort nicht hinpasst (z. B. GROSS in Zeile 2). */
export function belegteZellen(platzierung: { position: number; form: StartseiteForm }): number[] {
  const { position, form } = platzierung
  const spalte = position % 4
  const zeile = Math.floor(position / 4)

  switch (form) {
    case "KLEIN":
      return [position]
    case "BREIT":
      return spalte > 2 ? [] : [position, position + 1]
    case "HOCH":
      return zeile > 0 ? [] : [position, position + 4]
    case "GROSS":
      return spalte > 2 || zeile > 0 ? [] : [position, position + 1, position + 4, position + 5]
  }
}

/** Prüft ein komplettes Raster auf gültige Positionen/Formen, keine Überlappungen und bekannte Module. Unterauswahlen (personenIds/ordnerIds) werden nur auf ihre Grundform (Array von Strings) geprüft, nicht auf Mindestanzahl — ein noch unvollständig konfiguriertes Modul soll das ganze Raster nicht ungültig machen. */
function gueltigesRaster(platzierungen: StartseitePlatzierung[]): boolean {
  const katalogNachId = new Map(STARTSEITE_MODUL_KATALOG.map((m) => [m.id, m]))
  const belegt = new Set<number>()
  const gesehen = new Set<StartseiteModulId>()

  for (const p of platzierungen) {
    const katalogEintrag = katalogNachId.get(p.modul)
    if (!katalogEintrag) return false
    if (!katalogEintrag.formen.includes(p.form)) return false
    if (gesehen.has(p.modul)) return false // jedes Modul nur einmal im Raster
    gesehen.add(p.modul)

    if (p.position < 0 || p.position > 7) return false
    const zellen = belegteZellen(p)
    if (zellen.length === 0) return false
    for (const zelle of zellen) {
      if (belegt.has(zelle)) return false
      belegt.add(zelle)
    }

    if (p.personenIds !== undefined && !Array.isArray(p.personenIds)) return false
    if (p.ordnerIds !== undefined && !Array.isArray(p.ordnerIds)) return false
    if (p.formularIds !== undefined && !Array.isArray(p.formularIds)) return false
  }
  return true
}

/** Vor Schritt 2 gespeicherte Platzierungen hatten noch kein `form`-Feld — jedes Modul hatte damals genau eine feste Form. */
const LEGACY_FORM: Record<StartseiteModulId, StartseiteForm> = {
  NEWSFEED: "GROSS",
  KALENDER: "KLEIN",
  AUFGABEN: "KLEIN",
  WISSENSBEREICH: "KLEIN",
  FORMULARE: "KLEIN",
  KONTAKTE: "KLEIN",
  FAHRZEUGE: "KLEIN",
  TODO_LISTE: "KLEIN",
  GEPLANTE_AKTIONEN: "KLEIN",
}

/**
 * Liest `Person.startseiteRaster` (JSON-Text) und liefert ein gültiges
 * Raster zurück — bei `null`, kaputtem JSON oder einem inkonsistenten
 * Stand fällt es auf `STARTSEITE_STANDARD` zurück, statt die Startseite
 * kaputtgehen zu lassen.
 */
export function parseRaster(gespeichert: string | null): StartseitePlatzierung[] {
  if (!gespeichert) return STARTSEITE_STANDARD
  try {
    const geparst = JSON.parse(gespeichert)
    if (!Array.isArray(geparst)) return STARTSEITE_STANDARD
    const platzierungen: StartseitePlatzierung[] = geparst.map((eintrag) => ({
      position: Number(eintrag.position),
      modul: eintrag.modul as StartseiteModulId,
      form: (eintrag.form as StartseiteForm) ?? LEGACY_FORM[eintrag.modul as StartseiteModulId] ?? "KLEIN",
      personenIds: Array.isArray(eintrag.personenIds) ? eintrag.personenIds : undefined,
      ordnerIds: Array.isArray(eintrag.ordnerIds) ? eintrag.ordnerIds : undefined,
      formularIds: Array.isArray(eintrag.formularIds) ? eintrag.formularIds : undefined,
    }))
    return gueltigesRaster(platzierungen) ? platzierungen : STARTSEITE_STANDARD
  } catch {
    return STARTSEITE_STANDARD
  }
}

/** Für eine neue Platzierung: prüft, ob `modul` in dieser `form` an `position` passt, ohne bestehende Module zu überlappen. */
export function platzierungPasst(
  bestehende: StartseitePlatzierung[],
  position: number,
  modul: StartseiteModulId,
  form: StartseiteForm
): boolean {
  if (!modulErlaubteFormen(modul).includes(form)) return false
  const zellen = belegteZellen({ position, form })
  if (zellen.length === 0) return false
  const belegt = new Set(bestehende.flatMap(belegteZellen))
  return zellen.every((z) => !belegt.has(z))
}
