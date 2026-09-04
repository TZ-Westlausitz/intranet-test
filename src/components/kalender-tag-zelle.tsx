"use client"

import { useRef } from "react"

import { TerminDot, type TerminDotHandle } from "@/components/termin-dot"
import type { Person } from "@/components/termin-form-felder"
import type { KalendertagAnzeige } from "@/components/kalender-monate"
import { TerminTeilnahmeStatus } from "@/generated/prisma/enums"

/**
 * Eine Kalendertag-Zelle — eigene Komponente statt Inline-JSX in einer
 * `.map()`-Schleife, weil sie einen eigenen Hook braucht (Ref auf den
 * ersten Termin-Punkt, damit ein Klick/Hover auf die Tageszahl dieselbe
 * Vorschau öffnet wie ein Klick auf den Punkt selbst — größere, leichter
 * zu treffende Fläche, wichtig gerade auf dem Handy).
 *
 * Feiertage: da Hover auf Tablet/Handy gar nicht existiert, reicht das
 * native `title`-Attribut allein nicht — deshalb zusätzlich ein eigenes,
 * per Klick auf die Zahl erreichbares kleines Pop-Up mit dem Feiertags-
 * namen. Bei mehreren Terminen an einem Tag öffnet die Zahl den ersten
 * davon; die übrigen bleiben über ihre eigenen Punkte erreichbar.
 */
export function KalenderTagZelle({
  kalendertag,
  feiertagAktiv,
  ferienAktiv,
  personen,
  aktualisierenAktion,
  loeschenAktion,
  serieLoeschenAktion,
  serieAbHierLoeschenAktion,
  teilnahmeAktion,
  kommentarAktion,
  rueckkehrJahr,
  rueckkehrMonat,
}: {
  kalendertag: KalendertagAnzeige
  feiertagAktiv: boolean
  ferienAktiv: boolean
  personen: Person[]
  aktualisierenAktion: (terminId: string, formData: FormData) => void
  loeschenAktion: (terminId: string, formData: FormData) => void
  serieLoeschenAktion: (serieId: string, formData: FormData) => void
  serieAbHierLoeschenAktion: (terminId: string, formData: FormData) => void
  teilnahmeAktion: (terminId: string, status: TerminTeilnahmeStatus) => void
  kommentarAktion: (terminId: string, formData: FormData) => void
  rueckkehrJahr: number
  rueckkehrMonat: number
}) {
  const ersterTerminRef = useRef<TerminDotHandle>(null)
  const feiertagDialogRef = useRef<HTMLDialogElement>(null)

  const hatTermine = kalendertag.termine.length > 0
  const klickbar = hatTermine || feiertagAktiv

  const titel = [
    feiertagAktiv && kalendertag.feiertag,
    ferienAktiv && kalendertag.ferien,
    ...kalendertag.termine.map((t) => `${t.titel}, ${t.zeitraumAnzeige}`),
  ]
    .filter(Boolean)
    .join(" · ")

  function beiZahlAktivieren() {
    if (hatTermine) {
      ersterTerminRef.current?.oeffnen()
    } else if (feiertagAktiv) {
      feiertagDialogRef.current?.showModal()
    }
  }

  return (
    <div
      title={titel || undefined}
      className={
        "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg " +
        (ferienAktiv ? "bg-marke-orange/15" : "")
      }
    >
      <div
        role={klickbar ? "button" : undefined}
        tabIndex={klickbar ? 0 : undefined}
        onClick={klickbar ? beiZahlAktivieren : undefined}
        onKeyDown={
          klickbar
            ? (ereignis) => {
                if (ereignis.key === "Enter" || ereignis.key === " ") {
                  ereignis.preventDefault()
                  beiZahlAktivieren()
                }
              }
            : undefined
        }
        className={
          "flex h-6 w-6 items-center justify-center rounded-full text-sm sm:h-7 sm:w-7 " +
          (klickbar ? "cursor-pointer " : "") +
          (kalendertag.istHeute
            ? "bg-marke-gruen font-semibold text-neutral-900"
            : feiertagAktiv
              ? "font-semibold text-red-600"
              : kalendertag.imAktuellenMonat
                ? "text-neutral-700"
                : "text-neutral-300")
        }
      >
        {kalendertag.tag}
      </div>

      {hatTermine && (
        <div className="flex h-1.5 items-center gap-0.5">
          {kalendertag.termine.slice(0, 3).map((termin, index) => (
            <TerminDot
              key={termin.id}
              ref={index === 0 ? ersterTerminRef : undefined}
              termin={termin}
              personen={personen}
              aktualisierenAktion={aktualisierenAktion}
              loeschenAktion={loeschenAktion}
              serieLoeschenAktion={serieLoeschenAktion}
              serieAbHierLoeschenAktion={serieAbHierLoeschenAktion}
              teilnahmeAktion={teilnahmeAktion}
              kommentarAktion={kommentarAktion}
              rueckkehrJahr={rueckkehrJahr}
              rueckkehrMonat={rueckkehrMonat}
            />
          ))}
          {kalendertag.termine.length > 3 && (
            <span className="text-[9px] leading-none text-neutral-400">
              +{kalendertag.termine.length - 3}
            </span>
          )}
        </div>
      )}

      {feiertagAktiv && (
        <dialog
          ref={feiertagDialogRef}
          className="fixed top-1/2 left-1/2 w-full max-w-xs -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-200 p-0 shadow-xl backdrop:bg-neutral-900/40"
        >
          <div className="px-5 py-4">
            <p className="text-sm font-semibold text-marke-grau">{kalendertag.feiertag}</p>
            <p className="mt-1 text-xs text-neutral-500">Gesetzlicher Feiertag in Sachsen</p>
          </div>
          <div className="flex justify-end border-t border-neutral-200 px-5 py-3">
            <button
              type="button"
              onClick={() => feiertagDialogRef.current?.close()}
              className="h-9 rounded-lg px-3 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100"
            >
              Schließen
            </button>
          </div>
        </dialog>
      )}
    </div>
  )
}
