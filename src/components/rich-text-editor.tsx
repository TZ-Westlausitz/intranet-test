"use client"

import { useEffect, useRef, useState } from "react"
import {
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Columns2,
  Image as ImageIcon,
  Link2,
} from "lucide-react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import TextAlign from "@tiptap/extension-text-align"
import { Table } from "@tiptap/extension-table"
import { TableRow } from "@tiptap/extension-table-row"
import { Bild } from "@/components/rich-text-bild"
import { Erwaehnung } from "@/components/rich-text-mention"
import { TableCell, TableHeader, type VertikaleZellAusrichtung } from "@/components/rich-text-tabelle"

/**
 * Formatierbares Freitextfeld — bewusst generisch gehalten (nicht
 * "TerminNotizen"), weil dieselbe Komponente auch für künftige Bausteine
 * gebraucht wird (News-Beiträge, Aufgaben, Formulare). Tiptap statt einem
 * selbstgebauten contentEditable, weil es die naheliegende, viel benutzte
 * Lösung dafür ist (siehe CLAUDE.md: "naheliegende, langweilige Lösungen
 * schlagen clevere").
 *
 * Tiptap verwaltet den Inhalt im DOM, nicht als React-State — deshalb der
 * Umweg über `onUpdate` in ein eigenes `html`-State, das dann in ein
 * verstecktes `<input>` gespiegelt wird. Ein ganz normales
 * `<form action={serverAction}>` sammelt es damit wie jedes andere Feld
 * ein, ohne dass die Server Action irgendetwas von Tiptap wissen muss.
 *
 * Das gespeicherte HTML wird serverseitig IMMER nochmal saniert
 * (sanitize-html, siehe terminEingabenLesen) — dieser Editor ist keine
 * Sicherheitsgrenze, nur die Eingabehilfe.
 *
 * `bilderErlaubt` (Default aus): schaltet den Bild-Knopf frei — NUR
 * setzen, wenn die aufrufende Server Action eingefügte Bilder auch
 * wirklich auflöst (siehe infoErstellen), sonst bleibt im gespeicherten
 * HTML ein `<img data-cid="...">` ohne `src` übrig. Termin/Aufgabe/
 * Auftrag lassen den Prop bewusst weg.
 *
 * `mentionPersonen` (Default aus): schaltet @Erwähnungen frei — Liste der
 * erwähnbaren Personen kommt als Prop rein (siehe Erwaehnung), kein
 * eigener Query in dieser Komponente.
 *
 * `tabelleErlaubt` (Default aus): schaltet einen Knopf frei, der eine
 * zweispaltige Tabelle einfügt ("Zeile in zwei Spalten teilen") — Tiptaps
 * eigene Table-Erweiterung, nur ohne die Zeilen/Spalten-Hinzufügen-UI, weil
 * hier bewusst nur der einfache Zwei-Spalten-Fall gebraucht wird.
 *
 * `onChange` (optional): für Aufrufer, die den aktuellen HTML-Stand auch
 * außerhalb dieser Komponente brauchen (z. B. eine Live-Vorschau) — ruft
 * bei jeder Änderung mit dem neuen HTML auf, zusätzlich zum versteckten
 * Formularfeld.
 */
