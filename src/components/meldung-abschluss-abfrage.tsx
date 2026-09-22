import type { meldungAbschlussBestaetigen } from "@/lib/kontaktstelle/aktionen"

/**
 * Rückfrage an die meldende Person, nachdem die Kontaktstelle die Meldung
 * abgeschlossen hat (Rückmeldung 2026-09-22) — nur für sie sichtbar (siehe
 * Aufrufer, `meldungWartetAufBestaetigung`), nur einmal beantwortbar.
 * Zwei benannte Submit-Buttons statt Checkbox/Select: ein Klick sendet
 * sofort das jeweilige `antwort`-Feld mit ab, kein Zwischenschritt nötig.
 * "Ja" archiviert dauerhaft (Chat + Status danach für immer gesperrt),
 * "Nein" setzt den Status zurück auf "In Bearbeitung" und der Chat bleibt
 * nutzbar (siehe meldungAbschlussBestaetigen).
 */
export function MeldungAbschlussAbfrage({
  meldungId,
  aktion,
}: {
  meldungId: string
  aktion: typeof meldungAbschlussBestaetigen
}) {
  return (
    <div className="mt-6 rounded-xl border border-marke-orange/40 bg-marke-orange/10 p-4">
      <p className="text-sm font-medium text-ueberschrift">Konnte dein Anliegen geklärt werden?</p>
      <form action={aktion.bind(null, meldungId)} className="mt-3 flex gap-2">
        <button
          type="submit"
          name="antwort"
          value="ja"
          className="h-9 rounded-lg bg-marke-gruen px-4 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
        >
          Ja
        </button>
        <button
          type="submit"
          name="antwort"
          value="nein"
          className="h-9 rounded-lg border border-flaeche-300 px-4 text-sm font-medium text-primaer transition hover:bg-flaeche-100"
        >
          Nein
        </button>
      </form>
    </div>
  )
}
