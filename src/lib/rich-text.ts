import sanitizeHtml from "sanitize-html"

/**
 * Bereits aufgelöste Inline-Bild-URLs, die dieser Sanitizer als echten
 * `src` akzeptiert — eine pro Baustein, der `bilderErlaubt` nutzt (siehe
 * RichTextEditor). Ohne einen Eintrag hier verliert ein Bild seinen `src`
 * bei jedem erneuten Speichern (nicht nur beim ersten), weil das dann
 * schon aufgelöste `src` hier fälschlich als unbekannt/unsicher gilt und
 * herausgefiltert wird (Rückmeldung 2026-09-10: Formular-Bild in einer
 * Tabelle verschwand nach einer weiteren Bearbeitung der Vorlage).
 */
const GUELTIGE_BILD_SRC_MUSTER = [
  /^\/api\/infos\/[a-zA-Z0-9]+\/anhaenge\/[a-zA-Z0-9]+$/,
  /^\/api\/formulare\/vorlagen\/[a-zA-Z0-9]+\/bilder\/[a-zA-Z0-9]+$/,
]

/** Lässt auf "td"/"th" nur "vertical-align: top|middle|bottom" als style durch — siehe RichTextTabelle. */
function zellAusrichtungTransform(tagName: string, attribs: sanitizeHtml.Attributes) {
  const gueltig = typeof attribs.style === "string" && /^vertical-align:\s*(top|middle|bottom);?$/.test(attribs.style.trim())
  if (gueltig) return { tagName, attribs }
  const rest = { ...attribs }
  delete rest.style
  return { tagName, attribs: rest }
}

/**
 * Saniert HTML aus dem Rich-Text-Editor (RichTextEditor) vor dem
 * Speichern — unabhängig vom Baustein wiederverwendbar (Termine, später
 * News-Beiträge, Aufgaben, Formulare). Erlaubt nur die Formatierungen, die
 * der Editor selbst anbietet; alles andere (z. B. eingefügtes <script>
 * oder <img onerror=...> aus einem Copy-Paste) fliegt raus. Das ist die
 * eigentliche Sicherheitsgrenze — der Editor im Browser ist nur die
 * Eingabehilfe, da rendern wir später mit `dangerouslySetInnerHTML`.
 */
