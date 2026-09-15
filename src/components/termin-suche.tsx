/**
 * Suchleiste in der Kopfzeile von "Nächste Termine" (TerminUebersicht) —
 * durchsucht Titel, Notizen und die Namen aller Beteiligten (siehe
 * termineSuchen), nicht nur die gerade angezeigten Monate. Eine einzelne
 * Leiste statt mehrerer Filterfelder (Ort/Kategorie/Sichtbar für aus dem
 * alten "Überblick"): Kategorien und eine öffentliche Sichtbarkeit gibt
 * es in diesem Datenmodell nicht, Termine sind immer nur für Ersteller/in
 * und Eingeladene sichtbar.
 *
 * Klassisches GET-Formular statt Live-Suche beim Tippen — passt zur
 * bestehenden Monat/Jahr-Navigation auf derselben Seite (auch die läuft
 * über die URL) und bleibt robust bei schlechtem Empfang unterwegs.
 */
export function TerminSucheFeld({ suchtext }: { suchtext: string }) {
  return (
    <form action="/kalender" className="flex items-end gap-2">
      <div>
        <label htmlFor="suche" className="sr-only">
          Suche
        </label>
        <input
          id="suche"
          name="suche"
          type="search"
          defaultValue={suchtext}
          placeholder="Titel oder Teilnehmer …"
          className="h-9 w-40 rounded-lg border border-flaeche-300 px-2 text-sm sm:w-52"
        />
      </div>
      <button
        type="submit"
        className="h-9 rounded-lg bg-flaeche-100 px-3 text-sm font-medium text-primaer transition hover:bg-flaeche-200"
      >
        Suchen
      </button>
    </form>
  )
}
