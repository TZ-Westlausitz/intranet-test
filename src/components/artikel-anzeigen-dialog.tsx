"use client"

import { forwardRef, useImperativeHandle, useRef, useState } from "react"

import { formatiereDatumAusDate, zeitAusDate } from "@/lib/datum"
import type { artikelDetailLaden } from "@/lib/wissen/aktionen"

type ArtikelDetailLadenAktion = typeof artikelDetailLaden
type ArtikelDetail = NonNullable<Awaited<ReturnType<ArtikelDetailLadenAktion>>>

export type ArtikelAnzeigenDialogHandle = { oeffnen: (artikelId: string) => void }

/**
 * Lese-Pop-up für einen einzelnen Wissensartikel — Muster
 * InfoAnzeigenDialog, deutlich schlanker (kein Like/Bestätigen/
 * Kommentare/Umfrage, siehe Kontext im Plan). EIN Exemplar pro Liste,
 * `oeffnen(artikelId)` lädt die Detaildaten bei Bedarf nach.
 */
export const ArtikelAnzeigenDialog = forwardRef<
  ArtikelAnzeigenDialogHandle,
  { artikelDetailLadenAktion: ArtikelDetailLadenAktion }
>(function ArtikelAnzeigenDialog({ artikelDetailLadenAktion }, ref) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [detail, setDetail] = useState<ArtikelDetail | null>(null)
  const [laedt, setLaedt] = useState(false)

  async function laden(id: string) {
    setLaedt(true)
    const frisch = await artikelDetailLadenAktion(id)
    setDetail(frisch)
    setLaedt(false)
  }

  useImperativeHandle(ref, () => ({
    oeffnen: (id) => {
      setDetail(null)
      dialogRef.current?.showModal()
      void laden(id)
    },
  }))

  return (
    <dialog
      ref={dialogRef}
      className="fixed top-1/2 left-1/2 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-200 p-0 shadow-xl backdrop:bg-neutral-900/40"
    >
      <div className="flex max-h-[85vh] flex-col">
        <div className="flex items-start justify-between gap-2 border-b border-neutral-200 px-5 py-4">
          {detail ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-neutral-700">
                {detail.erstelltVon.vorname} {detail.erstelltVon.nachname}
              </p>
              <p className="text-xs text-neutral-400">
                {formatiereDatumAusDate(detail.aktualisiertAm)} · {zeitAusDate(detail.aktualisiertAm)}
              </p>
            </div>
          ) : (
            <span />
          )}
          <button
            type="button"
            aria-label="Schließen"
            onClick={() => dialogRef.current?.close()}
            className="shrink-0 rounded-full p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {laedt || !detail ? (
            <p className="py-8 text-center text-sm text-neutral-400">Lädt …</p>
          ) : (
            <>
              <h1 className="text-xl font-bold text-marke-grau">{detail.titel}</h1>

              {detail.inhalt && (
                <div
                  className="mt-2 text-sm text-neutral-600 [&_a]:text-marke-gruen-dunkel [&_a]:underline [&_img]:max-w-full [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5"
                  dangerouslySetInnerHTML={{ __html: detail.inhalt }}
                />
              )}

              {detail.anhaenge.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {detail.anhaenge.map((anhang) => (
                    <a
                      key={anhang.id}
                      href={`/api/wissen/${detail.id}/anhaenge/${anhang.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex max-w-[12rem] items-center gap-1 truncate rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 hover:underline"
                    >
                      📎 {anhang.dateiname}
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </dialog>
  )
})
