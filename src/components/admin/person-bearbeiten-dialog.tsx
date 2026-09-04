"use client"

import { useRef, useState, useTransition } from "react"

import { ROLLEN_OPTIONEN } from "@/lib/rollen-optionen"
import { ROLLE_NAMEN } from "@/lib/rollen-optionen"
import { Rolle } from "@/generated/prisma/enums"

type Option = { id: string; name: string }

export type ZugehoerigkeitAnzeige = {
  id: string
  standort: Option | null
  abteilung: Option
  rolle: Rolle
}

/**
 * Bearbeiten-Pop-Up für einen Benutzer — bündelt die vier Dinge, die im
 * Adminbereich pro Person einstellbar sind: Zugehörigkeiten (Standort ×
 * Abteilung × Rolle, siehe Model Zugehoerigkeit — mehrere gleichzeitig
 * möglich), Gruppen, Berechtigungen und das Passwort. Jeder Abschnitt ist
 * ein eigenes `<form>`, unabhängig absendbar — wie bei TerminInfoDialog,
 * das ebenfalls mehrere Formulare in einem Pop-Up kombiniert.
 *
 * "Passwort zurücksetzen" ruft die Server Action direkt auf (nicht über
 * `<form action>`), weil sie das neue Klartextpasswort einmalig zurückgibt
 * — bei einer normalen Formular-Aktion mit Redirect ginge das verloren
 * (siehe personPasswortZuruecksetzen und PersonErstellenFormular).
 */
