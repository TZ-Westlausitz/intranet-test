import sanitizeHtml from "sanitize-html"

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
    allowedTags: ["p", "br", "strong", "em", "u", "s", "ul", "ol", "li", "a"],
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }),
    },
  }).trim()
}

/** Nur der Text ohne Formatierung — für Vorschauzeilen, Benachrichtigungstexte, title-Attribute. */
export function richTextZuText(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim()
}
