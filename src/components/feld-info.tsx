/**
 * Kleines Info-Zeichen neben einem Feld-Label — zeigt beim Hovern eine
 * kurze Erklärung an, statt eines Beispieltexts direkt im Feld. Ein
 * Beispieltext im Feld selbst wirkt im echten Betrieb schnell zu
 * spezifisch (bezieht sich auf einen konkreten, erfundenen Fall) und
 * verschwindet außerdem, sobald jemand zu tippen anfängt — der Hinweis
 * hier bleibt dauerhaft erreichbar. Nutzt den nativen Browser-Tooltip über
 * `title`, keine eigene Tooltip-Logik nötig (passend zum Rest des
 * Projekts: einfache Unicode-Zeichen statt einer Icon-Bibliothek).
 */
export function FeldInfo({ text }: { text: string }) {
  return (
    <span title={text} aria-label={text} className="cursor-help text-neutral-400">
      ⓘ
    </span>
  )
}
