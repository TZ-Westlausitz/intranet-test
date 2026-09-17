"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Fängt eine handgezeichnete Unterschrift auf einem <canvas> ein und legt
 * sie als PNG-DataURL in einem versteckten Formularfeld ab — nur
 * Pointer-Events, keine Signatur-Bibliothek (naheliegende, langweilige
 * Lösung statt zusätzlicher Abhängigkeit, siehe CLAUDE.md).
 */
export function Unterschriftfeld({
  name,
  label,
  onGeaendert,
}: {
  name: string
  label: string
  onGeaendert?: (leer: boolean) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hiddenRef = useRef<HTMLInputElement>(null)
  const zeichnetRef = useRef(false)
  const bewegtRef = useRef(false)
  const [leer, setLeer] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvas.clientWidth * dpr
    canvas.height = canvas.clientHeight * dpr
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.lineWidth = 2.5
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = "#1f2937"
  }, [])

  function position(ev: React.PointerEvent<HTMLCanvasElement>) {
    const rect = ev.currentTarget.getBoundingClientRect()
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top }
  }

  function zeichnenStart(ev: React.PointerEvent<HTMLCanvasElement>) {
    ev.currentTarget.setPointerCapture(ev.pointerId)
    zeichnetRef.current = true
    bewegtRef.current = false
    const { x, y } = position(ev)
    const ctx = canvasRef.current?.getContext("2d")
    ctx?.beginPath()
    ctx?.moveTo(x, y)
  }

  function zeichnenWeiter(ev: React.PointerEvent<HTMLCanvasElement>) {
    if (!zeichnetRef.current) return
    bewegtRef.current = true
    const { x, y } = position(ev)
    const ctx = canvasRef.current?.getContext("2d")
    ctx?.lineTo(x, y)
    ctx?.stroke()
  }

  // Ein bloßes Antippen ohne Bewegung (z. B. beim Gerät weiterreichen,
  // siehe Hinweistext auf der unterschreibenden Seite) zeichnet nichts
  // sichtbar, würde aber ohne diese Prüfung trotzdem als "erfasst" gelten
  // und ein LEERES PNG als rechtsverbindliche Unterschrift speichern.
  function zeichnenEnde() {
    if (!zeichnetRef.current) return
    zeichnetRef.current = false
    if (!bewegtRef.current) return
    const canvas = canvasRef.current
    if (!canvas || !hiddenRef.current) return
    hiddenRef.current.value = canvas.toDataURL("image/png")
    setLeer(false)
    onGeaendert?.(false)
  }

  function loeschen() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (hiddenRef.current) hiddenRef.current.value = ""
    setLeer(true)
    onGeaendert?.(true)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <canvas
        ref={canvasRef}
        // bg-white bewusst literal: die Unterschriftfläche wird 1:1 aufs
        // PDF-Dokument übernommen (weißes Papier), unabhängig vom
        // Farbschema der App.
        className="h-40 w-full touch-none rounded-lg border border-flaeche-300 bg-white"
        onPointerDown={zeichnenStart}
        onPointerMove={zeichnenWeiter}
        onPointerUp={zeichnenEnde}
        onPointerLeave={zeichnenEnde}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-tertiaer">
          {leer ? "Noch keine Unterschrift" : "Unterschrift erfasst"}
        </span>
        <button
          type="button"
          onClick={loeschen}
          className="text-xs font-medium text-sekundaer underline hover:text-primaer"
        >
          Löschen
        </button>
      </div>
      <input ref={hiddenRef} type="hidden" name={name} />
    </div>
  )
}
