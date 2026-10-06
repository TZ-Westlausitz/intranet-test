"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Check } from "lucide-react"

type Toast = { id: number; text: string; art: "ok" | "fehler" }

const EREIGNIS = "tpz:toast"

/**
 * Löst die kleine Einblendung am unteren Bildschirmrand aus (Rückmeldung
 * 2026-10-06: bei Speichern-Knöpfen war nicht erkennbar, ob etwas passiert
 * ist). Funktioniert aus jeder Client-Komponente über ein Browser-Ereignis,
 * ohne dass ein Zustand durchgereicht werden muss — und überlebt, wenn das
 * Pop-Up mit dem Knopf direkt danach schließt.
 */
export function zeigeToast(text: string, art: "ok" | "fehler" = "ok") {
  window.dispatchEvent(new CustomEvent(EREIGNIS, { detail: { text, art } }))
}

/**
 * Einmal im Root-Layout eingehängt. `role="status"` (bzw. `alert` bei
 * Fehlern) lässt Screenreader den Text vorlesen. Steht auf dem Handy über der
 * Tab-Leiste, am Desktop unten mittig.
 */
export function ToastAnzeige() {
  const [toast, setToast] = useState<Toast | null>(null)

  useEffect(() => {
    let zaehler = 0
    let timer: number | undefined

    function beiToast(ereignis: Event) {
      const { text, art } = (ereignis as CustomEvent<{ text: string; art: "ok" | "fehler" }>).detail
      window.clearTimeout(timer)
      setToast({ id: ++zaehler, text, art })
      timer = window.setTimeout(() => setToast(null), art === "fehler" ? 5000 : 2500)
    }

    window.addEventListener(EREIGNIS, beiToast)
    return () => {
      window.removeEventListener(EREIGNIS, beiToast)
      window.clearTimeout(timer)
    }
  }, [])

  if (!toast) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[100] flex justify-center px-4 md:bottom-8">
      <div
        key={toast.id}
        role={toast.art === "fehler" ? "alert" : "status"}
        className={
          "pointer-events-auto flex max-w-sm items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg " +
          (toast.art === "fehler" ? "bg-red-600 text-white" : "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900")
        }
      >
        {toast.art === "fehler" ? (
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <Check className="h-4 w-4 shrink-0 text-marke-gruen" aria-hidden />
        )}
        {toast.text}
      </div>
    </div>
  )
}
