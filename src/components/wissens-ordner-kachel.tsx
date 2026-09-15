"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"

/**
 * Eine Ordner- (oder Unterordner-)Kachel — dieselbe Komponente für beide
 * Ebenen, nur mit unterschiedlichem `href`/Aktionen von der aufrufenden
 * Seite. Icon + Name sind gemeinsam der Link zum Ordnerinhalt; das
 * "⋮"-Menü (Umbenennen/Aktiv-Toggle, nur bei `darfVerwalten`) sitzt
 * darüber und stoppt seine Klicks (`stopPropagation`), damit es den Link
 * nicht mitauslöst — Muster: InfoAktionenMenu neben dem Karten-Klickbereich.
 *
 * Kein echtes Löschen (siehe Kommentar am Model WissensOrdner) — nur
 * Umbenennen (eigenes kleines `<dialog>`, immer gemountet, per Ref
 * geöffnet) und Aktiv/Inaktiv.
 */
export function WissensOrdnerKachel({
  id,
  href,
  name,
  aktiv,
  artikelAnzahl,
  darfVerwalten,
  umbenennenAktion,
  aktivSetzenAktion,
}: {
  id: string
  href: string
  name: string
  aktiv: boolean
  artikelAnzahl: number
  darfVerwalten: boolean
  umbenennenAktion: (id: string, formData: FormData) => void
  aktivSetzenAktion: (id: string, aktiv: boolean) => void
}) {
  const [menuOffen, setMenuOffen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const umbenennenDialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (!menuOffen) return

    function beiKlickAussen(ereignis: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(ereignis.target as Node)) {
        setMenuOffen(false)
      }
    }

    document.addEventListener("mousedown", beiKlickAussen)
    return () => document.removeEventListener("mousedown", beiKlickAussen)
  }, [menuOffen])

  function schliessenNachAbsenden() {
    window.setTimeout(() => umbenennenDialogRef.current?.close(), 0)
  }

  return (
    <div ref={containerRef} className="relative">
      <Link
        href={href}
        className="group flex flex-col items-center gap-2 rounded-xl p-3 text-center transition hover:bg-flaeche-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
      >
        <span className="relative">
          <Image src="/Ordner.png" alt="" width={112} height={112} className="h-28 w-28" aria-hidden="true" />
          {artikelAnzahl > 0 && (
            <span className="absolute top-0 right-0 flex h-6 min-w-6 items-center justify-center rounded-full bg-marke-grau px-1.5 text-xs font-semibold text-white">
              {artikelAnzahl}
            </span>
          )}
        </span>
        <h3 className="line-clamp-2 text-sm font-semibold text-ueberschrift group-hover:underline">{name}</h3>
      </Link>

      {darfVerwalten && (
        <div className="absolute top-1 right-1">
          <button
            type="button"
            onClick={(ereignis) => {
              ereignis.preventDefault()
              ereignis.stopPropagation()
              setMenuOffen((v) => !v)
            }}
            aria-label="Aktionen"
            aria-expanded={menuOffen}
            aria-haspopup="menu"
            className="flex h-7 w-7 items-center justify-center rounded-full text-tertiaer transition hover:bg-flaeche-100 hover:text-primaer"
          >
            ⋮
          </button>

          {menuOffen && (
            <div
              role="menu"
              onClick={(ereignis) => ereignis.stopPropagation()}
              className="absolute right-0 z-10 mt-1 w-40 overflow-hidden rounded-lg border border-rand bg-flaeche py-1 shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                onClick={(ereignis) => {
                  ereignis.preventDefault()
                  setMenuOffen(false)
                  umbenennenDialogRef.current?.showModal()
                }}
                className="block w-full px-4 py-2.5 text-left text-sm text-primaer transition hover:bg-marke-gruen/10"
              >
                Umbenennen
              </button>
              <form action={aktivSetzenAktion.bind(null, id, !aktiv)}>
                <button
                  type="submit"
                  role="menuitem"
                  className="block w-full px-4 py-2.5 text-left text-sm text-primaer transition hover:bg-flaeche-100"
                >
                  {aktiv ? "Deaktivieren" : "Aktivieren"}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      <dialog
        ref={umbenennenDialogRef}
        onClick={(ereignis) => ereignis.stopPropagation()}
        className="fixed top-1/2 left-1/2 w-full max-w-xs -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rand bg-flaeche p-0 shadow-xl backdrop:bg-neutral-900/40"
      >
        <form action={umbenennenAktion.bind(null, id)} onSubmit={schliessenNachAbsenden} className="flex flex-col">
          <div className="px-5 py-4">
            <label htmlFor={`ordner-umbenennen-${id}`} className="block text-xs font-medium text-primaer">
              Name
            </label>
            <input
              id={`ordner-umbenennen-${id}`}
              name="name"
              type="text"
              required
              defaultValue={name}
              className="mt-1 h-9 w-full rounded-lg border border-flaeche-300 px-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-rand px-5 py-3">
            <button
              type="button"
              onClick={() => umbenennenDialogRef.current?.close()}
              className="h-9 rounded-lg px-3 text-sm font-medium text-primaer transition hover:bg-flaeche-100"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="h-9 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
            >
              Speichern
            </button>
          </div>
        </form>
      </dialog>
    </div>
  )
}
