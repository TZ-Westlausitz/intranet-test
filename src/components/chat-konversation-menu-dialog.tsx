"use client"

import { useRef } from "react"
import { Archive, Bell, BellOff, Info, LogOut, Users, X } from "lucide-react"

import { PersonenAuswahl } from "@/components/personen-auswahl"

export type GruppenMitgliedAnzeige = { personId: string; name: string; istAdmin: boolean }

/**
 * Info-Knopf (ⓘ) oben rechts neben dem Konversationsnamen öffnet ein Pop-Up
 * mit Stummschalten/Archivieren (Rückmeldung 2026-09-24, Vorbild Überblick
 * — zuerst war der Name selbst anklickbar, das Symbol oben rechts trifft
 * das Vorbild genauer) — für JEDE Konversation gerendert, auch
 * Direktnachrichten (`istGruppe: false` blendet dort nur Mitgliederliste/
 * Gruppen-Symbol/"Chat verlassen" aus).
 *
 * Mitgliederliste + Verwalten (hinzufügen/entfernen/Adminrechte vergeben)
 * ist nur sichtbar, wenn `binAdmin` stimmt — die eigentliche Prüfung liegt
 * serverseitig in den jeweiligen Aktionen (Regel 5: ein ausgeblendeter
 * Knopf ist keine Zugriffskontrolle), hier nur ausgeblendet für alle
 * anderen Mitglieder. Jeder Gruppenadmin hat dieselben Rechte wie die
 * erstellende Person, siehe gruppeAdminMachen — kein Unterschied in dieser
 * Komponente. `binAdmin` ist beim automatischen Abteilungs-Gruppenchat
 * IMMER false (siehe page.tsx) — dessen Mitgliederliste ist reine Ansicht,
 * verwaltet wird sie weiterhin über /admin/gruppen. Aus demselben Grund
 * gibt es "Chat verlassen" (`kannVerlassen`) nur bei einer frei angelegten
 * Gruppe — bei Direktnachricht/automatischem Gruppenchat wäre das Verb
 * irreführend (siehe gruppeVerlassen).
 */
