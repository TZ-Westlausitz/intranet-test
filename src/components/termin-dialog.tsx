"use client"

import { useRef, useState } from "react"

import { TerminFormFelder, LEERE_TERMIN_STANDARDWERTE, type Person } from "@/components/termin-form-felder"
import { datumIsoAusDate, zeitAusDate } from "@/lib/datum"

/** Rundet "jetzt" auf die nächste volle Stunde auf (14:03 → 15:00, 14:00:00 genau bleibt 14:00). */
function naechsteVolleStundeAb(jetzt: Date): Date {
  const ergebnis = new Date(jetzt)
  ergebnis.setSeconds(0, 0)
  if (ergebnis.getMinutes() > 0) {
    ergebnis.setMinutes(0)
    ergebnis.setHours(ergebnis.getHours() + 1)
  }
  return ergebnis
}

/**
 * Start-/Endvoreinstellung für einen neuen Termin: nächste volle Stunde ab
 * jetzt, Ende 30 Minuten später — genau wie die Endzeit-Nachführung beim
 * händischen Ändern der Startzeit in TerminFormFelder (`beiVonAendern`).
 * Läuft spät abends die volle Stunde über Mitternacht (z. B. 23:40 → 0:00),
 * rollt `setHours` das Datum von selbst auf den nächsten Tag weiter —
 * `datum` folgt hier also der berechneten Startzeit, nicht dem Tag, an dem
 * das Pop-Up geöffnet wurde.
 */
function voreingestellteZeiten() {
  const start = naechsteVolleStundeAb(new Date())
  const ende = new Date(start.getTime() + 30 * 60 * 1000)
  return { datum: datumIsoAusDate(start), von: zeitAusDate(start), bis: zeitAusDate(ende) }
}

/**
 * Button "+ Termin hinzufügen" plus das Pop-Up-Fenster dahinter — natives
 * `<dialog>`-Element statt einer selbstgebauten Overlay-Konstruktion:
 * Tastatur (Esc schließt), Fokus-Falle und Hintergrund-Abdunklung kommen
 * dafür kostenlos vom Browser mit. Die Positionierung (fixed + zentriert)
 * setzen wir trotzdem explizit — der Browser würde das bei `showModal()`
 * zwar von sich aus per UA-Stylesheet-Margin tun, aber Tailwinds Reset
 * setzt Margins global auf 0 und hebelt das sonst aus.
 *
 * `rueckkehrJahr`/`rueckkehrMonat` wandern als versteckte Felder mit, damit
 * die Server Action nach dem Anlegen zur gerade angezeigten Monatsansicht
 * zurückspringt, statt auf den aktuellen Monat zu springen.
 *
 * Die eigentlichen Felder stecken in TerminFormFelder — geteilt mit dem
 * Bearbeiten-Pop-Up (siehe TerminBearbeitenDialog), damit es nicht zwei
 * Kopien desselben Formulars gibt. `wiederholenAnzeigen` blendet die
 * "Wiederholen"-Felder nur hier ein, nicht beim Bearbeiten: Die Server
 * Action erzeugt daraus einmalig mehrere eigenständige Termine (siehe
 * terminErstellen) — beim Bearbeiten eines bereits angelegten Termins
 * ergibt eine Wiederholungsregel keinen Sinn mehr, jede Zeile der Serie
 * ist danach für sich bearbeitbar.
 *
 * Datum/Uhrzeit-Voreinstellung wird erst beim Öffnen berechnet (nicht
 * schon beim Laden der Kalenderseite) und über einen wechselnden `key` auf
 * TerminFormFelder erzwungen neu gemountet — sonst bliebe "jetzt" auf dem
 * Stand des Seitenaufrufs eingefroren, wenn die Seite länger offen ist,
 * bevor das Pop-Up tatsächlich geöffnet wird.
 */
export function TerminDialog({
  personen,
  aktion,
  rueckkehrJahr,
  rueckkehrMonat,
}: {
  personen: Person[]
  aktion: (formData: FormData) => void
  rueckkehrJahr: number
  rueckkehrMonat: number
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [formKey, setFormKey] = useState(0)
  const [zeiten, setZeiten] = useState(voreingestellteZeiten)

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setZeiten(voreingestellteZeiten())
          setFormKey((wert) => wert + 1)
          dialogRef.current?.showModal()
        }}
        className="flex h-9 items-center gap-1.5 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
      >
        + Termin hinzufügen
      </button>

      <dialog
        ref={dialogRef}
        className="fixed top-1/2 left-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-200 p-0 shadow-xl backdrop:bg-neutral-900/40"
      >
        <form
          action={aktion}
          onSubmit={() => window.setTimeout(() => dialogRef.current?.close(), 0)}
          className="flex max-h-[85vh] flex-col"
        >
          <div className="border-b border-neutral-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-marke-grau">Termin hinzufügen</h2>
          </div>

          <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
            <TerminFormFelder
              key={formKey}
              personen={personen}
              standardwerte={{ ...LEERE_TERMIN_STANDARDWERTE, ...zeiten }}
              wiederholenAnzeigen
            />

            <input type="hidden" name="rueckkehrJahr" value={rueckkehrJahr} />
            <input type="hidden" name="rueckkehrMonat" value={rueckkehrMonat} />
          </div>

          <div className="flex justify-end gap-2 border-t border-neutral-200 px-5 py-4">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="h-9 rounded-lg px-3 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="h-9 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
            >
              Termin erstellen
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}
