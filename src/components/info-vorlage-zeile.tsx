"use client"

import { Trash2 } from "lucide-react"

import { InfoVorlageDialog, type InfoVorlageAnzeige } from "@/components/info-vorlage-dialog"
import type { Person } from "@/components/termin-form-felder"
import type { WissenVerweis } from "@/components/rich-text-wissensverweis"
import type { infoVorlageAktivSetzen, infoVorlageAktualisieren, infoVorlageLoeschen } from "@/lib/infos/vorlagen-aktionen"

/** Eine Zeile in /newsfeed/vorlagen — Muster FormularZeile, ohne Drei-Punkte-Menü (deutlich weniger Aktionen als bei Formular-Vorlagen). */
export function InfoVorlageZeile({
  vorlage,
  benutzerText,
  auswahl,
  aktualisierenAktion,
  aktivSetzenAktion,
  loeschenAktion,
}: {
  vorlage: InfoVorlageAnzeige & { aktiv: boolean }
  benutzerText: string
  auswahl: { personen: Person[]; gruppen: Person[]; abteilungen: Person[]; kategorien: Person[]; wissen: WissenVerweis[] }
  aktualisierenAktion: typeof infoVorlageAktualisieren
  aktivSetzenAktion: typeof infoVorlageAktivSetzen
  loeschenAktion: typeof infoVorlageLoeschen
}) {
  return (
    <tr className="border-b border-flaeche-100 last:border-0">
      <td className="px-4 py-3">
        <InfoVorlageDialog auswahl={auswahl} vorlage={vorlage} aktualisierenAktion={aktualisierenAktion} />
      </td>
      <td className="px-4 py-3 text-primaer">{benutzerText || <span className="text-sekundaer">Alle</span>}</td>
      <td className="px-4 py-3">
        <form action={aktivSetzenAktion.bind(null, vorlage.id, !vorlage.aktiv)}>
          <button
            type="submit"
            className={
              "rounded-full px-2 py-0.5 text-xs font-medium transition " +
              (vorlage.aktiv ? "bg-marke-gruen/15 text-ueberschrift hover:bg-marke-gruen/25" : "bg-flaeche-200 text-sekundaer hover:bg-flaeche-300")
            }
          >
            {vorlage.aktiv ? "Aktiv" : "Inaktiv"}
          </button>
        </form>
      </td>
      <td className="px-4 py-3 text-right">
        <form
          action={loeschenAktion.bind(null, vorlage.id)}
          onSubmit={(ereignis) => {
            if (!confirm(`"${vorlage.titel}" wirklich löschen? Das kann nicht rückgängig gemacht werden.`)) ereignis.preventDefault()
          }}
        >
          <button
            type="submit"
            aria-label={`${vorlage.titel} löschen`}
            title="Löschen"
            className="rounded-lg p-1.5 text-tertiaer transition hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </form>
      </td>
    </tr>
  )
}
