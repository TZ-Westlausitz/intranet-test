"use client"

import { forwardRef, useImperativeHandle, useRef, useState } from "react"

import type { Person, TerminStandardwerte } from "@/components/termin-form-felder"
import { TerminBearbeitenDialog } from "@/components/termin-bearbeiten-dialog"
import { TERMIN_FARBE_KLASSEN, erinnerungLabel } from "@/lib/termin-optionen"
import type { TerminAnhangAnzeige, TerminAnzeige } from "@/lib/termine/typen"
import { TerminTeilnahmeStatus } from "@/generated/prisma/enums"

function dateigroesseAnzeige(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Bild = kleine Vorschau, alles andere (PDF) = Dateisymbol. Bild-Klick
 * öffnet eine In-App-Lightbox statt `target="_blank"` (Rückmeldung
 * 2026-09-16, dasselbe Muster wie bei Info-/Chat-Anhängen, siehe
 * AnhaengeListe in info-anzeigen-dialog.tsx): `target="_blank"`
 * navigierte in der installierten Web-App (Standalone-Modus, keine
 * Tab-Leiste) einfach die ganze App zum rohen Bild, ohne Weg zurück.
 */
function AnhangZeile({ terminId, anhang }: { terminId: string; anhang: TerminAnhangAnzeige }) {
  const url = `/api/termine/${terminId}/anhaenge/${anhang.id}`
  const istBild = anhang.mimetyp.startsWith("image/")
  const lightboxRef = useRef<HTMLDialogElement>(null)

  const inhalt = (
    <>
      {istBild ? (
        // eslint-disable-next-line @next/next/no-img-element -- interne Datei aus der Ablage, kein optimierbares Next-Image-Ziel
        <img src={url} alt="" className="h-9 w-9 shrink-0 rounded object-cover" />
      ) : (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-flaeche-100 text-tertiaer">
          📄
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-marke-gruen-dunkel hover:underline">{anhang.dateiname}</span>
        <span className="block text-xs text-tertiaer">{dateigroesseAnzeige(anhang.groesseBytes)}</span>
      </span>
    </>
  )

  if (!istBild) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-flaeche-schwach"
      >
        {inhalt}
      </a>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => lightboxRef.current?.showModal()}
        className="flex items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-flaeche-schwach"
      >
        {inhalt}
      </button>

      <dialog
        ref={lightboxRef}
        onClick={(ereignis) => {
          if (ereignis.target === lightboxRef.current) lightboxRef.current?.close()
        }}
        className="fixed top-1/2 left-1/2 max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-transparent p-0 backdrop:bg-neutral-900/70"
      >
        <div className="relative">
          <button
            type="button"
            aria-label="Schließen"
            onClick={() => lightboxRef.current?.close()}
            className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900/60 text-white transition hover:bg-neutral-900/80"
          >
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- Vorschau aus der Ablage, kein optimierbares Next-Image-Ziel */}
          <img src={url} alt={anhang.dateiname} className="max-h-[85vh] max-w-[92vw] rounded-xl object-contain" />
        </div>
      </dialog>
    </>
  )
}

export type TerminInfoDialogHandle = { oeffnen: () => void }

/**
 * Das Info-Pop-Up eines Termins — eigenständig statt in TerminDot
 * verschachtelt, damit sowohl der Punkt im Kalenderblatt (TerminDot) als
 * auch eine Zeile in "Nächste Termine" (TerminUebersicht) dasselbe Pop-Up
 * öffnen können, ohne die ca. 200 Zeilen Anzeige-Markup zu duplizieren.
 *
 * Nur die erstellende Person sieht darin ein Zahnrad, das zum Bearbeiten-
 * Pop-Up wechselt (TerminBearbeitenDialog) — die eigentliche Berechtigung
 * prüft trotzdem noch einmal die Server Action `terminAktualisieren`
 * (Regel 5: ein ausgeblendetes Zahnrad ist keine Zugriffskontrolle).
 *
 * Ist die anzeigende Person selbst eingeladen (nicht die erstellende
 * Person), zeigt das Pop-Up zusätzlich Zusagen-/Absagen-Buttons für die
 * eigene Teilnahme — die Antwort erscheint bei allen als grüner Haken
 * bzw. rotes Kreuz hinter dem Namen, und die erstellende Person bekommt
 * eine Benachrichtigung darüber (siehe terminTeilnahmeAntworten).
 *
 * `forwardRef`/`oeffnen`: der Aufrufer öffnet damit dasselbe Pop-Up von
 * unterschiedlichen Auslösern aus (Punkt, Tageszahl, Listenzeile), ohne
 * den Dialog-Zustand zu duplizieren.
 */
