"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { AlertTriangle, Check, Paperclip, Pencil, X } from "lucide-react"

import { AuftragKommentare, type AuftragKommentarAnzeige } from "@/components/auftrag-kommentare"
import { AuftragFormFelder } from "@/components/auftrag-form-felder"
import type { AuftragStandardwerte } from "@/lib/auftraege/standardwerte"
import { FormularAenderungenSchutz } from "@/components/formular-aenderungen-schutz"
import { AUFGABE_PRIORITAET_KLASSEN, AUFGABE_PRIORITAET_NAMEN } from "@/lib/aufgaben-optionen"
import { AUFGABE_STATUS_KLASSEN, AUFGABE_STATUS_NAMEN } from "@/lib/projekte-optionen"

export type AuftragDialogDaten = {
  id: string
  titel: string
  /** Bereinigtes HTML aus dem Rich-Text-Editor (siehe richTextSanitisieren). */
  beschreibung: string | null
  prioritaet: string
  status: string
  /** "2026-11-20" */
  faelligAm: string | null
  /** Schon fertig formatiert, z. B. "Fr., 02.10." */
  faelligText: string | null
  ueberfaellig: boolean
  erledigtText: string | null
  vonName: string
  anName: string
  /** Mehrere Empfänger arbeiten gemeinsam an dieser einen Aufgabe. */
  gemeinsam: boolean
  anhaenge: { id: string; dateiname: string; groesseBytes: number; mimetyp: string }[]
  checkpunkte: { id: string; text: string; erledigt: boolean }[]
  kommentare: AuftragKommentarAnzeige[]
}

/**
 * Pop-Up zu einer Aufgabe (intern Auftrag), geöffnet per Klick auf die
 * Listenzeile (`children` = die klickbare Zeile) oder automatisch über
 * `?auftrag=<id>` (Benachrichtigungen, Startseiten-Kachel). Zeigt alles auf
 * einen Blick: Titel, Status, Fälligkeit, Beschreibung, Anhänge und die
 * Kommentare. Die zugewiesene Person kann hier annehmen/erledigen, die
 * erstellende Person bearbeiten (Titel, Beschreibung, Fälligkeit, Priorität,
 * Anhänge hinzufügen/entfernen) oder die Aufgabe zurückziehen.
 *
 * Die Aktionen kommen als Server Actions von der Seite; die Berechtigung
 * prüft jede davon selbst (Regel 5) — die Knöpfe hier blenden nur aus, was
 * die Person ohnehin nicht darf.
 */
