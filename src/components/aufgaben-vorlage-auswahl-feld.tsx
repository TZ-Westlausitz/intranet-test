"use client"

/**
 * "Aus Vorlage starten" für das INLINE To-do-Formular auf /aufgaben
 * (anders als bei AuftragErstellenDialog kein Pop-up, deshalb kein
 * Client-State-Remount-Trick direkt hier) — ein simples GET-Formular, das
 * nur den Suchparameter `?vorlage=` setzt (Muster `?ansicht=` auf
 * derselben Seite) und bei Auswahl sofort absendet. Die Seite (Server
 * Component) liest den Parameter, löst die Vorlage auf und gibt sie als
 * `standardwerte` + `key` an AufgabeFormFelder weiter — die eigentliche
 * Vorbefüllung passiert dort server-seitig, nicht hier.
 */
export function AufgabenVorlageAuswahlFeld({
  vorlagen,
  ausgewaehlteVorlageId,
  ansicht,
}: {
  vorlagen: { id: string; titel: string }[]
  ausgewaehlteVorlageId: string
  ansicht: string
}) {
  return (
    <form method="GET">
      <label className="block text-xs font-medium text-primaer">Aus Vorlage starten (optional)</label>
      <select
        name="vorlage"
        defaultValue={ausgewaehlteVorlageId}
        onChange={(ereignis) => ereignis.currentTarget.form?.requestSubmit()}
        className="mt-1 h-9 w-full rounded-lg border border-flaeche-300 px-2 text-sm"
      >
        <option value="">Leer</option>
        {vorlagen.map((vorlage) => (
          <option key={vorlage.id} value={vorlage.id}>
            {vorlage.titel}
          </option>
        ))}
      </select>
      <input type="hidden" name="ansicht" value={ansicht} />
    </form>
  )
}
