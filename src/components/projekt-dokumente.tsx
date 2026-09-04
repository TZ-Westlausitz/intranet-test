"use client"

function formatiereGroesse(bytes: number): string {
  return bytes < 1_000_000 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1_000_000).toFixed(1)} MB`
}

export type ProjektDokumentAnzeige = {
  id: string
  dateiname: string
  mimetyp: string
  groesseBytes: number
  hochgeladenAm: Date
  hochgeladenVon: { vorname: string; nachname: string }
  darfLoeschen: boolean
}

/** Dokumentenbereich eines Projekts: Liste + Upload — Regel 7, nur der Pfad steht in der DB, die Datei kommt über die Download-Route. */
export function ProjektDokumente({
  projektId,
  dokumente,
  schreibgeschuetzt,
  hochladenAktion,
  loeschenAktion,
}: {
  projektId: string
  dokumente: ProjektDokumentAnzeige[]
  schreibgeschuetzt: boolean
  hochladenAktion: (projektId: string, formData: FormData) => void
  loeschenAktion: (projektId: string, dokumentId: string) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      {dokumente.length === 0 ? (
        <p className="text-sm text-neutral-500">Noch keine Dokumente.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-100">
          {dokumente.map((dokument) => {
            const url = `/api/projekte/${projektId}/dokumente/${dokument.id}`
            const istBild = dokument.mimetyp.startsWith("image/")
            return (
            <li key={dokument.id} className="flex items-center justify-between gap-2 py-2">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 flex-1 items-center gap-2 truncate text-sm text-marke-gruen-dunkel hover:underline"
              >
                {istBild ? (
                  // eslint-disable-next-line @next/next/no-img-element -- interne Datei aus der Ablage, kein optimierbares Next-Image-Ziel
                  <img src={url} alt="" className="h-9 w-9 shrink-0 rounded object-cover" />
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-neutral-100 text-neutral-400">
                    📄
                  </span>
                )}
                <span className="truncate">{dokument.dateiname}</span>
              </a>
              <span className="shrink-0 text-xs text-neutral-400">
                {formatiereGroesse(dokument.groesseBytes)} · {dokument.hochgeladenVon.vorname} {dokument.hochgeladenVon.nachname}
              </span>
              {dokument.darfLoeschen && !schreibgeschuetzt && (
                <form action={loeschenAktion.bind(null, projektId, dokument.id)}>
                  <button
                    type="submit"
                    aria-label={`${dokument.dateiname} löschen`}
                    className="shrink-0 rounded p-1 text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    ×
                  </button>
                </form>
              )}
            </li>
            )
          })}
        </ul>
      )}

      {!schreibgeschuetzt && (
        <form action={hochladenAktion.bind(null, projektId)} className="flex items-end gap-2 border-t border-neutral-100 pt-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-neutral-600">Datei hochladen</label>
            <input
              type="file"
              name="dateien"
              multiple
              accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,.doc,.docx,.xls,.xlsx"
              className="mt-1.5 w-full text-sm text-neutral-600 file:mr-3 file:h-8 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:text-sm file:font-medium file:text-neutral-700 hover:file:bg-neutral-200"
            />
          </div>
          <button
            type="submit"
            className="h-9 shrink-0 rounded-lg bg-neutral-100 px-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-200"
          >
            Hochladen
          </button>
        </form>
      )}
    </div>
  )
}
