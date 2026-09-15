"use client"

import { useRef } from "react"

import { farbschemaAktualisieren } from "@/lib/einstellungen/aktionen"

/**
 * Schieberegler Hell/Dunkel auf der Einstellungen-Seite — schickt bei jeder
 * Änderung sofort ab (Muster: AdminModusSchalter), kein separater
 * Speichern-Klick nötig. `farbschemaAktualisieren` erwartet den Wert als
 * String "HELL"/"DUNKEL" im Feld `farbschema`, nicht als Checkbox-Bool —
 * deshalb ein verstecktes Textfeld, dessen Wert die Checkbox beim Umlegen
 * selbst setzt, statt direkt `name`/`value` auf der Checkbox zu nutzen.
 */
export function FarbschemaSchalter({ aktivDunkel }: { aktivDunkel: boolean }) {
  const formRef = useRef<HTMLFormElement>(null)
  const feldRef = useRef<HTMLInputElement>(null)

  function beiAendern(dunkel: boolean) {
    if (feldRef.current) feldRef.current.value = dunkel ? "DUNKEL" : "HELL"
    formRef.current?.requestSubmit()
  }

  return (
    <form ref={formRef} action={farbschemaAktualisieren} className="flex items-center gap-3">
      <input ref={feldRef} type="hidden" name="farbschema" defaultValue={aktivDunkel ? "DUNKEL" : "HELL"} />

      <span className={"text-sm font-medium " + (aktivDunkel ? "text-tertiaer" : "text-ueberschrift")}>Hell</span>
      <label className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center">
        <input
          type="checkbox"
          defaultChecked={aktivDunkel}
          onChange={(ereignis) => beiAendern(ereignis.target.checked)}
          className="peer sr-only"
          aria-label="Farbschema umschalten"
        />
        <span className="absolute inset-0 rounded-full bg-flaeche-300 transition peer-checked:bg-marke-gruen" />
        {/* bg-white bewusst literal, nicht bg-flaeche: der Regler-Knopf soll
            in beiden Farbschemata weiß bleiben (Muster: AdminModusSchalter). */}
        <span className="absolute left-0.5 h-5 w-5 translate-x-0 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </label>
      <span className={"text-sm font-medium " + (aktivDunkel ? "text-ueberschrift" : "text-tertiaer")}>Dunkel</span>
    </form>
  )
}
