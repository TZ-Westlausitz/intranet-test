"use client"

import { useRef } from "react"

import { RichTextEditor } from "@/components/rich-text-editor"
import { InfoEmpfaengerAuswahl } from "@/components/info-empfaenger-auswahl"
import { FormularAenderungenSchutz } from "@/components/formular-aenderungen-schutz"
import { AUFGABE_PRIORITAETEN } from "@/lib/aufgaben-optionen"
import type { Person } from "@/components/termin-form-felder"
import { SpeichernKnopf } from "@/components/speichern-knopf"

export type AufgabenVorlageAnzeige = {
  id: string
  titel: string
  beschreibung: string | null
  prioritaet: string
  faelligInTagen: number | null
  benutzbarPersonen: { personId: string }[]
  benutzbarGruppen: { gruppeId: string }[]
  benutzbarAbteilungen: { abteilungId: string }[]
}

/** EIN Dialog für Anlegen UND Bearbeiten einer AufgabenVorlage — Muster InfoVorlageDialog (Zwei-Varianten-Auslöser direkt in der Komponente). */
export function AufgabenVorlageDialog({
  auswahl,
  erstellenAktion,
  aktualisierenAktion,
  vorlage,
}: {
  auswahl: { personen: Person[]; gruppen: Person[]; abteilungen: Person[] }
  erstellenAktion?: (formData: FormData) => void
  aktualisierenAktion?: (vorlageId: string, formData: FormData) => void
  vorlage?: AufgabenVorlageAnzeige
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
        className="fixed top-1/2 left-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rand bg-flaeche p-0 shadow-xl backdrop:bg-neutral-900/40"
      >
        <form
          action={aktion}
          onSubmit={() => window.setTimeout(() => dialogRef.current?.close(), 0)}
          className="flex max-h-[85vh] flex-col"
        >
          <div className="border-b border-rand px-5 py-4">
            <h2 className="text-lg font-semibold text-ueberschrift">{vorlage ? "Vorlage bearbeiten" : "Neue Vorlage"}</h2>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
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
              <label className="block text-xs font-medium text-primaer">Notizen (optional)</label>
              <div className="mt-1">
                <RichTextEditor name="beschreibung" defaultValue={vorlage?.beschreibung ?? ""} />
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-primaer">Fällig in Tagen (optional)</label>
                <input
                  name="faelligInTagen"
                  type="number"
                  min={0}
                  defaultValue={vorlage?.faelligInTagen ?? ""}
                  placeholder="z. B. 3"
                  className="mt-1 h-9 w-28 rounded-lg border border-flaeche-300 px-2 text-sm"
                />
              </div>

              <fieldset>
                <legend className="text-xs font-medium text-primaer">Priorität</legend>
                <div className="mt-1.5 flex gap-2">
                  {AUFGABE_PRIORITAETEN.map((prioritaet) => (
                    <label key={prioritaet.wert} className="flex cursor-pointer items-center gap-1.5" title={prioritaet.name}>
                      <input
                        type="radio"
                        name="prioritaet"
                        value={prioritaet.wert}
                        defaultChecked={prioritaet.wert === (vorlage?.prioritaet ?? "MITTEL")}
                        className="peer sr-only"
                      />
                      <span
                        className={
                          "flex h-7 w-7 items-center justify-center rounded-full ring-offset-2 peer-checked:ring-2 peer-checked:ring-marke-grau peer-focus-visible:ring-2 " +
                          prioritaet.klasse
                        }
                      />
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            <p className="-mt-2 text-xs text-sekundaer">
              Wird beim Verwenden in ein konkretes Datum (heute + diese Anzahl Tage) umgerechnet, danach frei änderbar.
            </p>

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
                Leer lassen, damit jede Person mit der Berechtigung „Aufgaben“ die Vorlage nutzen kann.
              </p>
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
            <SpeichernKnopf
              type="submit"
              className="h-9 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
            >
              Speichern
            </SpeichernKnopf>
          </div>
          <FormularAenderungenSchutz />
        </form>
      </dialog>
    </>
  )
}
