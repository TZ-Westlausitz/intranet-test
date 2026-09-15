"use client"

import { useState } from "react"

import { WOCHENTAGE_KURZ } from "@/lib/kalender"
import { KalenderTagZelle } from "@/components/kalender-tag-zelle"
import type { Person } from "@/components/termin-form-felder"
import type { TerminAnzeige } from "@/lib/termine/typen"
import { TerminTeilnahmeStatus } from "@/generated/prisma/enums"

export type KalendertagAnzeige = {
  datumIso: string
  tag: number
  imAktuellenMonat: boolean
  istHeute: boolean
  feiertag: string | null
  ferien: string | null
  termine: TerminAnzeige[]
}

export type MonatAnzeige = {
  jahr: number
  monatIndex0: number
  monatsname: string
  wochen: KalendertagAnzeige[][]
}

/**
 * Die drei Kalenderblätter plus die Menüleiste mit den beiden Checkboxen
 * darunter — als eine Client-Komponente, weil das Ein-/Ausblenden von
 * Feiertagen und Schulferien reine Anzeigesache ist und keinen Constraint-
 * Trip zum Server braucht. Die Tage selbst (inklusive Feiertags-/Ferien-
 * Zuordnung und der Termine) kommen fertig berechnet von der Seite
 * (Server-Komponente).
 *
 * `personen`/`aktualisierenAktion`/`teilnahmeAktion`/`rueckkehrJahr`/
 * `rueckkehrMonat` wandern nur durch bis zu TerminDot — dort stecken
 * Bearbeiten-Pop-Up und Zusage/Absage.
 */
export function KalenderMonate({
  monate,
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
  monate: MonatAnzeige[]
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
  const [zeigeFeiertage, setZeigeFeiertage] = useState(true)
  const [zeigeSchulferien, setZeigeSchulferien] = useState(true)

  return (
    <>
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        {monate.map((monat, index) => (
          <div
            key={`${monat.jahr}-${monat.monatIndex0}`}
            className={
              "overflow-hidden rounded-2xl border border-rand bg-flaeche bg-flaeche shadow-sm " +
              // Auf dem Handy nur den aktuellen Monat zeigen — für die
              // beiden folgenden reicht dort der Platz nicht, ab `md:`
              // stehen wie gehabt alle drei nebeneinander.
              (index > 0 ? "hidden md:block" : "")
            }
          >
            <div className="border-b border-rand bg-gradient-to-r from-marke-gruen/15 via-marke-gruen/5 to-transparent px-4 py-3">
              <h2 className="font-semibold text-ueberschrift">
                {monat.monatsname} {monat.jahr}
              </h2>
            </div>

            <div className="grid grid-cols-7 gap-1 px-3 pt-3 text-center text-xs font-medium text-tertiaer">
              {WOCHENTAGE_KURZ.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 p-3">
              {monat.wochen.flat().map((kalendertag) => (
                <KalenderTagZelle
                  key={kalendertag.datumIso}
                  kalendertag={kalendertag}
                  feiertagAktiv={zeigeFeiertage && !!kalendertag.feiertag}
                  ferienAktiv={zeigeSchulferien && !!kalendertag.ferien}
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
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-rand bg-flaeche-schwach px-4 py-3">
        <label className="flex items-center gap-2 text-sm text-primaer">
          <input
            type="checkbox"
            checked={zeigeFeiertage}
            onChange={(ereignis) => setZeigeFeiertage(ereignis.target.checked)}
            className="h-4 w-4 rounded border-flaeche-300 text-marke-gruen focus:ring-marke-gruen"
          />
          Feiertage in Sachsen markieren
        </label>

        <label className="flex items-center gap-2 text-sm text-primaer">
          <input
            type="checkbox"
            checked={zeigeSchulferien}
            onChange={(ereignis) => setZeigeSchulferien(ereignis.target.checked)}
            className="h-4 w-4 rounded border-flaeche-300 text-marke-gruen focus:ring-marke-gruen"
          />
          Schulferien in Sachsen markieren
        </label>
      </div>
    </>
  )
}
