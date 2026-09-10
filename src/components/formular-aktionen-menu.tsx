"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

import type { vorlageAktivSetzen, vorlageDuplizieren, vorlageLoeschen } from "@/lib/formulare/aktionen"

/**
 * Drei-Punkte-Menü auf einer Formular-Zeile in /formulare/verwalten —
 * Bearbeiten/Duplizieren/Aktivieren-Deaktivieren/Löschen, statt einzelner
 * Links nebeneinander (Rückmeldung 2026-09-09: "wirkt aufgeräumter").
 * "Bearbeiten" öffnet denselben Dialog wie ein Klick auf den Titel der
 * Zeile (siehe FormularBearbeitenDialog/FormularZeile) — `onBearbeitenKlick`
 * kommt deshalb von dort statt einen zweiten, unabhängigen Dialog
 * aufzuspannen. Muster: ArtikelAktionenMenu/InfoAktionenMenu, mit einem
 * Unterschied: das Menü wird per `createPortal` an `document.body`
 * gehängt statt neben dem Knopf zu bleiben. Grund: die Tabelle steht in
 * einem `overflow-x-auto`-Wrapper (fürs seitliche Scrollen auf schmalen
 * Bildschirmen) — CSS erzwingt dadurch automatisch auch `overflow-y:
 * auto`, was ein absolut positioniertes Menü an der letzten Zeile
 * abgeschnitten hätte. Der Portal umgeht das, ähnlich wie beim
 * Bearbeiten-Dialog in TerminBearbeitenDialog — hier aber ohne dessen
 * `mounted`-Flag: `document.body` wird erst ausgewertet, wenn `offen`
 * (durch einen echten Klick, also garantiert im Browser) true wird, nie
 * beim serverseitigen Rendern. Schließt sich zusätzlich bei Scroll/Resize,
 * weil die feste Position sonst nicht mehr zum Knopf passen würde.
 * "Löschen" ist grau/deaktiviert, sobald die Vorlage Einreichungen hat —
 * echtes Löschen bleibt dann unmöglich (siehe vorlageLoeschen), nur noch
 * Deaktivieren.
 */
export function FormularAktionenMenu({
  vorlageId,
  aktiv,
  kannLoeschen,
  onBearbeitenKlick,
  aktivSetzenAktion,
  duplizierenAktion,
  loeschenAktion,
}: {
  vorlageId: string
  aktiv: boolean
  kannLoeschen: boolean
  onBearbeitenKlick: () => void
  aktivSetzenAktion: typeof vorlageAktivSetzen
  duplizierenAktion: typeof vorlageDuplizieren
  loeschenAktion: typeof vorlageLoeschen
}) {
  const [offen, setOffen] = useState(false)
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!offen) return

    function beiKlickAussen(ereignis: MouseEvent) {
      const ziel = ereignis.target as Node
      if (buttonRef.current?.contains(ziel) || menuRef.current?.contains(ziel)) return
      setOffen(false)
    }
    function beiSchliessenAuslöser() {
      setOffen(false)
    }

    document.addEventListener("mousedown", beiKlickAussen)
    window.addEventListener("scroll", beiSchliessenAuslöser, true)
    window.addEventListener("resize", beiSchliessenAuslöser)
    return () => {
      document.removeEventListener("mousedown", beiKlickAussen)
      window.removeEventListener("scroll", beiSchliessenAuslöser, true)
      window.removeEventListener("resize", beiSchliessenAuslöser)
    }
  }, [offen])

  function umschalten() {
    if (offen) {
      setOffen(false)
      return
    }
    const rechteck = buttonRef.current?.getBoundingClientRect()
    if (rechteck) setPosition({ top: rechteck.bottom + 4, right: window.innerWidth - rechteck.right })
    setOffen(true)
  }

  const menu = offen && position && (
    <div
      ref={menuRef}
      role="menu"
      style={{ position: "fixed", top: position.top, right: position.right }}
      onClick={(ereignis) => ereignis.stopPropagation()}
      className="z-20 w-44 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
    >
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          setOffen(false)
          onBearbeitenKlick()
        }}
        className="block w-full px-4 py-2.5 text-left text-sm text-neutral-600 transition hover:bg-marke-gruen/10"
      >
        Bearbeiten
      </button>
      <form action={duplizierenAktion.bind(null, vorlageId)}>
        <button
          type="submit"
          role="menuitem"
          className="block w-full px-4 py-2.5 text-left text-sm text-neutral-600 transition hover:bg-marke-gruen/10"
        >
          Duplizieren
        </button>
      </form>
      <form action={aktivSetzenAktion.bind(null, vorlageId, !aktiv)}>
        <button
          type="submit"
          role="menuitem"
          className="block w-full px-4 py-2.5 text-left text-sm text-neutral-600 transition hover:bg-marke-gruen/10"
        >
          {aktiv ? "Deaktivieren" : "Aktivieren"}
        </button>
      </form>
      {kannLoeschen ? (
        <form action={loeschenAktion.bind(null, vorlageId)}>
          <button
            type="submit"
            role="menuitem"
            className="block w-full px-4 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50"
          >
            Löschen
          </button>
        </form>
      ) : (
        <span
          role="menuitem"
          aria-disabled="true"
          title="Nur löschbar, solange es keine Einreichungen gibt — mit Einreichungen nur noch deaktivierbar."
          className="block w-full cursor-not-allowed px-4 py-2.5 text-left text-sm text-neutral-300"
        >
          Löschen
        </span>
      )}
    </div>
  )

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(ereignis) => {
          ereignis.preventDefault()
          ereignis.stopPropagation()
          umschalten()
        }}
        aria-label="Aktionen"
        aria-expanded={offen}
        aria-haspopup="menu"
        className="flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
      >
        ⋮
      </button>

      {menu && createPortal(menu, document.body)}
    </>
  )
}
