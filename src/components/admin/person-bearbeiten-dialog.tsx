"use client"

import { useActionState, useEffect, useRef, useState, useTransition } from "react"

import { FormularAenderungenSchutz } from "@/components/formular-aenderungen-schutz"
import { SpeichernKnopf } from "@/components/speichern-knopf"
import { zeigeToast } from "@/components/toast-anzeige"
import type { PersonSpeichernErgebnis } from "@/lib/admin/personen-aktionen"

type Option = { id: string; name: string }

export type ZugehoerigkeitAnzeige = {
  id: string
  standort: Option | null
  abteilung: Option
}

/**
 * Bearbeiten-Pop-Up für einen Benutzer — bündelt, was im Adminbereich pro
 * Person einstellbar ist: Benutzername, Eintrittsdatum, Zugehörigkeiten
 * (Standort × Abteilung, siehe Model Zugehoerigkeit — mehrere gleichzeitig
 * möglich), Gruppen, Berechtigungen und das Passwort.
 *
 * EIN Formular, EIN "Speichern" unten neben "Schließen" (Rückmeldung
 * 2026-10-06; vorher hatte jeder Abschnitt einen eigenen Knopf, und man sah
 * nicht, ob etwas gespeichert wurde). Das Speichern meldet sich mit
 * "Wird gespeichert …" am Knopf und der Einblendung "Gespeichert"; Fehler
 * (z. B. ein schon vergebener Benutzername) stehen als roter Text direkt über
 * den Knöpfen — dann ist nichts gespeichert.
 *
 * Zugehörigkeiten beenden wird erst mit "Speichern" wirksam: "Beenden"
 * markiert sie nur (durchgestrichen, mit "Rückgängig"). Eine neue
 * Zugehörigkeit kommt dazu, sobald eine Abteilung gewählt ist (Standort optional).
 *
 * "Passwort zurücksetzen" ist bewusst KEIN Teil des Speicherns: Es wirkt
 * sofort und gibt das neue Klartextpasswort einmalig zurück — bei einer
 * normalen Formular-Aktion mit Redirect ginge das verloren (siehe
 * personPasswortZuruecksetzen und PersonErstellenFormular).
 */
