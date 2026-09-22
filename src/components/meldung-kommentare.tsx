"use client"

import { useState } from "react"

import { MELDUNG_STATUS_LABEL } from "@/lib/kontaktstelle/status"

export type MeldungKommentarAnhangAnzeige = { id: string; dateiname: string; groesseBytes: number; mimetyp: string }
export type MeldungVerlaufEintragAnzeige =
  | { art: "kommentar"; id: string; erstelltAm: Date; text: string; autorLabel: string; anhaenge: MeldungKommentarAnhangAnzeige[] }
  | { art: "status"; id: string; erstelltAm: Date; status: string }

function zeitpunkt(datum: Date): string {
  return datum.toLocaleString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
}

function AnhangZeile({ meldungId, anhang }: { meldungId: string; anhang: MeldungKommentarAnhangAnzeige }) {
  return (
    <a
      href={`/api/kontaktstelle/${meldungId}/anhaenge/${anhang.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="block max-w-[14rem] truncate text-xs text-marke-gruen-dunkel hover:underline"
    >
      📎 {anhang.dateiname}
    </a>
  )
}

/**
 * Verlauf/Rückkanal zu einer Meldung — Muster AuftragKommentare, hier aber
 * als immer offene Liste statt <details>, weil das hier der
 * Hauptseiteninhalt der Detailseite ist, keine eingeklappte
 * Rückfragen-Sektion. `autorLabel` kommt bereits fertig aus
 * meldungVerlaufFuerAnsicht (siehe dort) — zeigt "Anonym" statt eines
 * Namens, wenn die Kontaktstelle eine anonyme Meldung liest, sonst den
 * echten Namen. Statuswechsel (`art: "status"`) sind Systemzeilen ohne
 * Personenbezug, mittig statt als Sprechblase.
 *
 * `chatAktiv` (Rückmeldung 2026-09-22): das Eingabeformular erscheint erst
 * ab Status "In Bearbeitung" — vorher ein reiner Hinweistext. Serverseitig
 * nochmal geprüft in meldungKommentarErstellen (Regel 5).
 */
export function MeldungKommentare({
  meldungId,
  eintraege,
  chatAktiv,
  kommentarAktion,
}: {
  meldungId: string
  eintraege: MeldungVerlaufEintragAnzeige[]
  chatAktiv: boolean
  kommentarAktion: (meldungId: string, formData: FormData) => void
}) {
  const [anhaenge, setAnhaenge] = useState<string[]>([])

  return (
    <div className="mt-6 rounded-xl border border-rand bg-flaeche p-4">
      <h2 className="text-sm font-semibold text-ueberschrift">Verlauf{eintraege.length > 0 ? ` (${eintraege.length})` : ""}</h2>

      {eintraege.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {eintraege.map((eintrag) =>
            eintrag.art === "status" ? (
              <li key={eintrag.id} className="py-0.5 text-center text-xs text-tertiaer">
                Status auf „{MELDUNG_STATUS_LABEL[eintrag.status] ?? eintrag.status}“ geändert · {zeitpunkt(eintrag.erstelltAm)}
              </li>
            ) : (
              <li key={eintrag.id} className="rounded-lg bg-flaeche-schwach px-3 py-2">
                <p className="text-xs font-medium text-sekundaer">
                  {eintrag.autorLabel} · {zeitpunkt(eintrag.erstelltAm)}
                </p>
                <p className="text-sm text-primaer">{eintrag.text}</p>
                {eintrag.anhaenge.length > 0 && (
                  <div className="mt-1 flex flex-col">
                    {eintrag.anhaenge.map((anhang) => (
                      <AnhangZeile key={anhang.id} meldungId={meldungId} anhang={anhang} />
                    ))}
                  </div>
                )}
              </li>
            ),
          )}
        </ul>
      )}

      {chatAktiv ? (
        <form
          action={kommentarAktion.bind(null, meldungId)}
          onSubmit={(ereignis) => {
            setAnhaenge([])
            window.setTimeout(() => (ereignis.target as HTMLFormElement).reset(), 0)
          }}
          className="mt-3 flex flex-col gap-1"
        >
          <div className="flex gap-2">
            <input
              type="text"
              name="text"
              required
              placeholder="Nachricht …"
              className="h-9 flex-1 rounded-lg border border-flaeche-300 px-2 text-sm"
            />
            <label
              title="Anhang hinzufügen"
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-flaeche-100 text-lg leading-none text-primaer transition hover:bg-flaeche-200"
            >
              +
              <input
                type="file"
                name="anhaenge"
                multiple
                accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
                onChange={(ereignis) => setAnhaenge([...(ereignis.target.files ?? [])].map((datei) => datei.name))}
                className="hidden"
              />
            </label>
            <button
              type="submit"
              className="h-9 shrink-0 rounded-lg bg-flaeche-100 px-3 text-sm font-medium text-primaer transition hover:bg-flaeche-200"
            >
              Senden
            </button>
          </div>
          {anhaenge.length > 0 && <p className="text-xs text-sekundaer">Anhang: {anhaenge.join(", ")}</p>}
        </form>
      ) : (
        <p className="mt-3 text-xs text-sekundaer">Der Chat wird freigeschaltet, sobald die Meldung „In Bearbeitung“ ist.</p>
      )}
    </div>
  )
}
