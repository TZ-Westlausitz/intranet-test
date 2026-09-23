"use client"

import { useRef } from "react"

import { adminModusUmschalten } from "@/lib/admin/admin-modus-aktionen"

/**
 * Schieberegler ganz rechts in der Desktop-Menüleiste — nur für die
 * Berechtigung "Admin" gerendert (siehe layout.tsx). Schickt bei jeder Änderung
 * sofort ab (`requestSubmit`), kein separater Speichern-Klick nötig. Kein
 * Pendant in der mobilen Kopfleiste — der Admin-Modus ist bewusst nur auf
 * dem Desktop erreichbar (siehe Plan).
 */
export function AdminModusSchalter({ aktiv }: { aktiv: boolean }) {
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <form ref={formRef} action={adminModusUmschalten} className="flex items-center gap-2 pl-2">
      <span className="text-xs font-medium text-sekundaer">Admin-Modus</span>
      <label className="relative inline-flex h-5 w-9 cursor-pointer items-center">
        <input
          type="checkbox"
          name="aktiv"
          defaultChecked={aktiv}
          onChange={() => formRef.current?.requestSubmit()}
          className="peer sr-only"
          aria-label="Admin-Modus umschalten"
        />
        <span className="absolute inset-0 rounded-full bg-flaeche-300 transition peer-checked:bg-marke-orange" />
        {/* bg-white bewusst literal, nicht bg-flaeche: der Regler-Knopf soll
            in beiden Farbschemata weiß bleiben (Muster jeder Toggle-UI). */}
        <span className="absolute left-0.5 h-4 w-4 translate-x-0 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
      </label>
    </form>
  )
}
