"use client"

import { useEffect, useRef, useState } from "react"
import { Info } from "lucide-react"

/**
 * Kleines Info-Symbol mit einem Erklärtext dahinter, damit Formulare kurz
 * bleiben (Rückmeldung 2026-10-05). Am Desktop zeigt schon das Überfahren
 * den Text (`title`), am Handy öffnet ein Tipp eine kleine Sprechblase —
 * Tooltips allein gibt es dort nicht. Ein Tipp daneben oder Escape schließt sie.
 */
export function InfoHinweis({ text, className = "" }: { text: string; className?: string }) {
  const [offen, setOffen] = useState(false)
  const huelleRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!offen) return
    function beiKlick(ereignis: MouseEvent) {
      if (!huelleRef.current?.contains(ereignis.target as Node)) setOffen(false)
    }
    function beiTaste(ereignis: KeyboardEvent) {
      if (ereignis.key === "Escape") {
        // Nur die Sprechblase schließen, nicht den Dialog darunter.
        ereignis.stopPropagation()
        setOffen(false)
      }
    }
    document.addEventListener("click", beiKlick)
    document.addEventListener("keydown", beiTaste, true)
    return () => {
      document.removeEventListener("click", beiKlick)
      document.removeEventListener("keydown", beiTaste, true)
    }
  }, [offen])

  return (
    <span ref={huelleRef} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        title={text}
        aria-label="Hinweis anzeigen"
        aria-expanded={offen}
        onClick={() => setOffen((bisher) => !bisher)}
        className="flex h-5 w-5 items-center justify-center rounded-full text-tertiaer transition hover:text-primaer focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
      </button>
      {offen && (
        <span
          role="note"
          className="absolute top-full left-0 z-20 mt-1 w-64 max-w-[calc(100vw-4rem)] rounded-lg border border-rand bg-flaeche px-3 py-2 text-xs font-normal text-sekundaer shadow-lg"
        >
          {text}
        </span>
      )}
    </span>
  )
}
