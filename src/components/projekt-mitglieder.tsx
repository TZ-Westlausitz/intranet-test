"use client"

import { PersonenAuswahl } from "@/components/personen-auswahl"
import { PROJEKTMITGLIED_ROLLE_NAMEN } from "@/lib/projekte-optionen"

export type ProjektmitgliedAnzeige = {
  id: string
  personId: string
  name: string
  rolle: string
}

/**
 * Mitgliederliste + "Hinzufügen"-Formular — nur für die Leitung sichtbar
 * (Prüfung liegt in den Server Actions selbst, hier nur ausgeblendet für
 * andere, siehe Regel 5: ein ausgeblendeter Knopf ist keine
 * Zugriffskontrolle). `kandidaten` sind aktive Personen, die noch KEIN
 * Mitglied sind — dieselbe PersonenAuswahl wie bei Termin-Teilnehmenden.
 *
 * Die letzte verbleibende Leitung lässt sich weder entfernen noch
 * herabstufen — die Server Actions lehnen das ohnehin ab
 * (projektMitgliedEntfernen/-RolleSetzen), aber ein normal benutzter Knopf
 * sollte das gar nicht erst versuchen können, statt mit einem ungefangenen
 * Fehler abzustürzen (anders als z. B. bei Auftrag: dort ist der
 * entsprechende Fall nur über eine manipulierte ID erreichbar, hier wäre
 * es ein Klick auf den eigenen Namen im ganz normalen Alltag).
 */
export function ProjektMitglieder({
  projektId,
  mitglieder,
  kandidaten,
  istLeitung,
  hinzufuegenAktion,
  entfernenAktion,
  rolleSetzenAktion,
}: {
  projektId: string
  mitglieder: ProjektmitgliedAnzeige[]
  kandidaten: { id: string; name: string }[]
  istLeitung: boolean
  hinzufuegenAktion: (projektId: string, formData: FormData) => void
  entfernenAktion: (projektId: string, mitgliedId: string) => void
  rolleSetzenAktion: (projektId: string, mitgliedId: string, rolle: "LEITUNG" | "MITGLIED") => void
}) {
  const anzahlLeitung = mitglieder.filter((m) => m.rolle === "LEITUNG").length

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y divide-neutral-100">
        {mitglieder.map((mitglied) => {
          const istLetzteLeitung = mitglied.rolle === "LEITUNG" && anzahlLeitung <= 1

          return (
            <li key={mitglied.id} className="flex items-center justify-between gap-2 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-800">{mitglied.name}</span>
                <span
                  className={
                    "rounded-full px-2 py-0.5 text-xs font-medium " +
                    (mitglied.rolle === "LEITUNG"
                      ? "bg-marke-gruen/15 text-marke-gruen-dunkel"
                      : "bg-neutral-100 text-neutral-500")
                  }
                >
                  {PROJEKTMITGLIED_ROLLE_NAMEN[mitglied.rolle]}
                </span>
              </div>

              {istLeitung && (
                <div className="flex shrink-0 items-center gap-1">
                  {istLetzteLeitung ? (
                    <span className="text-xs text-neutral-400" title="Ein Projekt braucht mindestens eine Leitung">
                      einzige Leitung
                    </span>
                  ) : (
                    <>
                      <form action={rolleSetzenAktion.bind(null, projektId, mitglied.id, mitglied.rolle === "LEITUNG" ? "MITGLIED" : "LEITUNG")}>
                        <button
                          type="submit"
                          className="rounded-lg px-2 py-1 text-xs font-medium text-neutral-500 transition hover:bg-neutral-100"
                        >
                          {mitglied.rolle === "LEITUNG" ? "Zu Mitglied machen" : "Zur Leitung machen"}
                        </button>
                      </form>
                      <form action={entfernenAktion.bind(null, projektId, mitglied.id)}>
                        <button
                          type="submit"
                          aria-label={`${mitglied.name} entfernen`}
                          className="rounded p-1 text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
                        >
                          ×
                        </button>
                      </form>
                    </>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {istLeitung && kandidaten.length > 0 && (
        <form action={hinzufuegenAktion.bind(null, projektId)} className="flex items-end gap-2 border-t border-neutral-100 pt-3">
          <div className="flex-1">
            <label htmlFor="projektmitglied-hinzufuegen-suche" className="block text-xs font-medium text-neutral-600">
              Mitglied hinzufügen
            </label>
            <div className="mt-1">
              <PersonenAuswahl personen={kandidaten} ausgewaehlteIds={[]} name="mitglieder" id="projektmitglied-hinzufuegen" />
            </div>
          </div>
          <button
            type="submit"
            className="h-9 shrink-0 rounded-lg bg-neutral-100 px-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-200"
          >
            Hinzufügen
          </button>
        </form>
      )}
    </div>
  )
}
