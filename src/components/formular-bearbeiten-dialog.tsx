"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import { createPortal } from "react-dom"

import { FormularBaukasten } from "@/components/formular-baukasten"
import { Hinweis } from "@/components/hinweis"
import type { Person } from "@/components/termin-form-felder"
import type { vorlageZumBearbeitenLaden } from "@/lib/formulare/aktionen"

type GeladeneVorlage = NonNullable<Awaited<ReturnType<typeof vorlageZumBearbeitenLaden>>>

export type FormularBearbeitenDialogHandle = { oeffnen: () => void }

/**
 * Öffnet eine bestehende Vorlage zum Bearbeiten als Pop-Up (Rückmeldung
 * 2026-09-09: "sollte trotzdem im Pop-Up sein") — ersetzt die vormalige
 * eigene Seite `/formulare/[vorlageId]/bearbeiten`. Hat KEINEN eigenen
 * sichtbaren Auslöser (Muster InfoBearbeitenDialog) — sowohl der Titel als
 * auch "Bearbeiten" im Drei-Punkte-Menü (Rückmeldung 2026-09-09: "fehlt
 * beim Menü die Option Bearbeiten") öffnen denselben Dialog über
 * `ref.current.oeffnen()`, siehe FormularZeile.
 *
 * Der `<dialog>` wird per `createPortal` an `document.body` gehängt statt
 * an der Aufrufstelle zu bleiben — die Aufrufstelle ist eine `<tr>`-Zeile
 * (siehe FormularZeile), und ein `<dialog>` wäre dort kein gültiges
 * HTML-Kind (Tabellenzeilen erlauben nur `<td>`/`<th>`).
 *
 * Anders als beim Anlegen wird hier NICHT eager für jede Zeile geladen
 * (eine Vorlage kann viele Elemente/Optionen haben) — `ladenAktion`
 * (`vorlageZumBearbeitenLaden`) wird erst beim Öffnen aufgerufen, als
 * gewöhnlicher async Funktionsaufruf einer Server Action von einer Client
 * Component aus (funktioniert in Next.js genau wie `<form action>`, nur
 * ohne Formular drumherum). Löschen bleibt bewusst außerhalb dieses
 * Dialogs — die Zeile hat dafür schon "Löschen" im Drei-Punkte-Menü.
 */
export const FormularBearbeitenDialog = forwardRef<
  FormularBearbeitenDialogHandle,
  {
    vorlageId: string
    personen: Person[]
    gruppen: Person[]
    abteilungen: { id: string; name: string }[]
    orte: { id: string; name: string }[]
    ladenAktion: (vorlageId: string) => Promise<GeladeneVorlage | null>
    aktualisierenAktion: (vorlageId: string, formData: FormData) => void
  }
>(function FormularBearbeitenDialog({ vorlageId, personen, gruppen, abteilungen, orte, ladenAktion, aktualisierenAktion }, ref) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [geladen, setGeladen] = useState<GeladeneVorlage | null>(null)

  useImperativeHandle(ref, () => ({
    oeffnen: async () => {
      const ergebnis = await ladenAktion(vorlageId)
      if (!ergebnis) return
      setGeladen(ergebnis)
    },
  }))

  // `showModal()` erst NACH dem Mounten des <dialog> (siehe unten, portal
  // wird erst bei vorhandenem `geladen` erzeugt) — sonst wäre `dialogRef.current`
  // im selben Tick von `setGeladen` oben noch null.
  useEffect(() => {
    if (geladen) dialogRef.current?.showModal()
  }, [geladen])

  const vorlage = geladen?.vorlage
  const hatEmpfaenger =
    !!vorlage &&
    (vorlage.empfaengerPersonen.length > 0 || vorlage.empfaengerGruppen.length > 0 || vorlage.empfaengerAbteilungen.length > 0)
  const hatZielgruppe =
    !!vorlage &&
    (vorlage.benutzbarPersonen.length > 0 || vorlage.benutzbarGruppen.length > 0 || vorlage.benutzbarAbteilungen.length > 0)

  // Portal-Erzeugung selbst (nicht nur der Inhalt) hängt an `geladen` —
  // `document.body` darf erst ausgewertet werden, wenn ein echter Klick
  // (über `oeffnen()`) das ausgelöst hat, nie beim serverseitigen Rendern.
  // Sonst wirft Next.js beim SSR "document is not defined" (Rückmeldung
  // 2026-09-09, Fehlermeldung nach Absenden eines Formulars).
  if (!geladen || !vorlage) return null

  return createPortal(
    <dialog
      ref={dialogRef}
      onClose={() => setGeladen(null)}
      className="fixed top-1/2 left-1/2 max-h-[90vh] w-[95vw] max-w-6xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-neutral-200 p-6 shadow-xl backdrop:bg-neutral-900/40"
    >
      <h2 className="mb-4 text-lg font-semibold text-marke-grau">Formular bearbeiten</h2>

      {(!hatEmpfaenger || !hatZielgruppe) && (
        <div className="mb-4">
          <Hinweis>
            {!hatEmpfaenger && !hatZielgruppe
              ? "Noch kein Empfänger und noch keine Zielgruppe eingetragen — bitte unten bei Empfänger und „Benutzbar für“ jeweils mindestens eine Person, Gruppe oder Abteilung wählen. Ohne Zielgruppe lässt sich diese Vorlage nicht speichern, ohne Empfänger nicht aktivieren."
              : !hatEmpfaenger
                ? "Noch kein Empfänger eingetragen — bitte unten mindestens eine Person, Gruppe oder Abteilung wählen, bevor diese Vorlage aktiviert werden kann."
                : "Noch keine Zielgruppe bei „Benutzbar für“ eingetragen — bitte unten mindestens eine Person, Gruppe oder Abteilung wählen, sonst lässt sich diese Vorlage nicht speichern."}
          </Hinweis>
        </div>
      )}

      <FormularBaukasten
        vorlage={{
          titel: vorlage.titel,
          beschreibung: vorlage.beschreibung,
          pdfExport: vorlage.pdfExport,
          elemente: vorlage.elemente,
          empfaengerPersonen: vorlage.empfaengerPersonen.map((e) => e.personId),
          empfaengerGruppen: vorlage.empfaengerGruppen.map((e) => e.gruppeId),
          empfaengerAbteilungen: vorlage.empfaengerAbteilungen.map((e) => e.abteilungId),
          benutzbarPersonen: vorlage.benutzbarPersonen.map((b) => b.personId),
          benutzbarGruppen: vorlage.benutzbarGruppen.map((b) => b.gruppeId),
          benutzbarAbteilungen: vorlage.benutzbarAbteilungen.map((b) => b.abteilungId),
        }}
        bearbeitbar={!geladen.hatEinreichungen}
        personen={personen}
        gruppen={gruppen}
        abteilungen={abteilungen}
        orte={orte}
        speichernAktion={aktualisierenAktion.bind(null, vorlageId)}
        dialogRef={dialogRef}
      />
    </dialog>,
    document.body,
  )
})
