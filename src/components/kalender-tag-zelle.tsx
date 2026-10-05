"use client"

import { useRef } from "react"
import { Cake } from "lucide-react"

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
  geburtstageAktiv,
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
  geburtstageAktiv: boolean
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
  const geburtstagDialogRef = useRef<HTMLDialogElement>(null)

  const hatTermine = kalendertag.termine.length > 0
  const hatGeburtstage = geburtstageAktiv && kalendertag.geburtstage.length > 0
  const klickbar = hatTermine || feiertagAktiv || hatGeburtstage

  const titel = [
    feiertagAktiv && kalendertag.feiertag,
    ferienAktiv && kalendertag.ferien,
    hatGeburtstage && `Geburtstag: ${kalendertag.geburtstage.join(", ")}`,
    ...kalendertag.termine.map((t) => `${t.titel}, ${t.zeitraumAnzeige}`),
  ]
    .filter(Boolean)
    .join(" · ")

  function beiZahlAktivieren() {
    if (hatTermine) {
      ersterTerminRef.current?.oeffnen()
    } else if (feiertagAktiv) {
      feiertagDialogRef.current?.showModal()
    } else if (hatGeburtstage) {
      geburtstagDialogRef.current?.showModal()
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
                ? "text-primaer"
                : "text-neutral-300")
        }
      >
        {kalendertag.tag}
      </div>

      {hatGeburtstage && (
        <button
          type="button"
          onClick={() => geburtstagDialogRef.current?.showModal()}
          aria-label={`Geburtstag: ${kalendertag.geburtstage.join(", ")}`}
          className="flex h-3 items-center text-marke-orange"
        >
          <Cake className="h-3 w-3" aria-hidden />
        </button>
      )}

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
            <span className="text-[9px] leading-none text-tertiaer">
              +{kalendertag.termine.length - 3}
            </span>
          )}
        </div>
      )}

      {hatGeburtstage && (
        <dialog
          ref={geburtstagDialogRef}
          className="fixed top-1/2 left-1/2 w-full max-w-xs -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rand bg-flaeche p-0 shadow-xl backdrop:bg-neutral-900/40"
        >
          <div className="px-5 py-4">
            <p className="text-sm font-semibold text-ueberschrift">
              Geburtstag{kalendertag.geburtstage.length > 1 ? "e" : ""}
            </p>
            <ul className="mt-1 text-sm text-primaer">
              {kalendertag.geburtstage.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
          <div className="flex justify-end border-t border-rand px-5 py-3">
            <button
              type="button"
              onClick={() => geburtstagDialogRef.current?.close()}
              className="h-9 rounded-lg px-3 text-sm font-medium text-primaer transition hover:bg-flaeche-100"
            >
              Schließen
            </button>
          </div>
        </dialog>
      )}

      {feiertagAktiv && (
        <dialog
          ref={feiertagDialogRef}
          className="fixed top-1/2 left-1/2 w-full max-w-xs -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rand bg-flaeche p-0 shadow-xl backdrop:bg-neutral-900/40"
        >
          <div className="px-5 py-4">
            <p className="text-sm font-semibold text-ueberschrift">{kalendertag.feiertag}</p>
            <p className="mt-1 text-xs text-sekundaer">Gesetzlicher Feiertag in Sachsen</p>
          </div>
          <div className="flex justify-end border-t border-rand px-5 py-3">
            <button
              type="button"
              onClick={() => feiertagDialogRef.current?.close()}
              className="h-9 rounded-lg px-3 text-sm font-medium text-primaer transition hover:bg-flaeche-100"
            >
              Schließen
            </button>
          </div>
        </dialog>
      )}
    </div>
  )
}
