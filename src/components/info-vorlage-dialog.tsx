"use client"

import { useRef } from "react"

import { RichTextEditor } from "@/components/rich-text-editor"
import { InfoEmpfaengerAuswahl } from "@/components/info-empfaenger-auswahl"
import { FormularAenderungenSchutz } from "@/components/formular-aenderungen-schutz"
import type { Person } from "@/components/termin-form-felder"

export type InfoVorlageAnzeige = {
  id: string
  titel: string
  inhalt: string | null
  kategorieId: string | null
  mitBestaetigung: boolean
  kommentareErlaubt: boolean
  benutzbarPersonen: { personId: string }[]
  benutzbarGruppen: { gruppeId: string }[]
  benutzbarAbteilungen: { abteilungId: string }[]
}

/**
 * EIN Dialog für Anlegen UND Bearbeiten einer InfoVorlage (Muster
 * AuftragErstellenDialog, `entwurf`-Prop — inklusive des dortigen
 * Zwei-Varianten-Auslösers direkt in der Komponente: "+ Vorlage" ohne
 * `vorlage`-Prop, klickbarer Titel mit) — anders als bei
 * InfoFormFelder/InfoErstellenDialog/InfoBearbeitenDialog lohnt sich eine
 * eigene FormFelder-Datei hier nicht: nur zwei Aufrufstellen (Anlegen auf
 * /newsfeed/vorlagen, Bearbeiten in InfoVorlageZeile dort), dieselben Felder.
 *
 * "Benutzbar für" nutzt dieselbe InfoEmpfaengerAuswahl wie der Empfänger
 * auf einer echten Info — nur mit eigenen Feldnamen (benutzbarPersonen/
 * -Gruppen/-Abteilungen statt empfaengerPersonen/-Gruppen/-Abteilungen,
 * siehe `feldnamen`-Prop dort) und OHNE Pflicht-Hinweis: leer ist hier
 * ein gültiger, sogar der häufigste Zustand (siehe infoVorlageSichtbarFuer).
 */
export function InfoVorlageDialog({
  auswahl,
  erstellenAktion,
  aktualisierenAktion,
  vorlage,
}: {
  auswahl: { personen: Person[]; gruppen: Person[]; abteilungen: Person[]; kategorien: Person[] }
  erstellenAktion?: (formData: FormData) => void
  aktualisierenAktion?: (vorlageId: string, formData: FormData) => void
  vorlage?: InfoVorlageAnzeige
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const aktion = vorlage ? aktualisierenAktion!.bind(null, vorlage.id) : erstellenAktion!

  return (
    <>
      {!vorlage && (
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          className="h-9 shrink-0 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
        >
          + Vorlage
        </button>
      )}
      {vorlage && (
        <button type="button" onClick={() => dialogRef.current?.showModal()} className="text-ueberschrift hover:underline">
          {vorlage.titel}
        </button>
      )}

      <dialog
        ref={dialogRef}
        className="fixed top-1/2 left-1/2 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rand bg-flaeche p-0 shadow-xl backdrop:bg-neutral-900/40"
      >
        <form
          action={aktion}
          onSubmit={() => window.setTimeout(() => dialogRef.current?.close(), 0)}
          className="flex max-h-[85vh] flex-col"
        >
          <div className="border-b border-rand px-5 py-4">
            <h2 className="text-lg font-semibold text-ueberschrift">{vorlage ? "Vorlage bearbeiten" : "Neue Vorlage"}</h2>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
            <div>
              <label className="block text-xs font-medium text-primaer">Titel</label>
              <input
                name="titel"
                type="text"
                required
                defaultValue={vorlage?.titel ?? ""}
                className="mt-1 h-9 w-full rounded-lg border border-flaeche-300 px-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-primaer">Inhalt (optional)</label>
              <div className="mt-1">
                <RichTextEditor name="inhalt" defaultValue={vorlage?.inhalt ?? ""} mentionPersonen={auswahl.personen} />
              </div>
            </div>

            <div>
              <h3 className="text-xs font-medium text-primaer">Benutzbar für</h3>
              <div className="mt-1.5">
                <InfoEmpfaengerAuswahl
                  abteilungen={auswahl.abteilungen}
                  gruppen={auswahl.gruppen}
                  personen={auswahl.personen}
                  ausgewaehlt={{
                    abteilungen: vorlage?.benutzbarAbteilungen.map((b) => b.abteilungId) ?? [],
                    gruppen: vorlage?.benutzbarGruppen.map((b) => b.gruppeId) ?? [],
                    personen: vorlage?.benutzbarPersonen.map((b) => b.personId) ?? [],
                  }}
                  feldnamen={{
                    person: "benutzbarPersonen",
                    gruppe: "benutzbarGruppen",
                    abteilung: "benutzbarAbteilungen",
                  }}
                />
              </div>
              <p className="mt-1.5 text-xs text-sekundaer">
                Leer lassen, damit jede Person mit der Berechtigung „Infos“ die Vorlage nutzen kann.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-2 text-sm text-primaer">
                <input
                  type="checkbox"
                  name="mitBestaetigung"
                  defaultChecked={vorlage?.mitBestaetigung ?? false}
                  className="h-4 w-4 rounded border-flaeche-300"
                />
                Mit Bestätigung (jeder Empfänger muss ausdrücklich bestätigen)
              </label>
              <label className="flex items-center gap-2 text-sm text-primaer">
                <input
                  type="checkbox"
                  name="kommentareErlaubt"
                  defaultChecked={vorlage?.kommentareErlaubt ?? true}
                  className="h-4 w-4 rounded border-flaeche-300"
                />
                Kommentare erlauben
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-primaer">Kategorie (optional)</label>
              <select
                name="kategorieId"
                defaultValue={vorlage?.kategorieId ?? ""}
                className="mt-1 h-9 w-full rounded-lg border border-flaeche-300 px-2 text-sm"
              >
                <option value="">Keine</option>
                {auswahl.kategorien.map((kategorie) => (
                  <option key={kategorie.id} value={kategorie.id}>
                    {kategorie.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-rand px-5 py-4">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="h-9 rounded-lg px-3 text-sm font-medium text-primaer transition hover:bg-flaeche-100"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="h-9 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
            >
              Speichern
            </button>
          </div>
          <FormularAenderungenSchutz />
        </form>
      </dialog>
    </>
  )
}