export function AuftragDialog({
  daten,
  alsErsteller,
  alsZugewiesener,
  autoOeffnen = false,
  annehmenAktion,
  erledigtAktion,
  loeschenAktion,
  aktualisierenAktion,
  anhangLoeschenAktion,
  kommentarAktion,
  checkpunktAktion,
  children,
}: {
  daten: AuftragDialogDaten
  alsErsteller: boolean
  alsZugewiesener: boolean
  autoOeffnen?: boolean
  annehmenAktion: (auftragId: string) => void
  erledigtAktion: (auftragId: string, erledigt: boolean) => void
  loeschenAktion: (auftragId: string) => void
  aktualisierenAktion: (auftragId: string, formData: FormData) => void
  anhangLoeschenAktion: (anhangId: string) => void
  kommentarAktion: (auftragId: string, formData: FormData) => void
  checkpunktAktion: (checkpunktId: string, erledigt: boolean) => void
  children: ReactNode
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [bearbeiten, setBearbeiten] = useState(false)

  useEffect(() => {
    if (autoOeffnen) dialogRef.current?.showModal()
    // Nur einmal beim Einhängen — danach steuert der Nutzer das Pop-Up selbst.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const erledigt = daten.status === "ERLEDIGT"
  const standardwerte: AuftragStandardwerte = {
    titel: daten.titel,
    beschreibung: daten.beschreibung ?? "",
    zugewiesenAnIds: [],
    faelligAm: daten.faelligAm,
    prioritaet: daten.prioritaet,
    geplantAm: null,
    checkpunkte: daten.checkpunkte.map((punkt) => ({ id: punkt.id, text: punkt.text })),
  }
  const punkteErledigt = daten.checkpunkte.filter((punkt) => punkt.erledigt).length

  function schliessen() {
    dialogRef.current?.close()
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => dialogRef.current?.showModal()}
        onKeyDown={(ereignis) => {
          if (ereignis.key === "Enter" || ereignis.key === " ") {
            ereignis.preventDefault()
            dialogRef.current?.showModal()
          }
        }}
        aria-label={`Aufgabe öffnen: ${daten.titel}`}
        className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-lg text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
      >
        {children}
      </div>

      <dialog
        ref={dialogRef}
        onClose={() => setBearbeiten(false)}
        className="fixed top-1/2 left-1/2 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rand bg-flaeche p-0 shadow-xl backdrop:bg-neutral-900/40"
      >
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-rand px-5 py-4">
            <div className="flex min-w-0 items-start gap-2">
              <span
                aria-label={`Priorität: ${AUFGABE_PRIORITAET_NAMEN[daten.prioritaet]}`}
                title={AUFGABE_PRIORITAET_NAMEN[daten.prioritaet]}
                className={"mt-2 h-2.5 w-2.5 shrink-0 rounded-full " + AUFGABE_PRIORITAET_KLASSEN[daten.prioritaet]}
              />
              <h2 className={"text-lg font-semibold break-words text-ueberschrift" + (erledigt ? " line-through" : "")}>
                {daten.titel}
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {alsErsteller && !bearbeiten && (
                <button
                  type="button"
                  onClick={() => setBearbeiten(true)}
                  aria-label="Aufgabe bearbeiten"
                  className="rounded p-1.5 text-tertiaer transition hover:bg-flaeche-100 hover:text-primaer"
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                </button>
              )}
              <button
                type="button"
                onClick={schliessen}
                aria-label="Schließen"
                className="rounded p-1.5 text-tertiaer transition hover:bg-flaeche-100 hover:text-primaer"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4 text-sm">
            {bearbeiten ? (
              <>
                {daten.anhaenge.length > 0 && (
                  <div>
                    <p className="block text-xs font-medium text-primaer">Bestehende Anhänge</p>
                    <ul className="mt-1.5 flex flex-col gap-1">
                      {daten.anhaenge.map((anhang) => (
                        <li
                          key={anhang.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-rand px-2.5 py-1.5"
                        >
                          <a
                            href={`/api/auftraege/${daten.id}/anhaenge/${anhang.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 truncate text-marke-gruen-dunkel hover:underline"
                          >
                            <Paperclip className="h-3.5 w-3.5 shrink-0" aria-hidden /> {anhang.dateiname}
                          </a>
                          <form action={anhangLoeschenAktion.bind(null, anhang.id)}>
                            <button
                              type="submit"
                              aria-label={`${anhang.dateiname} entfernen`}
                              className="shrink-0 rounded p-1 text-xs text-tertiaer hover:bg-red-50 hover:text-red-600"
                            >
                              entfernen
                            </button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <form
                  action={aktualisierenAktion.bind(null, daten.id)}
                  onSubmit={() => window.setTimeout(() => setBearbeiten(false), 0)}
                  className="flex flex-col gap-4"
                >
                  <AuftragFormFelder standardwerte={standardwerte} personen={[]} nurInhalt idPrefix={`${daten.id}-`} />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setBearbeiten(false)}
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
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span
                    className={"rounded-full px-2 py-0.5 text-[11px] font-medium " + AUFGABE_STATUS_KLASSEN[daten.status]}
                  >
                    {AUFGABE_STATUS_NAMEN[daten.status]}
                  </span>
                  {daten.faelligText && (
                    <span
                      className={
                        "flex items-center gap-1 text-xs font-medium " + (daten.ueberfaellig ? "text-red-600" : "text-sekundaer")
                      }
                    >
                      {daten.ueberfaellig && <AlertTriangle className="h-3.5 w-3.5" aria-hidden />}
                      Fällig: {daten.faelligText}
                      {daten.ueberfaellig && <span className="sr-only"> (überfällig)</span>}
                    </span>
                  )}
                  {daten.erledigtText && <span className="text-xs text-sekundaer">Erledigt am {daten.erledigtText}</span>}
                </div>

                <p className="text-xs text-sekundaer">
                  Von {daten.vonName} an {daten.anName}
                </p>
                {daten.gemeinsam && (
                  <p className="-mt-2 text-xs text-tertiaer">
                    Gemeinsame Aufgabe: Wer sie annimmt, abhakt oder erledigt, tut das für alle.
                  </p>
                )}

                {daten.beschreibung ? (
                  <div
                    className="text-sm text-primaer [&_a]:text-marke-gruen-dunkel [&_a]:underline [&_img]:max-w-full [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5"
                    dangerouslySetInnerHTML={{ __html: daten.beschreibung }}
                  />
                ) : (
                  <p className="text-xs text-tertiaer">Keine Beschreibung.</p>
                )}

                {daten.anhaenge.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-ueberschrift">Anhänge</h3>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {daten.anhaenge.map((anhang) => (
                        <li key={anhang.id}>
                          <a
                            href={`/api/auftraege/${daten.id}/anhaenge/${anhang.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex max-w-[14rem] items-center gap-1 truncate rounded-full bg-flaeche-100 px-2.5 py-1 text-xs text-primaer hover:underline"
                          >
                            <Paperclip className="h-3.5 w-3.5 shrink-0" aria-hidden /> {anhang.dateiname}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {daten.checkpunkte.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-ueberschrift">Checkliste</h3>
                      <span className="text-xs text-sekundaer">
                        {punkteErledigt} von {daten.checkpunkte.length} erledigt
                      </span>
                    </div>
                    <div
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={daten.checkpunkte.length}
                      aria-valuenow={punkteErledigt}
                      aria-label={`${punkteErledigt} von ${daten.checkpunkte.length} erledigt`}
                      className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-flaeche-200"
                    >
                      <div
                        className="h-full rounded-full bg-marke-gruen transition-[width]"
                        style={{ width: `${Math.round((punkteErledigt / daten.checkpunkte.length) * 100)}%` }}
                      />
                    </div>
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {daten.checkpunkte.map((punkt) => (
                        <li key={punkt.id} className="flex items-start gap-2.5">
                          {alsZugewiesener && !erledigt ? (
                            <form action={checkpunktAktion.bind(null, punkt.id, !punkt.erledigt)} className="shrink-0">
                              <button
                                type="submit"
                                role="checkbox"
                                aria-checked={punkt.erledigt}
                                aria-label={punkt.erledigt ? `${punkt.text} wieder öffnen` : `${punkt.text} abhaken`}
                                className={
                                  "mt-0.5 flex h-5 w-5 items-center justify-center rounded border-2 transition " +
                                  (punkt.erledigt
                                    ? "border-marke-gruen bg-marke-gruen text-neutral-900"
                                    : "border-flaeche-300 hover:border-marke-gruen")
                                }
                              >
                                {punkt.erledigt && <Check className="h-3.5 w-3.5" aria-hidden />}
                              </button>
                            </form>
                          ) : (
                            <span
                              role="checkbox"
                              aria-checked={punkt.erledigt}
                              aria-readonly
                              aria-label={punkt.text}
                              className={
                                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 " +
                                (punkt.erledigt ? "border-marke-gruen bg-marke-gruen text-neutral-900" : "border-flaeche-300")
                              }
                            >
                              {punkt.erledigt && <Check className="h-3.5 w-3.5" aria-hidden />}
                            </span>
                          )}
                          <span className={"text-sm break-words " + (punkt.erledigt ? "text-tertiaer line-through" : "text-primaer")}>
                            {punkt.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {alsZugewiesener && (daten.status === "OFFEN" || daten.status === "ANGENOMMEN" || erledigt) && (
                  <div className="flex flex-wrap gap-2">
                    {daten.status === "OFFEN" && (
                      <form action={annehmenAktion.bind(null, daten.id)}>
                        <button
                          type="submit"
                          className="h-9 rounded-lg bg-marke-orange/15 px-3 text-sm font-medium text-ueberschrift transition hover:bg-marke-orange/25"
                        >
                          Annehmen
                        </button>
                      </form>
                    )}
                    {daten.status === "ANGENOMMEN" && (
                      <form action={erledigtAktion.bind(null, daten.id, true)} onSubmit={() => window.setTimeout(schliessen, 0)}>
                        <button
                          type="submit"
                          className="h-9 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
                        >
                          Als erledigt markieren
                        </button>
                      </form>
                    )}
                    {erledigt && (
                      <form action={erledigtAktion.bind(null, daten.id, false)} onSubmit={() => window.setTimeout(schliessen, 0)}>
                        <button
                          type="submit"
                          className="h-9 rounded-lg border border-rand px-3 text-sm font-medium text-primaer transition hover:bg-flaeche-100"
                        >
                          Wieder öffnen
                        </button>
                      </form>
                    )}
                  </div>
                )}

                <div className="border-t border-flaeche-100 pt-3">
                  <AuftragKommentare auftragId={daten.id} kommentare={daten.kommentare} kommentarAktion={kommentarAktion} />
                </div>

                {alsErsteller && (
                  <form
                    action={loeschenAktion.bind(null, daten.id)}
                    onSubmit={(ereignis) => {
                      if (!confirm("Aufgabe wirklich zurückziehen/löschen? Das lässt sich nicht rückgängig machen.")) {
                        ereignis.preventDefault()
                      }
                    }}
                    className="border-t border-flaeche-100 pt-3"
                  >
                    <button type="submit" className="text-xs text-tertiaer hover:text-red-600">
                      {erledigt ? "Aufgabe löschen" : "Aufgabe zurückziehen"}
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </dialog>
    </>
  )
}
