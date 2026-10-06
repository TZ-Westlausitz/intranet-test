"use client"

import { useState } from "react"

import { Passwortfeld } from "@/components/passwortfeld"
import { Hinweis } from "@/components/hinweis"
import { FormularAenderungenSchutz } from "@/components/formular-aenderungen-schutz"
import { PASSWORT_MIN_LAENGE, passwortRegelnPruefen } from "@/lib/auth/passwort-regeln"
import { SpeichernKnopf } from "@/components/speichern-knopf"

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
  const regeln = passwortRegelnPruefen(neuesPasswort)
  const alleRegelnErfuellt = regeln.laenge && regeln.gross && regeln.klein && regeln.zahl
  const regelListe = [
    { erfuellt: regeln.laenge, text: `Mindestens ${PASSWORT_MIN_LAENGE} Zeichen` },
    { erfuellt: regeln.gross, text: "Mindestens ein Großbuchstabe" },
    { erfuellt: regeln.klein, text: "Mindestens ein Kleinbuchstabe" },
    { erfuellt: regeln.zahl, text: "Mindestens eine Zahl" },
  ]

  return (
    <form action={aktion} className="mt-8 flex flex-col gap-4">
      <div>
        <Passwortfeld
          name="neuesPasswort"
          label="Neues Passwort"
          required
          minLength={PASSWORT_MIN_LAENGE}
          autoComplete="new-password"
          value={neuesPasswort}
          onChange={setNeuesPasswort}
          randKlasse={stimmenUeberein ? GRUENER_RAND : undefined}
        />
        {/* Live-Anzeige der Regeln; verbindlich prüft der Server (und kennt als
            Einziger das Startpasswort, das nicht verwendet werden darf). */}
        <ul className="mt-1.5 flex flex-col gap-0.5 text-xs" aria-label="Passwortregeln">
          {regelListe.map((regel) => (
            <li key={regel.text} className={regel.erfuellt ? "text-marke-gruen-dunkel" : "text-tertiaer"}>
              {regel.erfuellt ? "✓" : "○"} {regel.text}
            </li>
          ))}
          <li className="text-tertiaer">○ Nicht das Startpasswort</li>
        </ul>
      </div>

      <Passwortfeld
        name="passwortWiederholung"
        label="Passwort wiederholen"
        required
        minLength={PASSWORT_MIN_LAENGE}
        autoComplete="new-password"
        value={wiederholung}
        onChange={setWiederholung}
        randKlasse={stimmenUeberein ? GRUENER_RAND : undefined}
      />

      {fehlerText && <Hinweis>{fehlerText}</Hinweis>}

      <SpeichernKnopf
        type="submit"
        disabled={!alleRegelnErfuellt || !stimmenUeberein}
        className="mt-2 rounded-lg bg-marke-gruen px-4 py-2.5 disabled:opacity-50 font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen focus-visible:outline-offset-2"
      >
        Passwort speichern
      </SpeichernKnopf>
      <FormularAenderungenSchutz />
    </form>
  )
}
