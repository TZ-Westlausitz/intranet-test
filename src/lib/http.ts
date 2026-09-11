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

/**
 * Liefert Datei-Bytes als `Response`, mit HTTP-Range-Unterstützung (RFC
 * 7233 — `Range`-Anfrage → `206 Partial Content` mit `Content-Range`).
 * Nötig für Audio/Video in `<audio>`/`<video>`-Elementen: Safari fragt vor
 * dem Abspielen typischerweise einen Byte-Bereich an und bricht die
 * Wiedergabe ab, wenn die Antwort statt "206" nur ein gewöhnliches "200"
 * mit der kompletten Datei ist — selbst bei einer technisch einwandfreien
 * Datei (Rückmeldung 2026-09-11: Sprachnachricht in Safari aufgenommen,
 * in Safari selbst "Fehler" beim Abspielen, in Chrome fehlerfrei abspielbar
 * — das bestätigt, dass die Datei in Ordnung war und nur die Auslieferung
 * nicht Safari-tauglich war). Chrome/Firefox akzeptieren dagegen auch eine
 * vollständige "200"-Antwort ohne Range-Unterstützung anstandslos.
 */
export function dateiAntwort(request: Request, datei: Buffer, mimetyp: string, dateiname: string): Response {
  const gesamtgroesse = datei.byteLength
  const basisHeader = {
    "Content-Type": mimetyp,
    "Content-Disposition": contentDispositionHeader(dateiname),
    "Accept-Ranges": "bytes",
  }

  const rangeHeader = request.headers.get("range")
  if (!rangeHeader) {
    return new Response(new Blob([new Uint8Array(datei)]), { headers: { ...basisHeader, "Content-Length": String(gesamtgroesse) } })
  }

  // Nur einzelne Bereiche ("bytes=START-ENDE", je eine Seite optional) —
  // reicht für <audio>/<video>, die in der Praxis keine Mehrfachbereiche anfragen.
  const treffer = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader)
  if (!treffer || (!treffer[1] && !treffer[2])) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${gesamtgroesse}` } })
  }

  const start = treffer[1] ? Number(treffer[1]) : Math.max(0, gesamtgroesse - Number(treffer[2]))
  const ende = Math.min(treffer[1] && treffer[2] ? Number(treffer[2]) : gesamtgroesse - 1, gesamtgroesse - 1)
  if (start > ende || start >= gesamtgroesse) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${gesamtgroesse}` } })
  }

  const ausschnitt = datei.subarray(start, ende + 1)
  return new Response(new Blob([new Uint8Array(ausschnitt)]), {
    status: 206,
    headers: { ...basisHeader, "Content-Range": `bytes ${start}-${ende}/${gesamtgroesse}`, "Content-Length": String(ausschnitt.byteLength) },
  })
}