export function RichTextEditor({
  name,
  defaultValue,
  bilderErlaubt = false,
  tabelleErlaubt = false,
  mentionPersonen,
  onChange,
}: {
  name: string
  defaultValue: string
  bilderErlaubt?: boolean
  tabelleErlaubt?: boolean
  mentionPersonen?: { id: string; name: string }[]
  onChange?: (html: string) => void
}) {
  const [html, setHtml] = useState(defaultValue)
  const [bilder, setBilder] = useState<{ cid: string; datei: File }[]>([])
  const bildAuswahlRef = useRef<HTMLInputElement>(null)
  const bildSammelRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    // StarterKit bringt Underline und Link seit Tiptap 3 schon mit —
    // eigene zusätzliche Extensions dafür würden sich mit denen
    // überschneiden (Konsolenwarnung "Duplicate extension names").
    extensions: [
      StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
      TextAlign.configure({ types: ["paragraph"] }),
      ...(bilderErlaubt ? [Bild] : []),
      ...(mentionPersonen ? [Erwaehnung(mentionPersonen)] : []),
      ...(tabelleErlaubt ? [Table.configure({ resizable: false }), TableRow, TableHeader, TableCell] : []),
    ],
    content: defaultValue,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const neuesHtml = editor.getHTML()
      setHtml(neuesHtml)
      onChange?.(neuesHtml)
    },
    editorProps: {
      attributes: {
        class:
          "min-h-24 px-3 py-2 text-sm focus:outline-none [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-marke-gruen-dunkel [&_a]:underline [&_img]:max-w-full [&_table]:w-full [&_table]:table-fixed [&_table]:border-collapse [&_td]:border [&_td]:border-flaeche-300 [&_td]:p-2 [&_td]:align-top [&_th]:border [&_th]:border-flaeche-300 [&_th]:p-2 [&_th]:align-top",
      },
    },
  })

  // Die Bild-Dateien selbst reisen NICHT im HTML mit (das enthält nur
  // eine flüchtige blob:-URL fürs Live-Preview) — stattdessen wird bei
  // jeder Änderung ein eigenes, verstecktes File-Input per DataTransfer
  // neu befüllt, damit das umgebende <form> sie ganz normal als
  // "inlineBilder" mitschickt (siehe infoErstellen).
  useEffect(() => {
    if (!bildSammelRef.current) return
    const datenTransfer = new DataTransfer()
    for (const { datei } of bilder) datenTransfer.items.add(datei)
    bildSammelRef.current.files = datenTransfer.files
  }, [bilder])

  // Verfügbare Breite an der Einfügestelle — innerhalb einer Tabellenzelle
  // (siehe RichTextEditor, tabelleErlaubt) deren Innenbreite (abzüglich des
  // Zell-Innenabstands `[&_td]:p-2` unten), sonst die Breite des
  // Editor-Inhalts selbst. Wird SOFORT beim Auswählen gemessen (nicht erst
  // im onload der Bildvorschau), solange Cursor/Auswahl noch an der
  // Einfügestelle stehen.
  function verfuegbareBreiteAmCursor(): number {
    if (!editor) return Infinity
    try {
      const { node } = editor.view.domAtPos(editor.state.selection.from)
      const startElement = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement)
      const zelle = startElement?.closest("td, th") as HTMLElement | null
      if (zelle) {
        const zellInnenabstand = 16 // [&_td]/[&_th]:p-2, siehe editorProps.attributes.class unten
        return Math.max(60, zelle.getBoundingClientRect().width - zellInnenabstand)
      }
      return editor.view.dom.getBoundingClientRect().width
    } catch {
      return editor.view.dom.getBoundingClientRect().width
    }
  }

  function bildAusgewaehlt(ereignis: React.ChangeEvent<HTMLInputElement>) {
    const datei = ereignis.target.files?.[0]
    ereignis.target.value = ""
    if (!datei || !editor) return

    const cid = crypto.randomUUID()
    const url = URL.createObjectURL(datei)
    const verfuegbareBreite = verfuegbareBreiteAmCursor()
    const bildElement = new window.Image()
    bildElement.onload = () => {
      // Auf die verfügbare Breite herunterskaliert (nie hochskaliert) —
      // sonst würde ein in eine Tabellenspalte eingefügtes Bild die Zelle
      // sprengen (fixe Pixelbreite am Wrapper-Div, siehe RichTextBild).
      const breite = Math.round(Math.min(bildElement.naturalWidth, verfuegbareBreite))
      const hoehe = Math.round(breite * (bildElement.naturalHeight / bildElement.naturalWidth))
      editor
        .chain()
        .focus()
        .insertContent({
          type: "image",
          attrs: { src: url, cid, width: breite, height: hoehe },
        })
        .run()
    }
    bildElement.src = url

    setBilder((bisher) => [...bisher, { cid, datei }])
  }

  // Dieselben L/Z/R-Knöpfe gelten auch für ein ausgewähltes Bild — ein
  // Bild hat aber keinen Text zum Ausrichten (siehe Kommentar in
  // RichTextBild), deshalb geht es dort auf ein eigenes Attribut statt auf
  // die generische TextAlign-Erweiterung (die nur für Absätze konfiguriert
  // ist, siehe extensions unten).
  function ausrichtungSetzen(wert: "left" | "center" | "right") {
    if (!editor) return
    if (editor.isActive("image")) {
      editor.chain().focus().updateAttributes("image", { ausrichtung: wert }).run()
    } else {
      editor.chain().focus().setTextAlign(wert).run()
    }
  }

  function ausrichtungAktiv(wert: "left" | "center" | "right"): boolean {
    if (!editor) return false
    return editor.isActive("image") ? editor.isActive("image", { ausrichtung: wert }) : editor.isActive({ textAlign: wert })
  }

  // Gilt für die Tabellenzelle, in der der Cursor gerade steht (siehe
  // RichTextEditor, tabelleErlaubt) — eine Kopf- ("th") oder normale Zelle
  // ("td"), je nachdem welche der beiden gerade aktiv ist. Außerhalb einer
  // Zelle ohne Wirkung (updateAttributes auf einen nicht aktiven Knotentyp
  // ist ein No-op), genau wie die anderen Werkzeugleisten-Knöpfe außerhalb
  // ihres Anwendungsfalls.
  function zellAusrichtungSetzen(wert: VertikaleZellAusrichtung) {
    if (!editor) return
    const typ = editor.isActive("tableHeader") ? "tableHeader" : "tableCell"
    editor.chain().focus().updateAttributes(typ, { verticalAlign: wert }).run()
  }

  function zellAusrichtungAktiv(wert: VertikaleZellAusrichtung): boolean {
    if (!editor) return false
    return (
      editor.isActive("tableCell", { verticalAlign: wert }) || editor.isActive("tableHeader", { verticalAlign: wert })
    )
  }

  return (
    <div className="rounded-lg border border-flaeche-300">
      <div className="flex flex-wrap gap-0.5 border-b border-rand px-1.5 py-1">
        <WerkzeugKnopf label="Fett" aktiv={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()}>
          <span className="font-bold">F</span>
        </WerkzeugKnopf>
        <WerkzeugKnopf label="Kursiv" aktiv={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()}>
          <span className="italic">K</span>
        </WerkzeugKnopf>
        <WerkzeugKnopf label="Unterstrichen" aktiv={editor?.isActive("underline")} onClick={() => editor?.chain().focus().toggleUnderline().run()}>
          <span className="underline">U</span>
        </WerkzeugKnopf>
        <span className="mx-1 my-1 w-px bg-flaeche-200" />
        <WerkzeugKnopf label="Aufzählung" aktiv={editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
          •&nbsp;–
        </WerkzeugKnopf>
        <WerkzeugKnopf label="Nummerierte Liste" aktiv={editor?.isActive("orderedList")} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
          1.
        </WerkzeugKnopf>
        <span className="mx-1 my-1 w-px bg-flaeche-200" />
        <WerkzeugKnopf label="Linksbündig" aktiv={ausrichtungAktiv("left")} onClick={() => ausrichtungSetzen("left")}>
          L
        </WerkzeugKnopf>
        <WerkzeugKnopf label="Zentriert" aktiv={ausrichtungAktiv("center")} onClick={() => ausrichtungSetzen("center")}>
          Z
        </WerkzeugKnopf>
        <WerkzeugKnopf label="Rechtsbündig" aktiv={ausrichtungAktiv("right")} onClick={() => ausrichtungSetzen("right")}>
          R
        </WerkzeugKnopf>
        <span className="mx-1 my-1 w-px bg-flaeche-200" />
        <WerkzeugKnopf
          label="Link"
          aktiv={editor?.isActive("link")}
          onClick={() => {
            if (!editor) return
            if (editor.isActive("link")) {
              editor.chain().focus().unsetLink().run()
              return
            }
            const url = window.prompt("Link-Adresse:")
            if (url) editor.chain().focus().setLink({ href: url }).run()
          }}
        >
          <Link2 className="h-4 w-4" />
        </WerkzeugKnopf>
        {bilderErlaubt && (
          <>
            <span className="mx-1 my-1 w-px bg-flaeche-200" />
            <WerkzeugKnopf label="Bild einfügen" onClick={() => bildAuswahlRef.current?.click()}>
              <ImageIcon className="h-4 w-4" />
            </WerkzeugKnopf>
            <input
              ref={bildAuswahlRef}
              type="file"
              accept="image/*"
              onChange={bildAusgewaehlt}
              className="hidden"
            />
          </>
        )}
        {tabelleErlaubt && (
          <>
            <span className="mx-1 my-1 w-px bg-flaeche-200" />
            <WerkzeugKnopf
              label="Zeile in zwei Spalten teilen"
              onClick={() => editor?.chain().focus().insertTable({ rows: 1, cols: 2, withHeaderRow: false }).run()}
            >
              <Columns2 className="h-4 w-4" />
            </WerkzeugKnopf>
            <span className="mx-1 my-1 w-px bg-flaeche-200" />
            <WerkzeugKnopf label="Zellinhalt oben ausrichten" aktiv={zellAusrichtungAktiv("top")} onClick={() => zellAusrichtungSetzen("top")}>
              <AlignVerticalJustifyStart className="h-4 w-4" />
            </WerkzeugKnopf>
            <WerkzeugKnopf label="Zellinhalt mittig ausrichten" aktiv={zellAusrichtungAktiv("middle")} onClick={() => zellAusrichtungSetzen("middle")}>
              <AlignVerticalJustifyCenter className="h-4 w-4" />
            </WerkzeugKnopf>
            <WerkzeugKnopf label="Zellinhalt unten ausrichten" aktiv={zellAusrichtungAktiv("bottom")} onClick={() => zellAusrichtungSetzen("bottom")}>
              <AlignVerticalJustifyEnd className="h-4 w-4" />
            </WerkzeugKnopf>
          </>
        )}
      </div>

      <EditorContent editor={editor} />
      <input type="hidden" name={name} value={html} readOnly />
      {bilderErlaubt && (
        <>
          <input ref={bildSammelRef} type="file" name="inlineBilder" multiple className="hidden" />
          <input type="hidden" name="inlineBilderCids" value={bilder.map((b) => b.cid).join(",")} readOnly />
        </>
      )}
    </div>
  )
}

function WerkzeugKnopf({
  label,
  aktiv,
  onClick,
  children,
}: {
  label: string
  aktiv?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={aktiv}
      // Verhindert, dass der Browser beim Klick auf den Knopf die
      // Textmarkierung/Cursorposition im Editor verwirft, BEVOR der
      // onClick-Handler (der genau darauf aufbaut) überhaupt läuft —
      // ohne das wirkte "Aufzählung" o. Ä. auf die falsche Stelle.
      onMouseDown={(ereignis) => ereignis.preventDefault()}
      onClick={onClick}
      className={
        "flex h-7 w-7 items-center justify-center rounded text-sm transition " +
        (aktiv ? "bg-marke-gruen/25 text-ueberschrift" : "text-sekundaer hover:bg-flaeche-100")
      }
    >
      {children}
    </button>
  )
}
