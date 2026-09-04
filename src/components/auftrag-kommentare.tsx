"use client"

import { useState } from "react"

export type AuftragKommentarAnhangAnzeige = { id: string; dateiname: string; groesseBytes: number; mimetyp: string }
export type AuftragKommentarAnzeige = {
  id: string
  text: string
  erstelltAm: Date
  person: { vorname: string; nachname: string }
  anhaenge: AuftragKommentarAnhangAnzeige[]
}

function AnhangZeile({ auftragId, anhang }: { auftragId: string; anhang: AuftragKommentarAnhangAnzeige }) {
  return (
    <a
      href={`/api/auftraege/${auftragId}/anhaenge/${anhang.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="block max-w-[10rem] truncate text-xs text-marke-gruen-dunkel hover:underline"
    >
      📎 {anhang.dateiname}
    </a>
  )
}

/**
 * Rückfragen/Chat zu einem Auftrag — dasselbe Muster wie bei Terminen
 * (siehe TerminInfoDialog), hier aber als <details> in der Listenzeile
 * statt in einem eigenen Pop-Up, weil die Auftrags-Übersicht schon eine
 * flache Liste ist und kein zweites Pop-Up darüber braucht.
 */
export function AuftragKommentare({
  auftragId,
  kommentare,
  kommentarAktion,
}: {
  auftragId: string
  kommentare: AuftragKommentarAnzeige[]
  kommentarAktion: (auftragId: string, formData: FormData) => void
}) {
  const [anhaenge, setAnhaenge] = useState<string[]>([])

  return (
    <details className="mt-1.5">
      <summary className="cursor-pointer text-xs font-medium text-marke-gruen-dunkel">
        Rückfragen{kommentare.length > 0 ? ` (${kommentare.length})` : ""}
      </summary>

      <div className="mt-1.5">
        {kommentare.length > 0 && (
          <ul className="flex flex-col gap-2">
            {kommentare.map((kommentar) => (
              <li key={kommentar.id} className="rounded-lg bg-neutral-50 px-2.5 py-1.5">
                <p className="text-xs font-medium text-neutral-500">
                  {kommentar.person.vorname} {kommentar.person.nachname} ·{" "}
                  {kommentar.erstelltAm.toLocaleString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className="text-sm text-neutral-700">{kommentar.text}</p>
                {kommentar.anhaenge.length > 0 && (
                  <div className="mt-1 flex flex-col">
                    {kommentar.anhaenge.map((anhang) => (
                      <AnhangZeile key={anhang.id} auftragId={auftragId} anhang={anhang} />
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <form
          action={kommentarAktion.bind(null, auftragId)}
          onSubmit={(ereignis) => {
            setAnhaenge([])
            window.setTimeout(() => (ereignis.target as HTMLFormElement).reset(), 0)
          }}
          className="mt-1.5 flex flex-col gap-1"
        >
          <div className="flex gap-2">
            <input
              type="text"
              name="text"
              required
              placeholder="Frage oder Hinweis …"
              className="h-9 flex-1 rounded-lg border border-neutral-300 px-2 text-sm"
            />
            <label
              title="Anhang hinzufügen"
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-neutral-100 text-lg leading-none text-neutral-600 transition hover:bg-neutral-200"
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
              className="h-9 shrink-0 rounded-lg bg-neutral-100 px-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-200"
            >
              Senden
            </button>
          </div>
          {anhaenge.length > 0 && <p className="text-xs text-neutral-500">Anhang: {anhaenge.join(", ")}</p>}
        </form>
      </div>
    </details>
  )
}