export function PersonBearbeitenDialog({
  personId,
  name,
  benutzername,
  eintrittAm,
  zugehoerigkeiten,
  standorte,
  abteilungen,
  gruppen,
  ausgewaehlteGruppenIds,
  berechtigungenListe,
  ausgewaehlteBerechtigungIds,
  personSpeichernAktion,
  personPasswortZuruecksetzenAktion,
}: {
  personId: string
  name: string
  benutzername: string
  /** "2019-03-01" oder leer — für das Datumsfeld. */
  eintrittAm: string
  zugehoerigkeiten: ZugehoerigkeitAnzeige[]
  standorte: Option[]
  abteilungen: Option[]
  gruppen: Option[]
  ausgewaehlteGruppenIds: string[]
  berechtigungenListe: Option[]
  ausgewaehlteBerechtigungIds: string[]
  personSpeichernAktion: (
    personId: string,
    vorher: PersonSpeichernErgebnis | null,
    formData: FormData,
  ) => Promise<PersonSpeichernErgebnis>
  personPasswortZuruecksetzenAktion: (personId: string) => Promise<string>
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [istPending, startTransition] = useTransition()
  const [neuesPasswort, setNeuesPasswort] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const adminRef = useRef<HTMLInputElement>(null)
  // "Admin" angehakt? Dann gelten alle anderen Berechtigungen (außer Meldestelle) automatisch.
  const [adminAn, setAdminAn] = useState(() => berechtigungenListe.some((b) => b.name === "Admin" && ausgewaehlteBerechtigungIds.includes(b.id)))
  const [ergebnis, speichernFormAktion, speichertGerade] = useActionState(personSpeichernAktion.bind(null, personId), null)
  const [, speichernStarten] = useTransition()
  // Vorgemerkte "Beenden"-Markierungen gehören zu EINEM Speicher-Ergebnis: Nach
  // jedem Speichern ist `ergebnis` ein neues Objekt, die Markierungen gelten
  // dann nicht mehr — ohne dass dafür ein Effekt nachträglich Zustand setzen muss.
  const [markierung, setMarkierung] = useState<{ fuer: PersonSpeichernErgebnis | null; ids: string[] }>({
    fuer: null,
    ids: [],
  })
  const beendenIds = markierung.fuer === ergebnis ? markierung.ids : []

  // Rückmeldung nach dem Speichern als Einblendung (der Fehlertext steht zusätzlich im Pop-Up).
  // Nach Erfolg zurück auf den gespeicherten Stand (leert z. B. die Auswahl "Weitere
  // Zugehörigkeit"); nach einem Fehler bleiben die Eingaben stehen, damit nichts neu
  // getippt werden muss.
  useEffect(() => {
    if (!ergebnis) return
    zeigeToast(ergebnis.ok ? "Gespeichert" : "Nicht gespeichert", ergebnis.ok ? "ok" : "fehler")
    if (ergebnis.ok) formRef.current?.reset()
  }, [ergebnis])

  function passwortZuruecksetzen() {
    setNeuesPasswort(null)
    startTransition(async () => {
      const passwort = await personPasswortZuruecksetzenAktion(personId)
      setNeuesPasswort(passwort)
    })
  }

  function beendenUmschalten(id: string) {
    setMarkierung({
      fuer: ergebnis,
      ids: beendenIds.includes(id) ? beendenIds.filter((x) => x !== id) : [...beendenIds, id],
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="h-9 shrink-0 rounded-lg px-2.5 text-xs font-medium text-sekundaer transition hover:bg-flaeche-100"
      >
        Bearbeiten
      </button>

      <dialog
        ref={dialogRef}
        className="fixed top-1/2 left-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rand bg-flaeche p-0 shadow-xl backdrop:bg-neutral-900/40"
      >
        {/* onSubmit statt action=: React setzt ein Formular mit action= nach JEDEM
            Absenden zurück, auch nach einem Fehler — dann wären die Eingaben weg. */}
        <form
          ref={formRef}
          // Nach einem Zurücksetzen (z. B. nach dem Speichern) den Haken von "Admin" neu einlesen.
          onReset={() => window.setTimeout(() => setAdminAn(adminRef.current?.checked ?? false), 0)}
          onSubmit={(ereignis) => {
            ereignis.preventDefault()
            const daten = new FormData(ereignis.currentTarget)
            speichernStarten(() => speichernFormAktion(daten))
          }}
        >
          <div className="border-b border-rand px-5 py-4">
            <h2 className="text-lg font-semibold text-ueberschrift">{name}</h2>
          </div>

          <div className="flex max-h-[65vh] flex-col gap-5 overflow-y-auto px-5 py-4 text-sm">
            <section>
              <label htmlFor={`benutzername-${personId}`} className="text-xs font-semibold text-primaer">
                Benutzername
              </label>
              <input
                id={`benutzername-${personId}`}
                name="benutzername"
                type="text"
                defaultValue={benutzername}
                required
                className="mt-2 h-9 w-full rounded-lg border border-flaeche-300 px-2 text-sm"
              />
            </section>

            <section>
              <label htmlFor={`eintritt-${personId}`} className="text-xs font-semibold text-primaer">
                Eintrittsdatum
              </label>
              <input
                id={`eintritt-${personId}`}
                name="eintrittAm"
                type="date"
                defaultValue={eintrittAm}
                className="mt-2 h-9 w-full rounded-lg border border-flaeche-300 px-2 text-sm"
              />
            </section>

            <section>
              <h3 className="text-xs font-semibold text-primaer">Zugehörigkeiten</h3>

              {zugehoerigkeiten.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1.5">
                  {zugehoerigkeiten.map((z) => {
                    const wirdBeendet = beendenIds.includes(z.id)
                    return (
                      <li
                        key={z.id}
                        className="flex items-center justify-between gap-2 rounded-lg bg-flaeche-schwach px-2.5 py-1.5"
                      >
                        {wirdBeendet && <input type="hidden" name="zugehoerigkeitBeenden" value={z.id} />}
                        <span className={wirdBeendet ? "text-tertiaer line-through" : "text-primaer"}>
                          {z.standort ? `${z.standort.name} · ` : ""}
                          {z.abteilung.name}
                          {wirdBeendet && <span className="ml-1.5 text-xs no-underline">(wird beendet)</span>}
                        </span>
                        <button
                          type="button"
                          onClick={() => beendenUmschalten(z.id)}
                          className="shrink-0 text-xs font-medium text-sekundaer hover:text-red-600"
                        >
                          {wirdBeendet ? "Rückgängig" : "Beenden"}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}

              <p className="mt-2 text-xs text-sekundaer">
                Zugehörigkeit hinzufügen (optional) — der Standort kann leer bleiben. Für einen Wechsel die alte
                oben mit „Beenden“ markieren und die neue hier wählen.
              </p>
              <div className="mt-1 flex flex-wrap items-end gap-2">
                <select
                  name="standortId"
                  defaultValue=""
                  aria-label="Standort"
                  className="h-9 rounded-lg border border-flaeche-300 px-2 text-sm"
                >
                  <option value="">Kein Standort</option>
                  {standorte.map((standort) => (
                    <option key={standort.id} value={standort.id}>
                      {standort.name}
                    </option>
                  ))}
                </select>
                <select
                  name="abteilungId"
                  defaultValue=""
                  aria-label="Abteilung"
                  className="h-9 rounded-lg border border-flaeche-300 px-2 text-sm"
                >
                  <option value="">Abteilung wählen …</option>
                  {abteilungen.map((abteilung) => (
                    <option key={abteilung.id} value={abteilung.id}>
                      {abteilung.name}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold text-primaer">Gruppen</h3>
              <div className="mt-2 grid max-h-40 grid-cols-2 gap-1.5 overflow-y-auto rounded-lg border border-rand p-2.5">
                {gruppen.map((gruppe) => (
                  <label key={gruppe.id} className="flex items-center gap-1.5 text-xs text-primaer">
                    <input
                      type="checkbox"
                      name="gruppen"
                      value={gruppe.id}
                      defaultChecked={ausgewaehlteGruppenIds.includes(gruppe.id)}
                      className="h-3.5 w-3.5 rounded border-flaeche-300 text-marke-gruen focus:ring-marke-gruen"
                    />
                    {gruppe.name}
                  </label>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold text-primaer">Berechtigungen</h3>
              <p className="mt-1 text-xs text-sekundaer">
                Mit „Admin“ gelten automatisch alle anderen Berechtigungen, auch ohne Haken. Nur die „Meldestelle“ muss
                immer einzeln vergeben werden.
              </p>
              <div className="mt-2 grid max-h-40 grid-cols-2 gap-1.5 overflow-y-auto rounded-lg border border-rand p-2.5">
                {berechtigungenListe.map((berechtigung) => {
                  const istAdmin = berechtigung.name === "Admin"
                  const durchAdmin = adminAn && !istAdmin && berechtigung.name !== "Meldestelle"
                  return (
                    <label key={berechtigung.id} className="flex items-center gap-1.5 text-xs text-primaer">
                      <input
                        ref={istAdmin ? adminRef : undefined}
                        type="checkbox"
                        name="berechtigungen"
                        value={berechtigung.id}
                        defaultChecked={ausgewaehlteBerechtigungIds.includes(berechtigung.id)}
                        onChange={istAdmin ? (ereignis) => setAdminAn(ereignis.target.checked) : undefined}
                        className="h-3.5 w-3.5 rounded border-flaeche-300 text-marke-gruen focus:ring-marke-gruen"
                      />
                      <span>
                        {berechtigung.name}
                        {durchAdmin && <span className="ml-1 text-tertiaer">(durch Admin)</span>}
                      </span>
                    </label>
                  )
                })}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold text-primaer">Passwort</h3>
              <button
                type="button"
                onClick={passwortZuruecksetzen}
                disabled={istPending}
                className="mt-2 h-8 rounded-lg bg-flaeche-100 px-3 text-xs font-medium text-primaer transition hover:bg-flaeche-200 disabled:opacity-60"
              >
                {istPending ? "Wird zurückgesetzt …" : "Passwort zurücksetzen"}
              </button>
              <p className="mt-1 text-xs text-sekundaer">Wirkt sofort, ohne Speichern.</p>
              {neuesPasswort && (
                <p className="mt-2 rounded-lg border border-marke-gruen/40 bg-marke-gruen/10 px-2.5 py-1.5 text-xs text-ueberschrift">
                  Neues Passwort: <span className="font-mono font-semibold">{neuesPasswort}</span>
                  <br />
                  Wird nur dieses eine Mal angezeigt — bitte jetzt notieren oder weitergeben.
                </p>
              )}
            </section>
          </div>

          {ergebnis && !ergebnis.ok && ergebnis.fehler && (
            <p role="alert" className="border-t border-rand bg-red-50 px-5 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
              {ergebnis.fehler}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-rand px-5 py-4">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="h-9 rounded-lg px-3 text-sm font-medium text-primaer transition hover:bg-flaeche-100"
            >
              Schließen
            </button>
            <SpeichernKnopf
              toast={false}
              laeuft={speichertGerade}
              className="h-9 rounded-lg bg-marke-gruen px-4 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel disabled:opacity-60"
            >
              Speichern
            </SpeichernKnopf>
          </div>
          <FormularAenderungenSchutz />
        </form>
      </dialog>
    </>
  )
}
