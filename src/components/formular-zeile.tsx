"use client"

import { useRef } from "react"

import { FormularAktionenMenu } from "@/components/formular-aktionen-menu"
import { FormularBearbeitenDialog, type FormularBearbeitenDialogHandle } from "@/components/formular-bearbeiten-dialog"
import type { Person } from "@/components/termin-form-felder"
import type {
  vorlageAktivSetzen,
  vorlageDuplizieren,
  vorlageLoeschen,
  vorlageZumBearbeitenLaden,
  vorlageAktualisieren,
} from "@/lib/formulare/aktionen"
import type { alleVorlagenFuerVerwaltung } from "@/lib/formulare/abfragen"

type Vorlage = Awaited<ReturnType<typeof alleVorlagenFuerVerwaltung>>[number]

/**
 * Eine Zeile in /formulare/verwalten — Client Component, weil sowohl der
 * Titel als auch "Bearbeiten" im Drei-Punkte-Menü DENSELBEN
 * Bearbeiten-Dialog öffnen müssen (Rückmeldung 2026-09-09: "fehlt beim
 * Menü die Option Bearbeiten"). Der gemeinsame Ref sitzt deshalb hier statt
 * in einer der beiden Kind-Komponenten — genau EIN
 * `FormularBearbeitenDialog` pro Zeile, unabhängig davon, über welchen der
 * beiden Wege er geöffnet wird.
 */
export function FormularZeile({
  vorlage,
  benutzerText,
  personen,
  gruppen,
  abteilungen,
  orte,
  ladenAktion,
  aktualisierenAktion,
  aktivSetzenAktion,
  duplizierenAktion,
  loeschenAktion,
}: {
  vorlage: Vorlage
  benutzerText: string
  personen: Person[]
  gruppen: Person[]
  abteilungen: { id: string; name: string }[]
  orte: { id: string; name: string }[]
  ladenAktion: typeof vorlageZumBearbeitenLaden
  aktualisierenAktion: typeof vorlageAktualisieren
  aktivSetzenAktion: typeof vorlageAktivSetzen
  duplizierenAktion: typeof vorlageDuplizieren
  loeschenAktion: typeof vorlageLoeschen
}) {
  const bearbeitenRef = useRef<FormularBearbeitenDialogHandle>(null)

  return (
    <tr className="border-b border-flaeche-100 last:border-0">
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={() => bearbeitenRef.current?.oeffnen()}
          className="text-ueberschrift hover:underline"
        >
          {vorlage.titel}
        </button>
      </td>
      <td className="px-4 py-3 text-primaer">
        {benutzerText || <span className="text-marke-orange">Keine Nutzer</span>}
      </td>
      <td className="px-4 py-3">
        {vorlage.istEntwurf ? (
          <span className="rounded-full bg-marke-orange/15 px-2 py-0.5 text-xs font-medium text-marke-orange">
            Entwurf
          </span>
        ) : (
          <span
            className={
              "rounded-full px-2 py-0.5 text-xs font-medium " +
              (vorlage.aktiv ? "bg-marke-gruen/15 text-ueberschrift" : "bg-flaeche-200 text-sekundaer")
            }
          >
            {vorlage.aktiv ? "Aktiv" : "Inaktiv"}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <FormularAktionenMenu
          vorlageId={vorlage.id}
          aktiv={vorlage.aktiv}
          kannLoeschen={vorlage._count.einreichungen === 0}
          onBearbeitenKlick={() => bearbeitenRef.current?.oeffnen()}
          aktivSetzenAktion={aktivSetzenAktion}
          duplizierenAktion={duplizierenAktion}
          loeschenAktion={loeschenAktion}
        />
      </td>

      <FormularBearbeitenDialog
        ref={bearbeitenRef}
        vorlageId={vorlage.id}
        personen={personen}
        gruppen={gruppen}
        abteilungen={abteilungen}
        orte={orte}
        ladenAktion={ladenAktion}
        aktualisierenAktion={aktualisierenAktion}
      />
    </tr>
  )
}
