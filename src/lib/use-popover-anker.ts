import { useEffect, useRef } from "react"

/**
 * Gemeinsame Pop-over-Mechanik für Kalender und Uhrzeit-Auswahl (DatumFeld,
 * UhrzeitFeld): Das Pop-over (`popover="manual"`) liegt im Top Layer — dadurch
 * über modalen Fenstern und nicht von scrollenden Containern abgeschnitten —
 * und wird hier unter (oder, wenn dort kein Platz ist, über) dem Feld
 * positioniert. Solange es offen ist:
 *
 * - schließt ein Klick außerhalb (Feld-Knopf zählt als "innen", er schaltet selbst),
 * - schließt Escape NUR die Auswahl, nicht das umgebende Fenster (Dokument-
 *   Listener in der Capture-Phase, damit es auch ohne Fokus in der Auswahl greift),
 * - folgt die Position beim Scrollen und Ändern der Fenstergröße.
 *
 * Die Refs gehören an: `feldRef` = der Rahmen des Eingabefelds (Ankerpunkt),
 * `knopfRef` = der Knopf, der die Auswahl öffnet, `popoverRef` = das Element
 * mit `popover="manual"`. Der Aufrufer hält den Offen-Zustand.
 */
export function usePopoverAnker(offen: boolean, setzeOffen: (offen: boolean) => void) {
  const feldRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const knopfRef = useRef<HTMLButtonElement>(null)

  function positionieren() {
    const feld = feldRef.current
    const pop = popoverRef.current
    if (!feld || !pop) return
    const rand = 8
    const rect = feld.getBoundingClientRect()
    const hoehe = pop.offsetHeight
    const breite = pop.offsetWidth
    let oben = rect.bottom + 6
    if (oben + hoehe > window.innerHeight - rand && rect.top - 6 - hoehe >= rand) oben = rect.top - 6 - hoehe
    const links = Math.min(Math.max(rand, rect.left), window.innerWidth - breite - rand)
    pop.style.top = `${Math.max(rand, oben)}px`
    pop.style.left = `${links}px`
  }

  function schliessen(fokusZurueck: boolean) {
    setzeOffen(false)
    if (fokusZurueck) knopfRef.current?.focus()
  }

  useEffect(() => {
    const pop = popoverRef.current
    if (!pop) return
    if (!offen) {
      if (pop.matches(":popover-open")) pop.hidePopover()
      return
    }
    pop.showPopover()
    positionieren()
    const frame = window.requestAnimationFrame(positionieren)

    function beiKlickAussen(ereignis: PointerEvent) {
      const ziel = ereignis.target as Node
      if (pop?.contains(ziel) || knopfRef.current?.contains(ziel)) return
      setzeOffen(false)
    }
    function beiTaste(ereignis: KeyboardEvent) {
      if (ereignis.key !== "Escape") return
      ereignis.preventDefault()
      ereignis.stopPropagation()
      schliessen(true)
    }
    document.addEventListener("keydown", beiTaste, true)
    document.addEventListener("pointerdown", beiKlickAussen, true)
    window.addEventListener("resize", positionieren)
    window.addEventListener("scroll", positionieren, true)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener("keydown", beiTaste, true)
      document.removeEventListener("pointerdown", beiKlickAussen, true)
      window.removeEventListener("resize", positionieren)
      window.removeEventListener("scroll", positionieren, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offen])

  return { feldRef, popoverRef, knopfRef, schliessen }
}
