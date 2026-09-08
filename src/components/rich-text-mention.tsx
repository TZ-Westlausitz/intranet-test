"use client"

import { forwardRef, useImperativeHandle, useState } from "react"
import { mergeAttributes } from "@tiptap/core"
import { ReactRenderer } from "@tiptap/react"
import Mention from "@tiptap/extension-mention"
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion"

type ErwaehnungsEintrag = { id: string; label: string }

/**
 * @Erwähnung im Editor — verlinkt auf die Kontakte-Detailseite der
 * erwähnten Person (siehe src/app/(mitarbeiter)/kontakte/[personId]).
 * Erweiterung von `@tiptap/extension-mention` (offizielle Tiptap-3-
 * Erweiterung, wie schon Bild/TextAlign): `.extend()` überschreibt
 * `renderHTML`/`parseHTML`, damit die Erwähnung als
 * `<a href="/kontakte/<id>" data-mention-id="<id>">@Name</a>` serialisiert
 * statt Mentions Standard-`<span data-type="mention">` — dadurch ist eine
 * Erwähnung ein ganz normaler, sanitierbarer Link (siehe transformTags.a
 * in src/lib/rich-text.ts), kein Sonderfall beim Anzeigen nötig, und beim
 * erneuten Öffnen zum Bearbeiten erkennt `parseHTML` den Link wieder als
 * Mention-Knoten statt als normalen Text-Link.
 *
 * Die Vorschlagsliste nutzt `props.mount()` — in der installierten
 * `@tiptap/suggestion`-Version eingebaut, übernimmt Platzierung an der
 * Cursor-Position, Scroll-Nachführung und Schließen bei Klick außerhalb
 * automatisch. Deshalb KEIN tippy.js und KEINE eigene floating-ui-Nutzung
 * nötig, obwohl `@tiptap/suggestion` floating-ui selbst intern verwendet.
 */
export function Erwaehnung(personen: { id: string; name: string }[]) {
  return Mention.extend({
    addAttributes() {
      return {
        id: {
          default: null,
          parseHTML: (element) => element.getAttribute("data-mention-id"),
          renderHTML: (attributes) => (attributes.id ? { "data-mention-id": attributes.id } : {}),
        },
        label: {
          default: null,
          // Kein eigenes data-Attribut für den Namen nötig — er steckt
          // schon im sichtbaren Linktext ("@Vorname Nachname").
          parseHTML: (element) => element.textContent?.replace(/^@/, "") ?? null,
          renderHTML: () => ({}),
        },
      }
    },
    parseHTML() {
      // Die "priority" hier auf der Regel selbst (nicht nur an der
      // Extension) ist entscheidend — ProseMirror sortiert Parse-Regeln
      // nach `rule.priority` (Standard 50, siehe DOMParser.schemaRules),
      // unabhängig von der Extension-Priorität. Ohne das würde Links
      // eigene a[href]-Regel (ebenfalls Standard 50, trotz
      // `priority: 1000` an der Link-EXTENSION, die dort nie auf die
      // Regel selbst durchgereicht wird) bei gleichem Rang zuerst
      // greifen und die Erwähnung beim Bearbeiten in einen normalen
      // Link ohne data-mention-id verwandeln.
      return [{ tag: "a[data-mention-id]", priority: 1000 }]
    },
    renderHTML({ node, HTMLAttributes }) {
      return ["a", mergeAttributes(HTMLAttributes, { href: `/kontakte/${node.attrs.id}` }), `@${node.attrs.label ?? node.attrs.id}`]
    },
  }).configure({
    suggestion: {
      items: ({ query }: { query: string }): ErwaehnungsEintrag[] =>
        personen
          .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 8)
          .map((p) => ({ id: p.id, label: p.name })),
      render: () => {
        let component: ReactRenderer<MentionListeHandle, SuggestionProps<ErwaehnungsEintrag, ErwaehnungsEintrag>> | null =
          null
        let beenden: (() => void) | null = null

        return {
          onStart: (props) => {
            component = new ReactRenderer(MentionListe, { props, editor: props.editor })
            beenden = props.mount(component.element)
          },
          onUpdate: (props) => {
            component?.updateProps(props)
          },
          onKeyDown: (props) => {
            if (props.event.key === "Escape") {
              beenden?.()
              return true
            }
            return component?.ref?.onKeyDown(props) ?? false
          },
          onExit: () => {
            beenden?.()
            component?.destroy()
          },
        }
      },
    },
  })
}

type MentionListeHandle = { onKeyDown: (props: SuggestionKeyDownProps) => boolean }

/**
 * Vorschlagsliste beim Tippen von "@…" — optisch angelehnt an die
 * Such-Dropdowns in PersonenAuswahl/InfoEmpfaengerAuswahl, damit sich das
 * Erwähnen vertraut anfühlt statt wie ein Fremdkörper im Editor.
 */
const MentionListe = forwardRef<MentionListeHandle, SuggestionProps<ErwaehnungsEintrag, ErwaehnungsEintrag>>(
  function MentionListe({ items, command }, ref) {
    const [ausgewaehltRoh, setAusgewaehltRoh] = useState(0)
    // An die aktuelle Trefferliste geklemmt statt per Effect zurückgesetzt
    // (die Liste ändert sich bei jedem Tastenanschlag) — vermeidet
    // "setState in einem Effect" zugunsten einer während des Renderns
    // abgeleiteten Zahl, wie von der react-hooks-Regel empfohlen.
    const ausgewaehlt = items.length === 0 ? 0 : ((ausgewaehltRoh % items.length) + items.length) % items.length

    function waehlen(index: number) {
      const eintrag = items[index]
      if (eintrag) command(eintrag)
    }

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowDown") {
          setAusgewaehltRoh(ausgewaehlt + 1)
          return true
        }
        if (event.key === "ArrowUp") {
          setAusgewaehltRoh(ausgewaehlt - 1)
          return true
        }
        if (event.key === "Enter") {
          waehlen(ausgewaehlt)
          return true
        }
        return false
      },
    }))

    if (items.length === 0) {
      return (
        <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-400 shadow-lg">
          Keine Treffer
        </div>
      )
    }

    return (
      <div className="max-h-48 overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
        {items.map((eintrag, index) => (
          <button
            key={eintrag.id}
            type="button"
            onMouseDown={(ereignis) => ereignis.preventDefault()}
            onClick={() => waehlen(index)}
            className={
              "block w-full px-3 py-2 text-left text-sm " +
              (index === ausgewaehlt ? "bg-marke-gruen/10 text-marke-grau" : "text-neutral-700 hover:bg-neutral-50")
            }
          >
            {eintrag.label}
          </button>
        ))}
      </div>
    )
  },
)