export function richTextSanitisieren(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "strong", "em", "u", "s", "ul", "ol", "li", "a", "img", "table", "tbody", "tr", "td", "th"],
    allowedAttributes: {
      // Zellzusammenführung + vertikale Ausrichtung, die Tiptaps
      // Table-Erweiterung selbst setzen kann (siehe RichTextEditor,
      // tabelleErlaubt/RichTextTabelle) — kein "colwidth", da die
      // Spaltenbreite fest über CSS läuft (resizable: false); "style" ist
      // NUR für "vertical-align" erlaubt (siehe transformTags.td/th unten).
      td: ["colspan", "rowspan", "style"],
      th: ["colspan", "rowspan", "style"],
      // "data-mention-id" NUR für @Erwähnungen (siehe RichTextErwaehnung) —
      // transformTags.a unten prüft, dass es zum tatsächlichen
      // Benutzernamen-Zeichensatz passt UND exakt zum sichtbaren href, ein
      // manipuliertes data-mention-id kann also nicht auf eine andere
      // Person zeigen als der Link selbst.
      a: ["href", "target", "rel", "data-mention-id"],
      // "src" ist grundsätzlich erlaubt, aber nur mit einem gültigen Wert
      // (siehe GUELTIGE_BILD_SRC_MUSTER/transformTags.img unten) — für
      // frisch eingefügte, noch nicht gespeicherte Bilder liefert der
      // Editor dafür nur eine clientseitige blob:-URL (siehe
      // RichTextEditor, bilderErlaubt), die dort herausgefiltert wird; die
      // erstellende/bearbeitende Server Action setzt den echten src selbst,
      // nachdem die Datei gespeichert ist (siehe infoErstellen/
      // vorlageAktualisieren). Größe läuft über die echten width/height-
      // Attribute; "style" ist NUR für die
      // Bildausrichtung erlaubt (siehe RichTextBild/transformTags.img
      // unten) — nur eine von drei bekannten margin-Kombinationen kommt
      // durch, kein beliebiges CSS.
      img: ["data-cid", "width", "height", "src", "style"],
      // "style" auf Absätzen NUR für die Textausrichtung (siehe
      // RichTextEditor, TextAlign-Erweiterung) — der transformTags.p-
      // Filter unten lässt ausschließlich einen der vier bekannten
      // text-align-Werte durch, kein beliebiges CSS.
      p: ["style"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      // Jeder Link bekommt weiterhin target/rel wie bisher (vorher per
      // sanitizeHtml.simpleTransform, jetzt hier mit übernommen, da eine
      // zweite Prüfung für data-mention-id dazukommt) — ist
      // "data-mention-id" gesetzt, muss es zum echten Benutzername-
      // Zeichensatz passen (Kleinbuchstaben/Ziffern/".", "@", "-" — siehe
      // nameNormalisieren in src/lib/admin/personen-aktionen.ts) UND href
      // muss exakt "/kontakte/<data-mention-id>" sein — sonst wird
      // data-mention-id verworfen. Verhindert, dass eine @Erwähnung durch
      // Copy-Paste/Manipulation auf eine andere Person zeigt als sichtbar,
      // oder an einen beliebigen externen Link drangehängt wird.
      a: (tagName, attribs) => {
        const rest: sanitizeHtml.Attributes = { ...attribs, target: "_blank", rel: "noopener noreferrer" }
        const mentionId = rest["data-mention-id"]
        if (typeof mentionId === "string") {
          const gueltig = /^[a-z0-9.@-]+$/.test(mentionId) && rest.href === `/kontakte/${mentionId}`
          if (!gueltig) delete rest["data-mention-id"]
        }
        return { tagName, attribs: rest }
      },
      // Lässt NUR bereits aufgelöste, eigene Anhang-URLs durch (siehe
      // GUELTIGE_BILD_SRC_MUSTER oben) — jeder andere src-Wert
      // (insbesondere die blob:-URL eines frisch eingefügten, noch nicht
      // aufgelösten Bildes) wird entfernt.
      img: (tagName, attribs) => {
        const rest = { ...attribs }
        const srcGueltig = typeof rest.src === "string" && GUELTIGE_BILD_SRC_MUSTER.some((muster) => muster.test(rest.src as string))
        if (!srcGueltig) delete rest.src
        // Die drei einzigen Werte, die RichTextBild für die Ausrichtung
        // erzeugt (links = kein style, mittig, rechts) — alles andere fliegt raus.
        const styleGueltig =
          typeof rest.style === "string" &&
          /^display:\s*block;\s*margin-left:\s*(auto|0);\s*margin-right:\s*(auto|0);?$/.test(rest.style.trim())
        if (!styleGueltig) delete rest.style
        return { tagName, attribs: rest }
      },
      // Nur exakt "text-align: left|center|right|justify" durchlassen —
      // jeder andere style-Wert (auch mit Zusätzen dahinter) fliegt raus.
      p: (tagName, attribs) => {
        const gueltig = typeof attribs.style === "string" && /^text-align:\s*(left|center|right|justify);?$/.test(attribs.style.trim())
        if (gueltig) return { tagName, attribs }
        const rest = { ...attribs }
        delete rest.style
        return { tagName, attribs: rest }
      },
      // Nur exakt "vertical-align: top|middle|bottom" durchlassen (siehe
      // RichTextTabelle) — jeder andere style-Wert fliegt raus. "top" wird
      // vom Editor ohnehin nie als style geschrieben (Standardwert, siehe
      // RichTextTabelle), die Prüfung erlaubt es trotzdem, falls jemand
      // per Copy-Paste HTML mit explizitem "vertical-align: top" einfügt.
      td: zellAusrichtungTransform,
      th: zellAusrichtungTransform,
    },
  }).trim()
}

/** Nur der Text ohne Formatierung — für Vorschauzeilen, Benachrichtigungstexte, title-Attribute. */
export function richTextZuText(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim()
}