export const TerminInfoDialog = forwardRef<TerminInfoDialogHandle, {
  termin: TerminAnzeige
  personen: Person[]
  aktualisierenAktion: (terminId: string, formData: FormData) => void
  loeschenAktion: (terminId: string, formData: FormData) => void
  serieLoeschenAktion: (serieId: string, formData: FormData) => void
  serieAbHierLoeschenAktion: (terminId: string, formData: FormData) => void
  teilnahmeAktion: (terminId: string, status: TerminTeilnahmeStatus) => void
  kommentarAktion: (terminId: string, formData: FormData) => void
  rueckkehrJahr: number
  rueckkehrMonat: number
}>(function TerminInfoDialog(
  {
    termin,
    personen,
    aktualisierenAktion,
    loeschenAktion,
    serieLoeschenAktion,
    serieAbHierLoeschenAktion,
    teilnahmeAktion,
    kommentarAktion,
    rueckkehrJahr,
    rueckkehrMonat,
  },
  weitergereichteRef,
) {
  const infoRef = useRef<HTMLDialogElement>(null)
  const [kommentarAnhaenge, setKommentarAnhaenge] = useState<string[]>([])

  useImperativeHandle(weitergereichteRef, () => ({
    oeffnen: () => infoRef.current?.showModal(),
  }))

  const standardwerte: TerminStandardwerte = {
    titel: termin.titel,
    ganztaegig: termin.ganztaegig,
    datum: termin.datum,
    von: termin.von,
    bis: termin.bis,
    vonDatum: termin.vonDatum,
    bisDatum: termin.bisDatum,
    beschreibung: termin.beschreibung ?? "",
    ort: termin.ort ?? "",
    farbe: termin.farbe,
    teilnehmerIds: termin.teilnehmer.map((t) => t.personId),
    erinnerungenMinuten: termin.erinnerungenMinuten,
    kommentareErlaubt: termin.kommentareErlaubt,
  }

  return (
    <dialog
      ref={infoRef}
      className="fixed top-1/2 left-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rand bg-flaeche p-0 shadow-xl backdrop:bg-neutral-900/40"
    >
      <div className="flex items-start justify-between gap-3 border-b border-rand px-5 py-4">
        <div className="flex items-start gap-2">
          <span
            className={
              "mt-1.5 h-3 w-3 shrink-0 rounded-full " + (TERMIN_FARBE_KLASSEN[termin.farbe] ?? "bg-neutral-400")
            }
          />
          <h2 className="text-lg font-semibold text-ueberschrift">{termin.titel}</h2>
        </div>

        {termin.istErsteller && (
          <TerminBearbeitenDialog
            terminId={termin.id}
            serieId={termin.serieId}
            standardwerte={standardwerte}
            bestehendeAnhaenge={termin.anhaenge}
            personen={personen}
            aktualisierenAktion={aktualisierenAktion}
            loeschenAktion={loeschenAktion}
            serieLoeschenAktion={serieLoeschenAktion}
            serieAbHierLoeschenAktion={serieAbHierLoeschenAktion}
            rueckkehrJahr={rueckkehrJahr}
            rueckkehrMonat={rueckkehrMonat}
            vorOeffnenSchliessen={() => infoRef.current?.close()}
          />
        )}
      </div>

      <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto px-5 py-4 text-sm text-primaer">
        <p>
          {termin.datumAnzeige}
          {!termin.ganztaegig && <> · {termin.zeitraumAnzeige} Uhr</>}
          {termin.serieId && <span className="ml-1 text-xs text-tertiaer">(Serie)</span>}
        </p>

        {termin.ort && (
          <p className="text-primaer">
            <span className="font-medium text-primaer">Ort: </span>
            {termin.ort}
          </p>
        )}

        {termin.beschreibung && (
          <div
            className="text-primaer [&_a]:text-marke-gruen-dunkel [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5"
            dangerouslySetInnerHTML={{ __html: termin.beschreibung }}
          />
        )}

        {termin.anhaenge.length > 0 && (
          <div>
            <span className="font-medium text-primaer">Anhänge:</span>
            <div className="mt-1 flex flex-col">
              {termin.anhaenge.map((anhang) => (
                <AnhangZeile key={anhang.id} terminId={termin.id} anhang={anhang} />
              ))}
            </div>
          </div>
        )}

        {termin.teilnehmer.length > 0 && (
          <div>
            <span className="font-medium text-primaer">Teilnehmer:</span>
            <ul className="mt-1 flex flex-col gap-0.5">
              {termin.teilnehmer.map((t) => (
                <li key={t.personId} className="flex items-center gap-1.5">
                  {t.name}
                  {t.status === "ERSTELLER" && <span className="text-xs text-tertiaer">(Ersteller)</span>}
                  {t.status === TerminTeilnahmeStatus.ZUGESAGT && (
                    <span className="text-green-600" aria-label="hat zugesagt" title="Zugesagt">
                      ✓
                    </span>
                  )}
                  {t.status === TerminTeilnahmeStatus.ABGESAGT && (
                    <span className="text-red-600" aria-label="hat abgesagt" title="Abgesagt">
                      ✗
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {termin.erinnerungenMinuten.length > 0 && (
          <p>
            <span className="font-medium text-primaer">Erinnerung: </span>
            {termin.erinnerungenMinuten.map(erinnerungLabel).join(", ")}
          </p>
        )}

        {termin.eigenerTeilnahmeStatus !== null && (
          <div className="flex items-center gap-2 border-t border-flaeche-100 pt-3">
            <span className="text-xs font-medium text-primaer">Deine Teilnahme:</span>
            <form action={teilnahmeAktion.bind(null, termin.id, TerminTeilnahmeStatus.ZUGESAGT)}>
              <button
                type="submit"
                className={
                  "rounded-lg px-2.5 py-1 text-xs font-semibold transition " +
                  (termin.eigenerTeilnahmeStatus === TerminTeilnahmeStatus.ZUGESAGT
                    ? "bg-green-100 text-green-700"
                    : "bg-flaeche-100 text-primaer hover:bg-green-50 hover:text-green-700")
                }
              >
                ✓ Zusagen
              </button>
            </form>
            <form action={teilnahmeAktion.bind(null, termin.id, TerminTeilnahmeStatus.ABGESAGT)}>
              <button
                type="submit"
                className={
                  "rounded-lg px-2.5 py-1 text-xs font-semibold transition " +
                  (termin.eigenerTeilnahmeStatus === TerminTeilnahmeStatus.ABGESAGT
                    ? "bg-red-100 text-red-700"
                    : "bg-flaeche-100 text-primaer hover:bg-red-50 hover:text-red-700")
                }
              >
                ✗ Absagen
              </button>
            </form>
          </div>
        )}

        {termin.kommentareErlaubt && (
          <div className="border-t border-flaeche-100 pt-3">
            <span className="text-xs font-medium text-primaer">Rückfragen:</span>

            {termin.kommentare.length > 0 && (
              <ul className="mt-1.5 flex flex-col gap-2">
                {termin.kommentare.map((kommentar) => (
                  <li key={kommentar.id} className="rounded-lg bg-flaeche-schwach px-2.5 py-1.5">
                    <p className="text-xs font-medium text-sekundaer">
                      {kommentar.autorName} · {kommentar.erstelltAmAnzeige}
                    </p>
                    <p className="text-sm text-primaer">{kommentar.text}</p>
                    {kommentar.anhaenge.length > 0 && (
                      <div className="mt-1 flex flex-col">
                        {kommentar.anhaenge.map((anhang) => (
                          <AnhangZeile key={anhang.id} terminId={termin.id} anhang={anhang} />
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <form
              action={kommentarAktion.bind(null, termin.id)}
              onSubmit={(ereignis) => {
                setKommentarAnhaenge([])
                window.setTimeout(() => (ereignis.target as HTMLFormElement).reset(), 0)
              }}
              className="mt-1.5 flex flex-col gap-1"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  name="text"
                  required
                  placeholder="Frage oder Hinweis …"
                  className="h-9 flex-1 rounded-lg border border-flaeche-300 px-2 text-sm"
                />
                <label
                  title="Anhang hinzufügen"
                  className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-flaeche-100 text-lg leading-none text-primaer transition hover:bg-flaeche-200"
                >
                  +
                  <input
                    type="file"
                    name="anhaenge"
                    multiple
                    accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
                    onChange={(ereignis) =>
                      setKommentarAnhaenge([...(ereignis.target.files ?? [])].map((datei) => datei.name))
                    }
                    className="hidden"
                  />
                </label>
                <button
                  type="submit"
                  className="h-9 shrink-0 rounded-lg bg-flaeche-100 px-3 text-sm font-medium text-primaer transition hover:bg-flaeche-200"
                >
                  Senden
                </button>
              </div>
              {kommentarAnhaenge.length > 0 && (
                <p className="text-xs text-sekundaer">Anhang: {kommentarAnhaenge.join(", ")}</p>
              )}
              <input type="hidden" name="rueckkehrJahr" value={rueckkehrJahr} />
              <input type="hidden" name="rueckkehrMonat" value={rueckkehrMonat} />
            </form>
          </div>
        )}
      </div>

      <div className="flex justify-end border-t border-rand px-5 py-4">
        <button
          type="button"
          onClick={() => infoRef.current?.close()}
          className="h-9 rounded-lg px-3 text-sm font-medium text-primaer transition hover:bg-flaeche-100"
        >
          Schließen
        </button>
      </div>
    </dialog>
  )
})