export function PersonBearbeitenDialog({
  personId,
  name,
  benutzername,
  zugehoerigkeiten,
  standorte,
  abteilungen,
  gruppen,
  ausgewaehlteGruppenIds,
  berechtigungenListe,
  ausgewaehlteBerechtigungIds,
  benutzernameAktualisierenAktion,
  zugehoerigkeitHinzufuegenAktion,
  zugehoerigkeitBeendenAktion,
  personGruppenAktualisierenAktion,
  personBerechtigungenAktualisierenAktion,
  personPasswortZuruecksetzenAktion,
}: {
  personId: string
  name: string
  benutzername: string
  zugehoerigkeiten: ZugehoerigkeitAnzeige[]
  standorte: Option[]
  abteilungen: Option[]
  gruppen: Option[]
  ausgewaehlteGruppenIds: string[]
  berechtigungenListe: Option[]
  ausgewaehlteBerechtigungIds: string[]
  benutzernameAktualisierenAktion: (personId: string, formData: FormData) => void
  zugehoerigkeitHinzufuegenAktion: (personId: string, formData: FormData) => void
  zugehoerigkeitBeendenAktion: (zugehoerigkeitId: string) => void
  personGruppenAktualisierenAktion: (personId: string, formData: FormData) => void
  personBerechtigungenAktualisierenAktion: (personId: string, formData: FormData) => void
  personPasswortZuruecksetzenAktion: (personId: string) => Promise<string>
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [istPending, startTransition] = useTransition()
  const [neuesPasswort, setNeuesPasswort] = useState<string | null>(null)

  function passwortZuruecksetzen() {
    setNeuesPasswort(null)
    startTransition(async () => {
      const passwort = await personPasswortZuruecksetzenAktion(personId)
      setNeuesPasswort(passwort)
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="h-9 shrink-0 rounded-lg px-2.5 text-xs font-medium text-neutral-500 transition hover:bg-neutral-100"
      >
        Bearbeiten
      </button>

      <dialog
        ref={dialogRef}
        className="fixed top-1/2 left-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-200 p-0 shadow-xl backdrop:bg-neutral-900/40"
      >
        <div className="border-b border-neutral-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-marke-grau">{name}</h2>
        </div>

        <div className="flex max-h-[75vh] flex-col gap-5 overflow-y-auto px-5 py-4 text-sm">
          <section>
            <h3 className="text-xs font-semibold text-neutral-600">Benutzername</h3>
            <form
              action={benutzernameAktualisierenAktion.bind(null, personId)}
              className="mt-2 flex items-center gap-2"
            >
              <input
                name="benutzername"
                type="text"
                defaultValue={benutzername}
                required
                className="h-9 flex-1 rounded-lg border border-neutral-300 px-2 text-sm"
              />
              <button
                type="submit"
                className="h-9 shrink-0 rounded-lg bg-neutral-100 px-3 text-xs font-medium text-neutral-700 transition hover:bg-neutral-200"
              >
                Speichern
              </button>
            </form>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-neutral-600">Zugehörigkeiten</h3>

            {zugehoerigkeiten.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1.5">
                {zugehoerigkeiten.map((z) => (
                  <li
                    key={z.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-neutral-50 px-2.5 py-1.5"
                  >
                    <span className="text-neutral-700">
                      {z.standort ? `${z.standort.name} · ` : ""}
                      {z.abteilung.name} · {ROLLE_NAMEN[z.rolle]}
                    </span>
                    <form action={zugehoerigkeitBeendenAktion.bind(null, z.id)}>
                      <button
                        type="submit"
                        className="shrink-0 text-xs font-medium text-neutral-500 hover:text-red-600"
                      >
                        Beenden
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}

            <form
              action={zugehoerigkeitHinzufuegenAktion.bind(null, personId)}
              className="mt-2 flex flex-wrap items-end gap-2"
            >
              <select
                name="standortId"
                required
                className="h-9 rounded-lg border border-neutral-300 px-2 text-sm"
              >
                {standorte.map((standort) => (
                  <option key={standort.id} value={standort.id}>
                    {standort.name}
                  </option>
                ))}
              </select>
              <select
                name="abteilungId"
                required
                className="h-9 rounded-lg border border-neutral-300 px-2 text-sm"
              >
                {abteilungen.map((abteilung) => (
                  <option key={abteilung.id} value={abteilung.id}>
                    {abteilung.name}
                  </option>
                ))}
              </select>
              <select name="rolle" className="h-9 rounded-lg border border-neutral-300 px-2 text-sm">
                {ROLLEN_OPTIONEN.map((option) => (
                  <option key={option.wert} value={option.wert}>
                    {option.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="h-9 shrink-0 rounded-lg bg-neutral-100 px-3 text-xs font-medium text-neutral-700 transition hover:bg-neutral-200"
              >
                Hinzufügen
              </button>
            </form>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-neutral-600">Gruppen</h3>
            <form action={personGruppenAktualisierenAktion.bind(null, personId)} className="mt-2">
              <div className="grid max-h-40 grid-cols-2 gap-1.5 overflow-y-auto rounded-lg border border-neutral-200 p-2.5">
                {gruppen.map((gruppe) => (
                  <label key={gruppe.id} className="flex items-center gap-1.5 text-xs text-neutral-700">
                    <input
                      type="checkbox"
                      name="gruppen"
                      value={gruppe.id}
                      defaultChecked={ausgewaehlteGruppenIds.includes(gruppe.id)}
                      className="h-3.5 w-3.5 rounded border-neutral-300 text-marke-gruen focus:ring-marke-gruen"
                    />
                    {gruppe.name}
                  </label>
                ))}
              </div>
              <button
                type="submit"
                className="mt-2 h-8 rounded-lg bg-neutral-100 px-3 text-xs font-medium text-neutral-700 transition hover:bg-neutral-200"
              >
                Gruppen speichern
              </button>
            </form>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-neutral-600">Berechtigungen</h3>
            <form action={personBerechtigungenAktualisierenAktion.bind(null, personId)} className="mt-2">
              <div className="grid max-h-40 grid-cols-2 gap-1.5 overflow-y-auto rounded-lg border border-neutral-200 p-2.5">
                {berechtigungenListe.map((berechtigung) => (
                  <label key={berechtigung.id} className="flex items-center gap-1.5 text-xs text-neutral-700">
                    <input
                      type="checkbox"
                      name="berechtigungen"
                      value={berechtigung.id}
                      defaultChecked={ausgewaehlteBerechtigungIds.includes(berechtigung.id)}
                      className="h-3.5 w-3.5 rounded border-neutral-300 text-marke-gruen focus:ring-marke-gruen"
                    />
                    {berechtigung.name}
                  </label>
                ))}
              </div>
              <button
                type="submit"
                className="mt-2 h-8 rounded-lg bg-neutral-100 px-3 text-xs font-medium text-neutral-700 transition hover:bg-neutral-200"
              >
                Berechtigungen speichern
              </button>
            </form>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-neutral-600">Passwort</h3>
            <button
              type="button"
              onClick={passwortZuruecksetzen}
              disabled={istPending}
              className="mt-2 h-8 rounded-lg bg-neutral-100 px-3 text-xs font-medium text-neutral-700 transition hover:bg-neutral-200 disabled:opacity-60"
            >
              {istPending ? "Wird zurückgesetzt …" : "Passwort zurücksetzen"}
            </button>
            {neuesPasswort && (
              <p className="mt-2 rounded-lg border border-marke-gruen/40 bg-marke-gruen/10 px-2.5 py-1.5 text-xs text-marke-grau">
                Neues Passwort: <span className="font-mono font-semibold">{neuesPasswort}</span>
                <br />
                Wird nur dieses eine Mal angezeigt — bitte jetzt notieren oder weitergeben.
              </p>
            )}
          </section>
        </div>

        <div className="flex justify-end border-t border-neutral-200 px-5 py-4">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="h-9 rounded-lg px-3 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100"
          >
            Schließen
          </button>
        </div>
      </dialog>
    </>
  )
}
