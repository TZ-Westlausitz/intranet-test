/**
 * "ERSTELLER" ist kein echter Datenbankwert (die erstellende Person steht
 * nicht in TerminTeilnehmer, siehe Model Termin) — sondern eine rein
 * visuelle Kennzeichnung dafür, dass diese Person eingeladen hat statt
 * eingeladen wurde. Kein Zu-/Absagen-Status, deshalb ein eigener Wert
 * statt z. B. "ZUGESAGT".
 */
export type TerminTeilnehmerAnzeige = {
  personId: string
  name: string
  status: "ERSTELLER" | "OFFEN" | "ZUGESAGT" | "ABGESAGT"
}

export type TerminAnhangAnzeige = {
  id: string
  dateiname: string
  groesseBytes: number
  mimetyp: string
}

export type TerminKommentarAnzeige = {
  id: string
  autorName: string
  text: string
  erstelltAmAnzeige: string
  anhaenge: TerminAnhangAnzeige[]
}

/**
 * Fertig aufbereitete Termin-Anzeige — geteilt zwischen Kalenderblatt
 * (TerminDot), Listenübersicht (TerminUebersicht) und dem Bearbeiten-
 * Pop-Up, damit es nur eine Quelle für "was gehört zu einem Termin" gibt.
 */
export type TerminAnzeige = {
  id: string
  titel: string
  /** Sanitiertes HTML aus dem Rich-Text-Editor, siehe richTextSanitisieren. */
  beschreibung: string | null
  /** Reiner Text ohne Formatierung — für die kompakte Listenzeile (TerminUebersicht). */
  beschreibungVorschau: string | null
  ort: string | null
  farbe: string
  ganztaegig: boolean
  /** Für die Formularfelder bei nicht-ganztägig. */
  datum: string
  von: string
  bis: string
  /** Für die Formularfelder bei ganztägig (mehrtägig möglich). */
  vonDatum: string
  bisDatum: string
  zeitraumAnzeige: string
  datumAnzeige: string
  istErsteller: boolean
  /** Teil einer wiederkehrenden Serie — siehe Kommentar am Model Termin. */
  serieId: string | null
  teilnehmer: TerminTeilnehmerAnzeige[]
  /** null = die anzeigende Person ist nicht eingeladen (meist: sie ist die erstellende Person). */
  eigenerTeilnahmeStatus: "OFFEN" | "ZUGESAGT" | "ABGESAGT" | null
  erinnerungenMinuten: number[]
  anhaenge: TerminAnhangAnzeige[]
  kommentareErlaubt: boolean
  kommentare: TerminKommentarAnzeige[]
}
