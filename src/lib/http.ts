/**
 * Baut den Wert für den `Content-Disposition`-Header aus einem Dateinamen.
 *
 * HTTP-Header dürfen laut Fetch-Spezifikation nur Latin-1-Zeichen (Code
 * 0–255) enthalten — ein Dateiname mit Emoji oder anderen Zeichen darüber
 * hinaus (z. B. von einer Formular-Vorlage mit Emoji im Titel, siehe
 * `formularEinreichen`) wirft beim Ausliefern sonst einen TypeError und die
 * ganze Anfrage schlägt fehl (Rückmeldung 2026-09-09: Download von
 * "Krankschreibung 🤒.pdf" nach dem Absenden). `filename` ist deshalb ein
 * ASCII-sicherer Ersatz, `filename*` (RFC 5987) liefert modernen Browsern
 * zusätzlich den echten, vollständigen Namen inklusive Emoji/Umlaute.
 */
export function contentDispositionHeader(dateiname: string, disposition: "inline" | "attachment" = "inline"): string {
  const ohneAnfuehrungszeichen = dateiname.replace(/"/g, "")
  //  -ÿ: druckbarer Latin-1-Bereich, alles außerhalb wird ersetzt.
  const asciiSicher = ohneAnfuehrungszeichen.replace(/[^ -ÿ]/gu, "_")
  return `${disposition}; filename="${asciiSicher}"; filename*=UTF-8''${encodeURIComponent(ohneAnfuehrungszeichen)}`
}
