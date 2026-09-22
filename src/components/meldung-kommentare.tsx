"use client"

import { useState } from "react"

export type MeldungKommentarAnhangAnzeige = { id: string; dateiname: string; groesseBytes: number; mimetyp: string }
export type MeldungKommentarAnzeige = {
  id: string
  text: string
  erstelltAm: Date
  autorLabel: string
  anhaenge: MeldungKommentarAnhangAnzeige[]
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
 * meldungKommentareFuerAnsicht (siehe dort) — zeigt "Anonym" statt eines
 * Namens, wenn die Kontaktstelle eine anonyme Meldung liest, sonst den
 * echten Namen.
 */
export function MeldungKommentare({
  meldungId,
  kommentare,
  kommentarAktion,
}: {
  meldungId: string
  kommentare: MeldungKommentarAnzeige[]
  kommentarAktion: (meldungId: string, formData: FormData) => void
}) {
  const [anhaenge, setAnhaenge] = useState<string[]>([])

  return (
    <div className="mt-6 rounded-xl border border-rand bg-flaeche p-4">
      <h2 className="text-sm font-semibold text-ueberschrift">Verlauf{kommentare.length > 0 ? ` (${kommentare.length})` : ""}</h2>

      {kommentare.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {kommentare.map((kommentar) => (
            <li key={kommentar.id} className="rounded-lg bg-flaeche-schwach px-3 py-2">
              <p className="text-xs font-medium text-sekundaer">
                {kommentar.autorLabel} ·{" "}
                {kommentar.erstelltAm.toLocaleString("de-DE", {
                  timeZone: "Europe/Berlin",
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p className="text-sm text-primaer">{kommentar.text}</p>
              {kommentar.anhaenge.length > 0 && (
                <div className="mt-1 flex flex-col">
                  {kommentar.anhaenge.map((anhang) => (
                    <AnhangZeile key={anhang.id} meldungId={meldungId} anhang={anhang} />
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

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
    </div>
  )
}
