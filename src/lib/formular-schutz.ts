"use client"

/**
 * Verbindungsstück zwischen `FormularAenderungenSchutz` (kennt den
 * "ungespeicherte Änderungen"-Zustand EINES Formulars) und `ZurueckButton`
 * (navigiert von einer anderen Stelle der Seite aus weg, ohne selbst zu
 * wissen, ob irgendein Formular auf der Seite gerade geändert ist).
 *
 * Mehrere Formulare können gleichzeitig eingebunden sein (z. B. ein
 * Formular pro Zeile in einer Liste) — deshalb eine ganze Menge
 * angemeldeter Prüfer statt eines einzelnen geteilten Ja/Nein-Zustands.
 * `verlassenMitBestaetigung` fragt jeden Prüfer einzeln, ob SEIN Formular
 * gerade geändert ist, und zeigt die Bestätigung des ERSTEN gefundenen.
 *
 * Bewusst ein einfaches Modul mit gemeinsamem Zustand statt eines
 * React-Context-Providers, den jede einzelne Formular-Seite zusätzlich
 * einbinden müsste (Rückmeldung 2026-09-28: "auch generell" — soll ohne
 * Verdrahtung pro Seite funktionieren).
 */

type FormularPruefer = {
  istSchmutzig: () => boolean
  dialogOeffnen: (weiterNavigieren: () => void) => void
}

const angemeldetePruefer = new Set<FormularPruefer>()

/** Von FormularAenderungenSchutz beim Mounten/Unmounten registriert. */
export function formularPrueferRegistrieren(pruefer: FormularPruefer): () => void {
  angemeldetePruefer.add(pruefer)
  return () => angemeldetePruefer.delete(pruefer)
}

/**
 * Von ZurueckButton (und ähnlichen Stellen ohne eigenen Link) aufgerufen:
 * Ist irgendein angemeldetes Formular gerade geändert, zeigt dessen
 * Bestätigung und navigiert erst danach weiter. Sonst navigiert sie sofort.
 */
export function verlassenMitBestaetigung(weiterNavigieren: () => void) {
  for (const pruefer of angemeldetePruefer) {
    if (pruefer.istSchmutzig()) {
      pruefer.dialogOeffnen(weiterNavigieren)
      return
    }
  }
  weiterNavigieren()
}
