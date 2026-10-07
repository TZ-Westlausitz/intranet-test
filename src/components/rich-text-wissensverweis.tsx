"use client"

import { mergeAttributes } from "@tiptap/core"
import { PluginKey } from "@tiptap/pm/state"
import Mention from "@tiptap/extension-mention"

import { eintraegeFiltern, vorschlagslisteRendern, type ErwaehnungsEintrag } from "@/components/rich-text-mention"

/**
 * Ein Eintrag der "#"-Auswahl: `id` ist der Zielpfad selbst (z. B.
 * "/wissen/<ordnerId>?artikel=<artikelId>"), `name` der Titel/Ordnername,
 * `hinweis` die Zeile darunter ("Artikel · Ordner").
 */
export type WissenVerweis = { id: string; name: string; hinweis: string }

/**
 * #Wissensverweis im Editor — verlinkt auf einen Wissensartikel, Ordner oder
 * Unterordner. Gleiches Muster wie Erwaehnung (@Person), nur mit eigenem
 * Knotennamen und eigenem Plugin-Schlüssel, damit beide Auswahllisten im
 * selben Editor nebeneinander laufen.
 *
 * Gespeichert wird ein ganz normaler Link:
 * `<a href="/wissen/..." data-wissen-verweis="1">#Titel</a>`. Der Sanitizer
 * (src/lib/rich-text.ts) lässt `data-wissen-verweis` nur durch, wenn der href
 * ein echter Wissens-Pfad ist — so kann ein Verweis nicht auf eine fremde
 * Adresse zeigen. Beim erneuten Bearbeiten erkennt `parseHTML` den Link wieder
 * als Verweis-Knoten.
 *
 * Die Auswahl zeigt nur, was die erstellende Person selbst sehen darf. Ob die
 * Empfänger der Info den Artikel ebenfalls sehen dürfen, wird nicht geprüft —
 * wer ihn nicht sehen darf, bekommt beim Klick "nicht mehr verfügbar".
 */
export function Wissensverweis(eintraege: WissenVerweis[]) {
  return Mention.extend({
    name: "wissensverweis",
    addAttributes() {
      return {
        id: {
          default: null,
          parseHTML: (element) => element.getAttribute("href"),
          renderHTML: () => ({}),
        },
        label: {
          default: null,
          parseHTML: (element) => element.textContent?.replace(/^#/, "") ?? null,
          renderHTML: () => ({}),
        },
      }
    },
    parseHTML() {
      // priority: siehe Erwaehnung — sonst gewinnt die allgemeine Link-Regel.
      return [{ tag: "a[data-wissen-verweis]", priority: 1000 }]
    },
    renderHTML({ node, HTMLAttributes }) {
      return [
        "a",
        mergeAttributes(HTMLAttributes, { href: node.attrs.id, "data-wissen-verweis": "1" }),
        `#${node.attrs.label ?? ""}`,
      ]
    },
    renderText({ node }) {
      return `#${node.attrs.label ?? ""}`
    },
  }).configure({
    suggestion: {
      char: "#",
      pluginKey: new PluginKey("wissensverweisVorschlag"),
      items: ({ query }: { query: string }): ErwaehnungsEintrag[] =>
        eintraegeFiltern(eintraege, query).map((e) => ({ id: e.id, label: e.name, hinweis: e.hinweis })),
      render: vorschlagslisteRendern,
    },
  })
}
