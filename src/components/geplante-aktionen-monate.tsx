import { WOCHENTAGE_KURZ } from "@/lib/kalender"
import { GeplanteAktionenTag, type GeplanteAktionenTagAnzeige } from "@/components/geplante-aktion-tag"
import type { InfoFormularOptionen } from "@/components/info-form-felder"

export type GeplanteAktionenMonatAnzeige = {
  jahr: number
  monatIndex0: number
  monatsname: string
  wochen: GeplanteAktionenTagAnzeige[][]
}

/**
 * Die drei Kalenderblätter für "Geplante Aktionen" — Muster: KalenderMonate,
 * aber ohne Feiertags-/Ferien-Checkboxen (kein eigener State nötig, daher
 * keine Client Component). Die Tage selbst kommen fertig berechnet von der
 * Seite (Server-Komponente).
 */
export function GeplanteAktionenMonate({
  monate,
  optionen,
  aktualisierenAktion,
  anhangLoeschenAktion,
  loeschenAktion,
  aufgabeAktualisierenAktion,
  aufgabeAnhangLoeschenAktion,
  aufgabeLoeschenAktion,
  auftragLoeschenAktion,
}: {
  monate: GeplanteAktionenMonatAnzeige[]
  optionen: InfoFormularOptionen
  aktualisierenAktion: (infoId: string, formData: FormData) => void
  anhangLoeschenAktion: (anhangId: string) => void
  loeschenAktion: (infoId: string) => void
  aufgabeAktualisierenAktion: (aufgabeId: string, formData: FormData) => void
  aufgabeAnhangLoeschenAktion: (anhangId: string) => void
  aufgabeLoeschenAktion: (aufgabeId: string) => void
  auftragLoeschenAktion: (auftragId: string) => void
}) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
      {monate.map((monat, index) => (
        <div
          key={`${monat.jahr}-${monat.monatIndex0}`}
          className={
            "overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm " +
            (index > 0 ? "hidden md:block" : "")
          }
        >
          <div className="border-b border-neutral-200 bg-gradient-to-r from-marke-gruen/15 via-marke-gruen/5 to-transparent px-4 py-3">
            <h2 className="font-semibold text-marke-grau">
              {monat.monatsname} {monat.jahr}
            </h2>
          </div>

          <div className="grid grid-cols-7 gap-1 px-3 pt-3 text-center text-xs font-medium text-neutral-400">
            {WOCHENTAGE_KURZ.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 p-3">
            {monat.wochen.flat().map((tag) => (
              <GeplanteAktionenTag
                key={tag.datumIso}
                tag={tag}
                optionen={optionen}
                aktualisierenAktion={aktualisierenAktion}
                anhangLoeschenAktion={anhangLoeschenAktion}
                loeschenAktion={loeschenAktion}
                aufgabeAktualisierenAktion={aufgabeAktualisierenAktion}
                aufgabeAnhangLoeschenAktion={aufgabeAnhangLoeschenAktion}
                aufgabeLoeschenAktion={aufgabeLoeschenAktion}
                auftragLoeschenAktion={auftragLoeschenAktion}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
