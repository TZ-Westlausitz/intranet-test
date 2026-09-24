"use client"

import { forwardRef, useImperativeHandle, useRef, useState } from "react"
import { X } from "lucide-react"

import { KontaktProfil } from "@/components/kontakt-profil"
import type { personDetailLaden } from "@/lib/kontakte/aktionen"

type PersonDetailLadenAktion = typeof personDetailLaden
type PersonDetail = NonNullable<Awaited<ReturnType<PersonDetailLadenAktion>>>

export type KontaktAnzeigenDialogHandle = { oeffnen: (personId: string) => void }

/**
 * Lese-Pop-up für ein Personenprofil aus /kontakte — Klick auf eine Zeile
 * öffnet direkt dieses Pop-up statt zur eigenen Seite zu navigieren
 * (Rückmeldung vom 2026-09-07). Die eigene Seite
 * (`/kontakte/[personId]`) bleibt trotzdem bestehen — sie ist das
 * Sprungziel für @Erwähnungen im Newsfeed (echte `<a href>`-Links in
 * gespeichertem Rich-Text, kein React-Kontext zum Abfangen des Klicks)
 * und für direktes Verlinken/Teilen.
 */
export const KontaktAnzeigenDialog = forwardRef<
  KontaktAnzeigenDialogHandle,
  { personDetailLadenAktion: PersonDetailLadenAktion }
>(function KontaktAnzeigenDialog({ personDetailLadenAktion }, ref) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [detail, setDetail] = useState<PersonDetail | null>(null)
  const [laedt, setLaedt] = useState(false)

  useImperativeHandle(ref, () => ({
    oeffnen: (personId) => {
      setDetail(null)
      setLaedt(true)
      dialogRef.current?.showModal()
      personDetailLadenAktion(personId).then((frisch) => {
        setDetail(frisch)
        setLaedt(false)
      })
    },
  }))

  return (
    <dialog
      ref={dialogRef}
      className="fixed top-1/2 left-1/2 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rand bg-flaeche p-0 shadow-xl backdrop:bg-neutral-900/40"
    >
      <div className="flex max-h-[85vh] flex-col">
        <div className="flex justify-end px-5 pt-4">
          <button
            type="button"
            aria-label="Schließen"
            onClick={() => dialogRef.current?.close()}
            className="shrink-0 rounded-full p-1.5 text-tertiaer transition hover:bg-flaeche-100 hover:text-primaer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          {laedt || !detail ? (
            <p className="py-8 text-center text-sm text-tertiaer">Lädt …</p>
          ) : (
            <KontaktProfil person={detail} />
          )}
        </div>
      </div>
    </dialog>
  )
})
