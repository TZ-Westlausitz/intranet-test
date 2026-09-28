/**
 * Modulares Startseiten-Raster (Tablet/Desktop) — Schritt 1 des Bausteins
 * "Modulare Startseite" (Rückmeldung 2026-09-28): jede Person stellt unter
 * /einstellungen selbst ein, welches Modul in welchem der 8 Rasterfelder
 * erscheint, statt einer festen Reihenfolge mit nur einem wählbaren Feld
 * (dem bisherigen "Weiteres"-Modul, siehe `STARTSEITE_WEITERES_MODULE` in
 * bausteine.ts — abgelöst durch dieses Raster).
 *
 * Die 8 Felder sind in einem 4-spaltigen, 2-zeiligen Raster nummeriert
 * (0 = oben links, 3 = oben rechts, 4 = unten links, 7 = unten rechts):
 *
 *   0 1 2 3
 *   4 5 6 7
 *
 * `position` speichert immer die OBEN-LINKS-Zelle eines Moduls. Bei "GROSS"
 * (2×2) sind das automatisch auch die drei Nachbarzellen — deshalb ist
 * "GROSS" nur auf den Positionen 0, 1 oder 2 gültig (Zeile 0, mit Platz für
 * die zweite Spalte), nie in Zeile 1, sonst würde es aus dem Raster
 * herauslaufen.
 *
 * Schritt 1 bildet ausschließlich Module ab, die schon eine fertige
 * Kachel-Darstellung haben (Newsfeed, Kalender, Aufgaben, Wissensbereich,
 * Fahrzeuge, To-Do-Liste, Geplante Aktionen) — jedes in genau der Form, die
 * es heute schon hat. Neue Modul-Inhalte (Formulare, Kontakte-Auswahl,
 * Wissensbereich mit Ordnerwahl) und zusätzliche Formen (BREIT, HOCH)
 * kommen erst in Schritt 2 dazu, siehe Memory
 * `modulare-startseite-baustein`.
 *
 * Das Handy-Layout (`md:hidden` in src/app/page.tsx) ist bewusst NICHT Teil
 * dieses Rasters — die Rückmeldung galt ausdrücklich "Tablet und Desktop".
 */

export type StartseiteModulId =
  | "NEWSFEED"
  | "KALENDER"
  | "AUFGABEN"
  | "WISSENSBEREICH"
  | "FAHRZEUGE"
  | "TODO_LISTE"
  | "GEPLANTE_AKTIONEN"

export type StartseiteForm = "GROSS" | "KLEIN"

export type StartseiteModulKatalogEintrag = {
  id: StartseiteModulId
  name: string
  form: StartseiteForm
}

/** Reihenfolge hier bestimmt auch die Reihenfolge im Auswahl-Pop-up der Einstellungen-Seite. */
export const STARTSEITE_MODUL_KATALOG: StartseiteModulKatalogEintrag[] = [
  { id: "NEWSFEED", name: "Newsfeed", form: "GROSS" },
  { id: "KALENDER", name: "Kalender", form: "KLEIN" },
  { id: "AUFGABEN", name: "Aufgaben", form: "KLEIN" },
  { id: "WISSENSBEREICH", name: "Wissensbereich", form: "KLEIN" },
  { id: "FAHRZEUGE", name: "Fahrzeuge", form: "KLEIN" },
  { id: "TODO_LISTE", name: "To-Do-Liste", form: "KLEIN" },
  { id: "GEPLANTE_AKTIONEN", name: "Geplante Aktionen", form: "KLEIN" },
]

export function modulName(id: StartseiteModulId): string {
  return STARTSEITE_MODUL_KATALOG.find((m) => m.id === id)?.name ?? id
}

export function modulForm(id: StartseiteModulId): StartseiteForm {
  return STARTSEITE_MODUL_KATALOG.find((m) => m.id === id)?.form ?? "KLEIN"
}

export type StartseitePlatzierung = { position: number; modul: StartseiteModulId }

