"use client"

import { useRef, useState } from "react"
import { FileText, X } from "lucide-react"

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

/**
 * Bild-Klick öffnet eine In-App-Lightbox statt `target="_blank"`
 * (Rückmeldung 2026-09-16, dasselbe Muster wie bei Info-/Chat-Anhängen,
 * siehe AnhaengeListe in info-anzeigen-dialog.tsx): `target="_blank"`
 * navigierte in der installierten Web-App (Standalone-Modus, keine
 * Tab-Leiste) einfach die ganze App zum rohen Bild, ohne Weg zurück.
 */
function BildLightbox({ url, offenerName, onSchliessen }: { url: string; offenerName: string; onSchliessen: () => void }) {
  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Schließen"
        onClick={onSchliessen}
        className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900/60 text-white transition hover:bg-neutral-900/80"
      >
        <X className="h-4 w-4" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element -- Vorschau aus der Ablage, kein optimierbares Next-Image-Ziel */}
      <img src={url} alt={offenerName} className="max-h-[85vh] max-w-[92vw] rounded-xl object-contain" />
    </div>
  )
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
  const lightboxRef = useRef<HTMLDialogElement>(null)
  const [geoeffnetesDokument, setGeoeffnetesDokument] = useState<ProjektDokumentAnzeige | null>(null)

  return (
    <div className="flex flex-col gap-3">
      {dokumente.length === 0 ? (
        <p className="text-sm text-sekundaer">Noch keine Dokumente.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-flaeche-100">
          {dokumente.map((dokument) => {
            const url = `/api/projekte/${projektId}/dokumente/${dokument.id}`
            const istBild = dokument.mimetyp.startsWith("image/")
            const inhalt = (
              <>
                {istBild ? (
                  // eslint-disable-next-line @next/next/no-img-element -- interne Datei aus der Ablage, kein optimierbares Next-Image-Ziel
                  <img src={url} alt="" className="h-9 w-9 shrink-0 rounded object-cover" />
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-flaeche-100 text-tertiaer">
                    <FileText className="h-4 w-4" />
                  </span>
                )}
                <span className="truncate">{dokument.dateiname}</span>
              </>
            )
            return (
            <li key={dokument.id} className="flex items-center justify-between gap-2 py-2">
              {istBild ? (
                <button
                  type="button"
                  onClick={() => {
                    setGeoeffnetesDokument(dokument)
                    lightboxRef.current?.showModal()
                  }}
                  className="flex min-w-0 flex-1 items-center gap-2 truncate text-sm text-marke-gruen-dunkel hover:underline"
                >
                  {inhalt}
                </button>
              ) : (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-0 flex-1 items-center gap-2 truncate text-sm text-marke-gruen-dunkel hover:underline"
                >
                  {inhalt}
                </a>
              )}
              <span className="shrink-0 text-xs text-tertiaer">
                {formatiereGroesse(dokument.groesseBytes)} · {dokument.hochgeladenVon.vorname} {dokument.hochgeladenVon.nachname}
              </span>
              {dokument.darfLoeschen && !schreibgeschuetzt && (
                <form action={loeschenAktion.bind(null, projektId, dokument.id)}>
                  <button
                    type="submit"
                    aria-label={`${dokument.dateiname} löschen`}
                    className="shrink-0 rounded p-1 text-tertiaer transition hover:bg-red-50 hover:text-red-600"
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

      <dialog
        ref={lightboxRef}
        onClick={(ereignis) => {
          if (ereignis.target === lightboxRef.current) lightboxRef.current?.close()
        }}
        className="fixed top-1/2 left-1/2 max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-transparent p-0 backdrop:bg-neutral-900/70"
      >
        {geoeffnetesDokument && (
          <BildLightbox
            url={`/api/projekte/${projektId}/dokumente/${geoeffnetesDokument.id}`}
            offenerName={geoeffnetesDokument.dateiname}
            onSchliessen={() => lightboxRef.current?.close()}
          />
        )}
      </dialog>

      {!schreibgeschuetzt && (
        <form action={hochladenAktion.bind(null, projektId)} className="flex items-end gap-2 border-t border-flaeche-100 pt-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-primaer">Datei hochladen</label>
            <input
              type="file"
              name="dateien"
              multiple
              accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,.doc,.docx,.xls,.xlsx"
              className="mt-1.5 w-full text-sm text-primaer file:mr-3 file:h-8 file:rounded-lg file:border-0 file:bg-flaeche-100 file:px-3 file:text-sm file:font-medium file:text-primaer hover:file:bg-flaeche-200"
            />
          </div>
          <button
            type="submit"
            className="h-9 shrink-0 rounded-lg bg-flaeche-100 px-3 text-sm font-medium text-primaer transition hover:bg-flaeche-200"
          >
            Hochladen
          </button>
        </form>
      )}
    </div>
  )
}
