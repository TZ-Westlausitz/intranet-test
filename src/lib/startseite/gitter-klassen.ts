/**
 * Tailwind-Klassen für die Platzierung der Startseiten-Kacheln im
 * 4×2-Raster (Tablet/Desktop, siehe src/app/page.tsx) — als Nachschlage-
 * tabellen mit ausgeschriebenen Klassennamen, nicht als zusammengesetzte
 * Strings: Tailwind erkennt Klassen nur, wenn sie irgendwo im Quelltext
 * wörtlich vorkommen (Build-Zeit-Scan), eine Laufzeit-Zusammensetzung wie
 * `col-start-${n}` würde beim Build unsichtbar bleiben.
 *
 * Das Hochformat (`portrait:`) hat ein eigenes, schmaleres Raster (2
 * Spalten) und wird deshalb nicht aus der Landschafts-Position abgeleitet,
 * sondern aus der Lese-Reihenfolge aller Platzierungen neu berechnet: erst
 * Newsfeed (falls vorhanden) als eigene, volle erste Zeile, danach die
 * übrigen Module zu zweit pro Zeile, in derselben Reihenfolge wie im
 * Landschafts-Raster. Damit bleibt das Hochformat immer lückenlos gefüllt,
 * unabhängig davon, wie die Person das Landschafts-Raster einrichtet — das
 * Hochformat ist bewusst nicht eigenständig einstellbar, siehe Memory
 * `modulare-startseite-baustein`.
 */
import type { StartseiteModulId, StartseitePlatzierung } from "./raster"
import { modulForm } from "./raster"

const SPALTE_START: Record<number, string> = {
  0: "col-start-1",
  1: "col-start-2",
  2: "col-start-3",
  3: "col-start-4",
}
const ZEILE_START: Record<number, string> = {
  0: "row-start-1",
  1: "row-start-2",
}
const PORTRAIT_SPALTE_START: Record<number, string> = {
  0: "portrait:col-start-1",
  1: "portrait:col-start-2",
}
const PORTRAIT_ZEILE_START: Record<number, string> = {
  0: "portrait:row-start-1",
  1: "portrait:row-start-2",
  2: "portrait:row-start-3",
  3: "portrait:row-start-4",
}

/** Zeilenvorlage (`grid-template-rows`) fürs Hochformat-Raster — als Inline-Style gesetzt, da die Zeilenzahl je nach Belegung variiert (siehe src/app/page.tsx, Muster: --kachel/--kachel-abstand). */
export function portraitZeilenVorlage(platzierungen: StartseitePlatzierung[]): string {
  const hatNewsfeed = platzierungen.some((p) => p.modul === "NEWSFEED")
  const kleinAnzahl = platzierungen.filter((p) => p.modul !== "NEWSFEED").length
  const kleinZeilen = Math.ceil(kleinAnzahl / 2)

  const zeilen: string[] = []
  if (hatNewsfeed) zeilen.push("minmax(0,1.7fr)")
  for (let i = 0; i < kleinZeilen; i++) zeilen.push("minmax(0,1fr)")

  return zeilen.length > 0 ? zeilen.join(" ") : "minmax(0,1fr)"
}

/** Landschafts- + Hochformat-Klassen für jedes platzierte Modul, als Nachschlagetabelle nach Modul-ID. */
export function gitterKlassen(platzierungen: StartseitePlatzierung[]): Record<StartseiteModulId, string> {
  const ergebnis = {} as Record<StartseiteModulId, string>

  const sortiert = [...platzierungen].sort((a, b) => a.position - b.position)
  const newsfeed = sortiert.find((p) => p.modul === "NEWSFEED")
  const kleinModule = sortiert.filter((p) => p.modul !== "NEWSFEED")

  for (const p of platzierungen) {
    const spalte = p.position % 4
    const zeile = Math.floor(p.position / 4)
    const klassen = [SPALTE_START[spalte], ZEILE_START[zeile]]

    if (modulForm(p.modul) === "GROSS") {
      klassen.push("col-span-2", "row-span-2", "portrait:row-span-1")
    }

    if (p.modul === "NEWSFEED") {
      klassen.push("portrait:col-start-1", "portrait:row-start-1")
    } else {
      const index = kleinModule.findIndex((k) => k.modul === p.modul)
      const portraitZeileOffset = newsfeed ? 1 : 0
      const portraitZeile = Math.floor(index / 2) + portraitZeileOffset
      const portraitSpalte = index % 2
      klassen.push(PORTRAIT_SPALTE_START[portraitSpalte], PORTRAIT_ZEILE_START[portraitZeile])
    }

    ergebnis[p.modul] = klassen.join(" ")
  }

  return ergebnis
}
