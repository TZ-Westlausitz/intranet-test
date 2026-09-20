"use client"

import { useState } from "react"

import { Passwortfeld } from "@/components/passwortfeld"
import { Hinweis } from "@/components/hinweis"

const GRUENER_RAND = "border-marke-gruen focus:border-marke-gruen"

/**
 * Client-Komponente statt zweier einfacher Passwortfelder direkt auf der
 * Seite (Rückmeldung 2026-09-18): Der grüne Rahmen bei übereinstimmenden
 * Passwörtern braucht live mitlaufenden Zustand über beide Felder hinweg —
 * das geht nicht mehr in der Server-Komponente der Seite selbst.
 */
export function PasswortAendernFormular({
  aktion,
  fehlerText,
}: {
  aktion: (formData: FormData) => void
  fehlerText?: string
}) {
  const [neuesPasswort, setNeuesPasswort] = useState("")
  const [wiederholung, setWiederholung] = useState("")

  const stimmenUeberein = neuesPasswort.length > 0 && neuesPasswort === wiederholung
  const langGenug = neuesPasswort.length >= 10

  return (
    <form action={aktion} className="mt-8 flex flex-col gap-4">
      <div>
        <Passwortfeld
          name="neuesPasswort"
          label="Neues Passwort"
          required
          minLength={10}
          autoComplete="new-password"
          value={neuesPasswort}
          onChange={setNeuesPasswort}
          randKlasse={stimmenUeberein ? GRUENER_RAND : undefined}
        />
        <p className={"mt-1 text-xs " + (langGenug ? "text-marke-gruen-dunkel" : "text-tertiaer")}>
          Mindestens 10 Zeichen
        </p>
      </div>

      <Passwortfeld
        name="passwortWiederholung"
        label="Passwort wiederholen"
        required
        minLength={10}
        autoComplete="new-password"
        value={wiederholung}
        onChange={setWiederholung}
        randKlasse={stimmenUeberein ? GRUENER_RAND : undefined}
      />

      {fehlerText && <Hinweis>{fehlerText}</Hinweis>}

      <button
        type="submit"
        className="mt-2 rounded-lg bg-marke-gruen px-4 py-2.5 font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen focus-visible:outline-offset-2"
      >
        Passwort speichern
      </button>
    </form>
  )
}
