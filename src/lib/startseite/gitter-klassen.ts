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
 * sondern per `portraitPackung` neu gepackt: in Lese-Reihenfolge (nach
 * `position` sortiert) wird jede Platzierung so breit wie in der Landschaft
 * (GROSS/BREIT = 2 Spalten, KLEIN/HOCH = 1 Spalte) in die nächste freie
 * Zeile gelegt. Anders als in der Landschaft ist im Hochformat JEDE Zeile
 * nur 1 Feld hoch — auch eine HOCH-Platzierung (in der Landschaft 1×2)
 * wird im Hochformat normal hoch, genau wie GROSS dort schon immer nur
 * `row-span-1` bekommt. Das Hochformat ist bewusst nicht eigenständig
 * einstellbar, siehe Memory `modulare-startseite-baustein`.
 */
import type { StartseiteForm, StartseiteModulId, StartseitePlatzierung } from "./raster"

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

/** Landschafts-Breite einer Form in Rasterspalten (1 oder 2) — bestimmt auch die Hochformat-Breite. */
function formBreite(form: StartseiteForm): 1 | 2 {
  return form === "GROSS" || form === "BREIT" ? 2 : 1
}

type PortraitZelle = { modul: StartseiteModulId; spalte: number; zeile: number; breite: 1 | 2; gross: boolean }

/** Packt alle Platzierungen zeilenweise ins 2-spaltige Hochformat-Raster, in Lese-Reihenfolge (Landschafts-Position). */
function portraitPackung(platzierungen: StartseitePlatzierung[]): PortraitZelle[] {
  const sortiert = [...platzierungen].sort((a, b) => a.position - b.position)
  const ergebnis: PortraitZelle[] = []
  let zeile = 0
  let fuellstand = 0

  for (const p of sortiert) {
    const breite = formBreite(p.form)
    if (fuellstand + breite > 2) {
      zeile += 1
      fuellstand = 0
    }
    ergebnis.push({ modul: p.modul, spalte: fuellstand, zeile, breite, gross: p.form === "GROSS" })
    fuellstand += breite
  }

  return ergebnis
}

/** Zeilenvorlage (`grid-template-rows`) fürs Hochformat-Raster — als Inline-Style gesetzt, da Zeilenzahl und welche Zeile "groß" ist von der Belegung abhängen (Muster: --kachel/--kachel-abstand in src/app/page.tsx). Nur die Zeile mit Newsfeed (GROSS) bekommt mehr Höhe. */
export function portraitZeilenVorlage(platzierungen: StartseitePlatzierung[]): string {
  const packung = portraitPackung(platzierungen)
  if (packung.length === 0) return "minmax(0,1fr)"

  const zeilenAnzahl = Math.max(...packung.map((z) => z.zeile)) + 1
  const grosseZeilen = new Set(packung.filter((z) => z.gross).map((z) => z.zeile))

  return Array.from({ length: zeilenAnzahl }, (_, i) => (grosseZeilen.has(i) ? "minmax(0,1.7fr)" : "minmax(0,1fr)")).join(" ")
}

/** Landschafts- + Hochformat-Klassen für jedes platzierte Modul, als Nachschlagetabelle nach Modul-ID. */
export function gitterKlassen(platzierungen: StartseitePlatzierung[]): Record<StartseiteModulId, string> {
  const ergebnis = {} as Record<StartseiteModulId, string>
  const packung = portraitPackung(platzierungen)
  const portraitNachModul = new Map(packung.map((z) => [z.modul, z]))

  for (const p of platzierungen) {
    const spalte = p.position % 4
    const zeile = Math.floor(p.position / 4)
    const klassen = [SPALTE_START[spalte], ZEILE_START[zeile]]

    if (p.form === "GROSS") klassen.push("col-span-2", "row-span-2", "portrait:row-span-1")
    else if (p.form === "BREIT") klassen.push("col-span-2")
    else if (p.form === "HOCH") klassen.push("row-span-2", "portrait:row-span-1")

    // col-span-2 (oben, bei GROSS/BREIT) gilt schon unpräfixiert in beiden
    // Ausrichtungen — im Hochformat ist die Breite ohnehin identisch zur
    // Landschaft (siehe formBreite), nur die Zeilenposition ändert sich.
    const portraitZelle = portraitNachModul.get(p.modul)
    if (portraitZelle) {
      klassen.push(PORTRAIT_SPALTE_START[portraitZelle.spalte], PORTRAIT_ZEILE_START[portraitZelle.zeile])
    }

    ergebnis[p.modul] = klassen.join(" ")
  }

  return ergebnis
}
