"use client"

import { useEffect, useRef, useState } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import TextAlign from "@tiptap/extension-text-align"
import { Bild } from "@/components/rich-text-bild"
import { Erwaehnung } from "@/components/rich-text-mention"

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
 */
export function RichTextEditor({
  name,
  defaultValue,
  bilderErlaubt = false,
  mentionPersonen,
}: {
  name: string
  defaultValue: string
  bilderErlaubt?: boolean
  mentionPersonen?: { id: string; name: string }[]
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
    ],
    content: defaultValue,
    immediatelyRender: false,
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          "min-h-24 px-3 py-2 text-sm focus:outline-none [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-marke-gruen-dunkel [&_a]:underline [&_img]:max-w-full",
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

  function bildAusgewaehlt(ereignis: React.ChangeEvent<HTMLInputElement>) {
    const datei = ereignis.target.files?.[0]
    ereignis.target.value = ""
    if (!datei || !editor) return

    const cid = crypto.randomUUID()
    const url = URL.createObjectURL(datei)
    const bildElement = new window.Image()
    bildElement.onload = () => {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "image",
          attrs: { src: url, cid, width: bildElement.naturalWidth, height: bildElement.naturalHeight },
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

  return (
    <div className="rounded-lg border border-neutral-300">
      <div className="flex flex-wrap gap-0.5 border-b border-neutral-200 px-1.5 py-1">
        <WerkzeugKnopf label="Fett" aktiv={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()}>
          <span className="font-bold">F</span>
        </WerkzeugKnopf>
        <WerkzeugKnopf label="Kursiv" aktiv={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()}>
          <span className="italic">K</span>
        </WerkzeugKnopf>
        <WerkzeugKnopf label="Unterstrichen" aktiv={editor?.isActive("underline")} onClick={() => editor?.chain().focus().toggleUnderline().run()}>
          <span className="underline">U</span>
        </WerkzeugKnopf>
        <span className="mx-1 my-1 w-px bg-neutral-200" />
        <WerkzeugKnopf label="Aufzählung" aktiv={editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
          •&nbsp;–
        </WerkzeugKnopf>
        <WerkzeugKnopf label="Nummerierte Liste" aktiv={editor?.isActive("orderedList")} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
          1.
        </WerkzeugKnopf>
        <span className="mx-1 my-1 w-px bg-neutral-200" />
        <WerkzeugKnopf label="Linksbündig" aktiv={ausrichtungAktiv("left")} onClick={() => ausrichtungSetzen("left")}>
          L
        </WerkzeugKnopf>
        <WerkzeugKnopf label="Zentriert" aktiv={ausrichtungAktiv("center")} onClick={() => ausrichtungSetzen("center")}>
          Z
        </WerkzeugKnopf>
        <WerkzeugKnopf label="Rechtsbündig" aktiv={ausrichtungAktiv("right")} onClick={() => ausrichtungSetzen("right")}>
          R
        </WerkzeugKnopf>
        <span className="mx-1 my-1 w-px bg-neutral-200" />
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
          🔗
        </WerkzeugKnopf>
        {bilderErlaubt && (
          <>
            <span className="mx-1 my-1 w-px bg-neutral-200" />
            <WerkzeugKnopf label="Bild einfügen" onClick={() => bildAuswahlRef.current?.click()}>
              🖼️
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
        (aktiv ? "bg-marke-gruen/25 text-marke-grau" : "text-neutral-500 hover:bg-neutral-100")
      }
    >
      {children}
    </button>
  )
}
