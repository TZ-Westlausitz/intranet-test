"use client"

import { useRef } from "react"
import TiptapImage from "@tiptap/extension-image"
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react"

/**
 * Inline-Bild im Fließtext (Titelbild, Abschnittsbild) — Erweiterung des
 * offiziellen `@tiptap/extension-image` um zwei Dinge:
 *
 * 1. `cid`: ein rein clientseitiges Merkmal (siehe RichTextEditor), über
 *    das die Server Action nach dem Speichern den echten `src` einsetzt —
 *    der Editor selbst liefert für `src` nur eine `blob:`-URL, die
 *    serverseitig sinnlos wäre und vom Sanitizer entfernt wird (siehe
 *    Kommentar in src/lib/rich-text.ts).
 * 2. `width`/`height` als echte HTML-Attribute (nicht CSS `style`, siehe
 *    Sicherheitsgrund oben) — darüber läuft die Größenänderung.
 *
 * Verschieben innerhalb des Textflusses braucht keinen eigenen Code:
 * ProseMirror-Knoten sind mit `draggable: true` (Tiptap-Standard bei
 * Image) bereits nativ per Drag neu positionierbar. Nur das
 * Ecken-Ziehen zum proportionalen Skalieren ist eigens gebaut
 * (BildNodeAnsicht unten), weil Tiptap dafür nichts mitbringt.
 */
export const Bild = TiptapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      cid: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-cid"),
        renderHTML: (attributes) => (attributes.cid ? { "data-cid": attributes.cid } : {}),
      },
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute("width"),
        renderHTML: (attributes) => (attributes.width ? { width: attributes.width } : {}),
      },
      height: {
        default: null,
        parseHTML: (element) => element.getAttribute("height"),
        renderHTML: (attributes) => (attributes.height ? { height: attributes.height } : {}),
      },
      // Eigenes Attribut statt der generischen TextAlign-Erweiterung: Ein
      // Bild ist (anders als ein Absatz) selbst ein eigenständiger Block
      // ohne umschließenden Text, dessen Inhalt man ausrichten könnte —
      // "text-align" auf dem <img> selbst hätte keinerlei Effekt. Der
      // Standardtrick dafür ist stattdessen ein Block-Element mit
      // margin:auto auf der jeweiligen Seite, siehe renderHTML. Die
      // Werkzeugleiste (RichTextEditor) benutzt für ein ausgewähltes Bild
      // dieselben L/Z/R-Knöpfe, ruft aber `updateAttributes("image", ...)`
      // statt `setTextAlign` auf.
      ausrichtung: {
        default: "left",
        parseHTML: (element) => {
          const style = element.getAttribute("style") ?? ""
          if (/margin-left:\s*auto/.test(style) && /margin-right:\s*auto/.test(style)) return "center"
          if (/margin-left:\s*auto/.test(style)) return "right"
          return "left"
        },
        renderHTML: (attributes) => {
          if (!attributes.ausrichtung || attributes.ausrichtung === "left") return {}
          return {
            style:
              attributes.ausrichtung === "center"
                ? "display:block;margin-left:auto;margin-right:auto"
                : "display:block;margin-left:auto;margin-right:0",
          }
        },
      },
    }
  },
  addNodeView() {
    return ReactNodeViewRenderer(BildNodeAnsicht)
  },
})

const MINDESTBREITE = 60

/** Ecke → welche Bildschirmkante beim Ziehen als Anker (fester Punkt) dient. */
const ANKER: Record<string, "left" | "right"> = { nw: "right", sw: "right", ne: "left", se: "left" }
const POSITION: Record<string, string> = {
  nw: "-top-1.5 -left-1.5 cursor-nwse-resize",
  ne: "-top-1.5 -right-1.5 cursor-nesw-resize",
  sw: "-bottom-1.5 -left-1.5 cursor-nesw-resize",
  se: "-bottom-1.5 -right-1.5 cursor-nwse-resize",
}

function BildNodeAnsicht({ node, updateAttributes, selected }: NodeViewProps) {
  const bildRef = useRef<HTMLImageElement>(null)

  function ziehenStarten(ecke: string) {
    return (ereignis: React.PointerEvent) => {
      ereignis.preventDefault()
      const bild = bildRef.current
      if (!bild) return

      const rect = bild.getBoundingClientRect()
      const seitenverhaeltnis = rect.width / rect.height
      const ankerX = ANKER[ecke] === "left" ? rect.left : rect.right

      function bewegen(e: PointerEvent) {
        const rohBreite = ANKER[ecke] === "left" ? e.clientX - ankerX : ankerX - e.clientX
        const breite = Math.round(Math.max(MINDESTBREITE, rohBreite))
        updateAttributes({ width: breite, height: Math.round(breite / seitenverhaeltnis) })
      }
      function loslassen() {
        window.removeEventListener("pointermove", bewegen)
        window.removeEventListener("pointerup", loslassen)
      }
      window.addEventListener("pointermove", bewegen)
      window.addEventListener("pointerup", loslassen)
    }
  }

  // Äußerer Wrapper ist ein voller Block (die "Zeile", auf der das Bild
  // steht) — erst DARIN sorgt margin:auto auf einem auf die Bildbreite
  // begrenzten inneren Kasten für Links-/Mittig-/Rechtsbündigkeit; ohne
  // diesen äußeren, breiteren Rahmen hätte margin:auto nichts, wodurch es
  // verschieben könnte. Die Anfasser hängen am inneren Kasten, damit sie
  // weiterhin genau an den sichtbaren Bildkanten sitzen.
  const ausrichtung = node.attrs.ausrichtung ?? "left"
  const randStil: React.CSSProperties =
    ausrichtung === "center"
      ? { marginLeft: "auto", marginRight: "auto" }
      : ausrichtung === "right"
        ? { marginLeft: "auto", marginRight: 0 }
        : { marginLeft: 0, marginRight: "auto" }

  return (
    <NodeViewWrapper style={{ lineHeight: 0 }}>
      <div
        className="relative"
        style={{ width: node.attrs.width ? `${node.attrs.width}px` : "fit-content", ...randStil }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Editor-Vorschau (blob:-URL) bzw. spätere Anzeige aus der Ablage, kein optimierbares Next-Image-Ziel */}
        <img
          ref={bildRef}
          src={node.attrs.src}
          alt={node.attrs.alt ?? ""}
          data-cid={node.attrs.cid}
          width={node.attrs.width ?? undefined}
          height={node.attrs.height ?? undefined}
          draggable
          className={"block w-full rounded " + (selected ? "outline outline-2 outline-offset-2 outline-marke-gruen" : "")}
        />
        {selected &&
          Object.keys(POSITION).map((ecke) => (
            <span
              key={ecke}
              onPointerDown={ziehenStarten(ecke)}
              className={`absolute h-3 w-3 rounded-full border-2 border-white bg-marke-gruen shadow ${POSITION[ecke]}`}
            />
          ))}
      </div>
    </NodeViewWrapper>
  )
}