/**
 * Die heutige feste Anordnung als Standard — identisch zum bisherigen,
 * hart codierten Raster in src/app/page.tsx, nur dass Zeile 2/Spalte 4
 * jetzt "To-Do-Liste" statt des früheren impliziten Defaults "Fahrzeuge"
 * zeigt (Rückmeldung 2026-09-28: "News, Kalender, Aufgaben, Wissen,
 * To-Do-Liste" als Zielbild für "Auf Standard zurücksetzen").
 */
export const STARTSEITE_STANDARD: StartseitePlatzierung[] = [
  { position: 0, modul: "NEWSFEED" },
  { position: 2, modul: "KALENDER" },
  { position: 3, modul: "AUFGABEN" },
  { position: 6, modul: "WISSENSBEREICH" },
  { position: 7, modul: "TODO_LISTE" },
]

/** Alle Rasterzellen, die eine Platzierung an dieser Position belegt (1 bei KLEIN, 4 bei GROSS). */
export function belegteZellen(platzierung: StartseitePlatzierung): number[] {
  const { position } = platzierung
  const spalte = position % 4
  const zeile = Math.floor(position / 4)
  if (modulForm(platzierung.modul) === "KLEIN") return [position]
  // GROSS: 2 Spalten × 2 Zeilen ab (spalte, zeile) — nur gültig, wenn beides im Raster bleibt.
  if (spalte > 2 || zeile > 0) return [] // ungültige Position, siehe gueltigesRaster()
  return [position, position + 1, position + 4, position + 5]
}

/** Prüft ein komplettes Raster auf gültige Positionen, keine Überlappungen und bekannte Module. */
function gueltigesRaster(platzierungen: StartseitePlatzierung[]): boolean {
  const bekannteIds = new Set(STARTSEITE_MODUL_KATALOG.map((m) => m.id))
  const belegt = new Set<number>()
  const gesehen = new Set<StartseiteModulId>()

  for (const p of platzierungen) {
    if (!bekannteIds.has(p.modul)) return false
    if (gesehen.has(p.modul)) return false // jedes Modul nur einmal im Raster
    gesehen.add(p.modul)

    if (p.position < 0 || p.position > 7) return false
    const zellen = belegteZellen(p)
    if (zellen.length === 0) return false // GROSS an ungültiger Stelle
    for (const zelle of zellen) {
      if (belegt.has(zelle)) return false
      belegt.add(zelle)
    }
  }
  return true
}

/**
 * Liest `Person.startseiteRaster` (JSON-Text) und liefert ein gültiges
 * Raster zurück — bei `null`, kaputtem JSON oder einem inkonsistenten
 * Stand (z. B. durch einen künftigen Katalog-Umbau) fällt es auf
 * `STARTSEITE_STANDARD` zurück, statt die Startseite kaputtgehen zu lassen.
 */
export function parseRaster(gespeichert: string | null): StartseitePlatzierung[] {
  if (!gespeichert) return STARTSEITE_STANDARD
  try {
    const geparst = JSON.parse(gespeichert)
    if (!Array.isArray(geparst)) return STARTSEITE_STANDARD
    const platzierungen: StartseitePlatzierung[] = geparst.map((eintrag) => ({
      position: Number(eintrag.position),
      modul: eintrag.modul as StartseiteModulId,
    }))
    return gueltigesRaster(platzierungen) ? platzierungen : STARTSEITE_STANDARD
  } catch {
    return STARTSEITE_STANDARD
  }
}

/** Für eine neue Platzierung: prüft, ob `modul` an `position` passt, ohne bestehende Module zu überlappen. */
export function platzierungPasst(
  bestehende: StartseitePlatzierung[],
  position: number,
  modul: StartseiteModulId
): boolean {
  const probe: StartseitePlatzierung = { position, modul }
  const zellen = belegteZellen(probe)
  if (zellen.length === 0) return false
  const belegt = new Set(bestehende.flatMap(belegteZellen))
  return zellen.every((z) => !belegt.has(z))
}
