import { TableCell as TiptapTableCell } from "@tiptap/extension-table-cell"
import { TableHeader as TiptapTableHeader } from "@tiptap/extension-table-header"

export type VertikaleZellAusrichtung = "top" | "middle" | "bottom"

/**
 * Vertikale Ausrichtung des Zellinhalts (Rückmeldung 2026-09-09) — eigenes
 * Attribut statt der generischen TextAlign-Erweiterung (die ist in
 * RichTextEditor auf Absätze beschränkt) und pro ZELLE statt pro Tabelle
 * einstellbar, weil in der Zwei-Spalten-Tabelle (siehe RichTextEditor,
 * tabelleErlaubt) eine Zelle oft mehr Inhalt hat als die daneben und die
 * kürzere trotzdem z. B. mittig zu ihr stehen soll. "top" ist Standard
 * (entspricht der bisherigen festen CSS-Klasse `[&_td]:align-top` in
 * RichTextEditor/RICH_TEXT_ANZEIGE_KLASSE) — nur bei "middle"/"bottom"
 * wird ein Inline-Style geschrieben, das die Klasse (ohne `!important`)
 * automatisch überstimmt, die Klasse selbst bleibt also unverändert.
 */
function vertikaleAusrichtungAttribut() {
  return {
    verticalAlign: {
      default: "top" as VertikaleZellAusrichtung,
      parseHTML: (element: HTMLElement): VertikaleZellAusrichtung => {
        const treffer = /vertical-align:\s*(top|middle|bottom)/.exec(element.getAttribute("style") ?? "")
        return (treffer?.[1] as VertikaleZellAusrichtung | undefined) ?? "top"
      },
      renderHTML: (attributes: { verticalAlign?: VertikaleZellAusrichtung }) =>
        attributes.verticalAlign && attributes.verticalAlign !== "top"
          ? { style: `vertical-align: ${attributes.verticalAlign}` }
          : {},
    },
  }
}

export const TableCell = TiptapTableCell.extend({
  addAttributes() {
    return { ...this.parent?.(), ...vertikaleAusrichtungAttribut() }
  },
})

export const TableHeader = TiptapTableHeader.extend({
  addAttributes() {
    return { ...this.parent?.(), ...vertikaleAusrichtungAttribut() }
  },
})
