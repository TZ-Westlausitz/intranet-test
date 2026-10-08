"use client"

import { useActionState, useEffect, useState } from "react"

import { Hinweis } from "@/components/hinweis"
import { Passwortfeld } from "@/components/passwortfeld"
import { SpeichernKnopf } from "@/components/speichern-knopf"
import { zeigeToast } from "@/components/toast-anzeige"
import type { PasswortAendernErgebnis } from "@/lib/auth/aktionen"
import { PASSWORT_MIN_LAENGE, passwortRegelnPruefen } from "@/lib/auth/passwort-regeln"

const GRUENER_RAND = "border-marke-gruen focus:border-marke-gruen"

/**
 * "Passwort ändern" am Ende des Profils (Rückmeldung 2026-10-08). Eigenes
 * Formular unter dem Profil-Formular (Formulare lassen sich nicht
 * verschachteln) mit eigenem Speichern. Verlangt das aktuelle Passwort; die
 * verbindliche Prüfung steht in eigenesPasswortAendern, die Regelanzeige hier
 * ist nur die Live-Hilfe (dieselbe wie auf /passwort-aendern).
 *
 * `onSubmit` + `useActionState` statt `<form action>`: React setzt ein Formular
 * mit action= nach jedem Absenden zurück, auch nach einem Fehler — dann wären
 * alle drei Felder leer. Hier bleiben die Eingaben bei einem Fehler stehen und
 * werden nur nach Erfolg geleert.
 */
export function PasswortAendernKarte({
  aktion,
}: {
  aktion: (vorher: PasswortAendernErgebnis | null, formData: FormData) => Promise<PasswortAendernErgebnis>
}) {
  const [ergebnis, formAktion, laeuft] = useActionState(aktion, null)

  // Die Eingaben gehören zu EINEM Speicher-Ergebnis: Nach einem Erfolg ist
  // `ergebnis` ein neues Objekt und die Felder gelten als leer — ohne dass ein
  // Effekt sie nachträglich leeren muss. Nach einem Fehler bleiben sie stehen.
  const [eingabe, setEingabe] = useState({ fuer: ergebnis, aktuell: "", neu: "", wiederholung: "" })
  const gueltig = eingabe.fuer === ergebnis || !ergebnis?.ok
  const { aktuell, neu, wiederholung } = gueltig ? eingabe : { aktuell: "", neu: "", wiederholung: "" }
  const aendern = (feld: "aktuell" | "neu" | "wiederholung", wert: string) =>
    setEingabe({ aktuell, neu, wiederholung, [feld]: wert, fuer: ergebnis })
  const setAktuell = (wert: string) => aendern("aktuell", wert)
  const setNeu = (wert: string) => aendern("neu", wert)
  const setWiederholung = (wert: string) => aendern("wiederholung", wert)

  const stimmenUeberein = neu.length > 0 && neu === wiederholung
  const regeln = passwortRegelnPruefen(neu)
  const alleRegelnErfuellt = regeln.laenge && regeln.gross && regeln.klein && regeln.zahl
  const regelListe = [
    { erfuellt: regeln.laenge, text: `Mindestens ${PASSWORT_MIN_LAENGE} Zeichen` },
    { erfuellt: regeln.gross, text: "Mindestens ein Großbuchstabe" },
    { erfuellt: regeln.klein, text: "Mindestens ein Kleinbuchstabe" },
    { erfuellt: regeln.zahl, text: "Mindestens eine Zahl" },
  ]

  useEffect(() => {
    if (!ergebnis) return
    zeigeToast(ergebnis.ok ? "Passwort geändert" : "Nicht gespeichert", ergebnis.ok ? "ok" : "fehler")
  }, [ergebnis])

  return (
    <form action={formAktion} className="mt-6 flex flex-col gap-4 rounded-xl border border-rand bg-flaeche p-4">
      <h2 className="text-base font-semibold text-ueberschrift">Passwort ändern</h2>

      <Passwortfeld
        name="aktuellesPasswort"
        label="Aktuelles Passwort"
        required
        autoComplete="current-password"
        value={aktuell}
        onChange={setAktuell}
      />

      <div>
        <Passwortfeld
          name="neuesPasswort"
          label="Neues Passwort"
          required
          minLength={PASSWORT_MIN_LAENGE}
          autoComplete="new-password"
          value={neu}
          onChange={setNeu}
          randKlasse={stimmenUeberein ? GRUENER_RAND : undefined}
        />
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
        label="Neues Passwort wiederholen"
        required
        minLength={PASSWORT_MIN_LAENGE}
        autoComplete="new-password"
        value={wiederholung}
        onChange={setWiederholung}
        randKlasse={stimmenUeberein ? GRUENER_RAND : undefined}
      />

      {ergebnis && !ergebnis.ok && ergebnis.fehler && <Hinweis>{ergebnis.fehler}</Hinweis>}

      <SpeichernKnopf
        toast={false}
        laeuft={laeuft}
        disabled={!aktuell || !alleRegelnErfuellt || !stimmenUeberein}
        className="ml-auto h-9 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel disabled:opacity-50"
      >
        Passwort speichern
      </SpeichernKnopf>
    </form>
  )
}
