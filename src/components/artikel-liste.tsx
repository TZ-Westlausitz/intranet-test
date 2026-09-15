"use client"

import { useRef } from "react"

import { ArtikelAktionenMenu } from "@/components/artikel-aktionen-menu"
import { ArtikelAnzeigenDialog, type ArtikelAnzeigenDialogHandle } from "@/components/artikel-anzeigen-dialog"
import { artikelZuStandardwerte, type ArtikelFormularOptionen } from "@/components/artikel-form-felder"
import type { artikelDetailLaden, artikelAktualisieren, artikelAnhangLoeschen, artikelLoeschen } from "@/lib/wissen/aktionen"
import { formatiereDatumAusDate } from "@/lib/datum"

type ArtikelEintrag = {
  id: string
  titel: string
  inhalt: string | null
  aktualisiertAm: Date
  anhaenge: { id: string; dateiname: string; groesseBytes: number; mimetyp: string }[]
  empfaengerPersonen: { personId: string }[]
  empfaengerGruppen: { gruppeId: string }[]
  empfaengerAbteilungen: { abteilungId: string }[]
}

/**
 * Artikel-Liste mit Klick-öffnet-Pop-up — wiederverwendet auf der Ordner-
 * und Unterordner-Detailseite (mit "⋮"-Menü bei Wissensmanager) sowie für
 * "Zuletzt bearbeitet" auf /wissen (`darfVerwalten=false` von dort,
 * ArtikelAktionenMenu blendet sich dann selbst aus). Muster: NewsfeedListe
 * — ein gemeinsamer Dialog-Ref über alle Zeilen hinweg.
 */
export function ArtikelListe({
  artikel,
  darfVerwalten,
  optionen,
  aktualisierenAktion,
  anhangLoeschenAktion,
  loeschenAktion,
  artikelDetailLadenAktion,
}: {
  artikel: ArtikelEintrag[]
  darfVerwalten: boolean
  optionen: ArtikelFormularOptionen
  aktualisierenAktion: typeof artikelAktualisieren
  anhangLoeschenAktion: typeof artikelAnhangLoeschen
  loeschenAktion: typeof artikelLoeschen
  artikelDetailLadenAktion: typeof artikelDetailLaden
}) {
  const dialogRef = useRef<ArtikelAnzeigenDialogHandle>(null)

  if (artikel.length === 0) {
    return <p className="mt-3 text-sm text-sekundaer">Noch keine Artikel.</p>
  }

  return (
    <>
      <ul className="mt-3 flex flex-col divide-y divide-flaeche-100">
        {artikel.map((eintrag) => (
          <li key={eintrag.id} className="flex items-center gap-3 py-2.5">
            <button
              type="button"
              onClick={() => dialogRef.current?.oeffnen(eintrag.id)}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
            >
              <span aria-hidden>📖</span>
              <span className="truncate text-sm text-primaer">{eintrag.titel}</span>
              {eintrag.anhaenge.length > 0 && (
                <span className="shrink-0 text-xs text-tertiaer">📎 {eintrag.anhaenge.length}</span>
              )}
            </button>
            <span className="shrink-0 text-xs text-tertiaer">{formatiereDatumAusDate(eintrag.aktualisiertAm)}</span>
            <ArtikelAktionenMenu
              artikelId={eintrag.id}
              darfVerwalten={darfVerwalten}
              standardwerte={artikelZuStandardwerte(eintrag)}
              optionen={optionen}
              bestehendeAnhaenge={eintrag.anhaenge}
              aktualisierenAktion={aktualisierenAktion}
              anhangLoeschenAktion={anhangLoeschenAktion}
              loeschenAktion={loeschenAktion}
            />
          </li>
        ))}
      </ul>

      <ArtikelAnzeigenDialog ref={dialogRef} artikelDetailLadenAktion={artikelDetailLadenAktion} />
    </>
  )
}