export function ChatKonversationMenuDialog({
  titel,
  konversationId,
  istGruppe,
  mitglieder,
  kandidaten,
  binAdmin,
  kannVerlassen,
  stumm,
  istArchiviert,
  hinzufuegenAktion,
  entfernenAktion,
  adminMachenAktion,
  stummSchaltenAktion,
  archivierenAktion,
  verlassenAktion,
}: {
  titel: string
  konversationId: string
  istGruppe: boolean
  mitglieder: GruppenMitgliedAnzeige[]
  kandidaten: { id: string; name: string }[]
  binAdmin: boolean
  kannVerlassen: boolean
  stumm: boolean
  istArchiviert: boolean
  hinzufuegenAktion: (konversationId: string, formData: FormData) => void
  entfernenAktion: (konversationId: string, personId: string) => void
  adminMachenAktion: (konversationId: string, personId: string) => void
  stummSchaltenAktion: (konversationId: string, stumm: boolean) => void
  archivierenAktion: (konversationId: string, archiviert: boolean) => void
  verlassenAktion: (konversationId: string) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-ueberschrift">
          {istGruppe && <Users className="h-6 w-6 shrink-0 text-sekundaer" aria-hidden />}
          {titel}
        </h1>
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          aria-label="Chat-Einstellungen"
          title="Chat-Einstellungen"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-tertiaer transition hover:bg-flaeche-100"
        >
          <Info className="h-5 w-5" />
        </button>
      </div>

      <dialog
        ref={dialogRef}
        className="fixed top-1/2 left-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rand bg-flaeche p-0 shadow-xl backdrop:bg-neutral-900/40"
      >
        <div className="border-b border-rand px-5 py-4">
          <h2 className="text-lg font-semibold text-ueberschrift">{titel}</h2>
          {istGruppe && (
            <p className="mt-0.5 text-xs text-tertiaer">
              {mitglieder.length} Mitglied{mitglieder.length === 1 ? "" : "er"}
            </p>
          )}
        </div>

        <div className="max-h-[65vh] overflow-y-auto text-sm">
          <div className="flex flex-col divide-y divide-flaeche-100 border-b border-flaeche-100">
            <form action={stummSchaltenAktion.bind(null, konversationId, !stumm)}>
              <button
                type="submit"
                className="flex w-full items-center justify-between px-5 py-3 text-left text-primaer transition hover:bg-flaeche-schwach"
              >
                <span>{stumm ? "Stummschaltung aufheben" : "Stummschalten"}</span>
                {stumm ? <Bell className="h-4 w-4 text-tertiaer" aria-hidden /> : <BellOff className="h-4 w-4 text-tertiaer" aria-hidden />}
              </button>
            </form>
            <form action={archivierenAktion.bind(null, konversationId, !istArchiviert)}>
              <button
                type="submit"
                className="flex w-full items-center justify-between px-5 py-3 text-left text-primaer transition hover:bg-flaeche-schwach"
              >
                <span>{istArchiviert ? "Aus dem Archiv holen" : "Chat archivieren"}</span>
                <Archive className="h-4 w-4 text-tertiaer" aria-hidden />
              </button>
            </form>
            {kannVerlassen && (
              <form
                action={verlassenAktion.bind(null, konversationId)}
                onSubmit={(ereignis) => {
                  if (!confirm(`"${titel}" wirklich verlassen?`)) ereignis.preventDefault()
                }}
              >
                <button
                  type="submit"
                  className="flex w-full items-center justify-between px-5 py-3 text-left text-red-600 transition hover:bg-red-50"
                >
                  <span>Chat verlassen</span>
                  <LogOut className="h-4 w-4" aria-hidden />
                </button>
              </form>
            )}
          </div>

          {istGruppe && (
            <div className="px-5 py-4">
              <ul className="flex flex-col divide-y divide-flaeche-100">
                {mitglieder.map((mitglied) => (
                  <li key={mitglied.personId} className="flex items-center justify-between gap-2 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-primaer">{mitglied.name}</span>
                      {mitglied.istAdmin && (
                        <span className="rounded-full bg-marke-gruen/15 px-2 py-0.5 text-xs font-medium text-marke-gruen-dunkel">
                          Admin
                        </span>
                      )}
                    </div>

                    {binAdmin && (
                      <div className="flex shrink-0 items-center gap-1">
                        {!mitglied.istAdmin && (
                          <form action={adminMachenAktion.bind(null, konversationId, mitglied.personId)}>
                            <button
                              type="submit"
                              className="rounded-lg px-2 py-1 text-xs font-medium text-sekundaer transition hover:bg-flaeche-100"
                            >
                              Zum Admin machen
                            </button>
                          </form>
                        )}
                        <form action={entfernenAktion.bind(null, konversationId, mitglied.personId)}>
                          <button
                            type="submit"
                            aria-label={`${mitglied.name} entfernen`}
                            className="rounded p-1 text-tertiaer transition hover:bg-red-50 hover:text-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </form>
                      </div>
                    )}
                  </li>
                ))}
              </ul>

              {binAdmin && kandidaten.length > 0 && (
                <form
                  action={hinzufuegenAktion.bind(null, konversationId)}
                  className="mt-3 flex items-end gap-2 border-t border-flaeche-100 pt-3"
                >
                  <div className="flex-1">
                    <label htmlFor="chat-gruppe-hinzufuegen-suche" className="block text-xs font-medium text-primaer">
                      Mitglied hinzufügen
                    </label>
                    <div className="mt-1">
                      <PersonenAuswahl
                        personen={kandidaten}
                        ausgewaehlteIds={[]}
                        name="mitglieder"
                        id="chat-gruppe-hinzufuegen"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="h-9 shrink-0 rounded-lg bg-flaeche-100 px-3 text-sm font-medium text-primaer transition hover:bg-flaeche-200"
                  >
                    Hinzufügen
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-rand px-5 py-4">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="h-9 rounded-lg px-3 text-sm font-medium text-primaer transition hover:bg-flaeche-100"
          >
            Schließen
          </button>
        </div>
      </dialog>
    </>
  )
}
