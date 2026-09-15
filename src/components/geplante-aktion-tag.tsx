"use client"

import { useRef } from "react"

import { GeplanteAktionPunkt, type GeplanteAktionPunktHandle } from "@/components/geplante-aktion-punkt"
import { GeplanteAufgabePunkt } from "@/components/geplante-aufgabe-punkt"
import { GeplanteAuftragPunkt } from "@/components/geplante-auftrag-punkt"
import type { InfoFormularOptionen } from "@/components/info-form-felder"
import type { infosGeplantFuerZeitraum } from "@/lib/infos/abfragen"
import type { aufgabenGeplantFuerZeitraum } from "@/lib/aufgaben/abfragen"
import type { auftraegeGeplantFuerZeitraum } from "@/lib/auftraege/abfragen"

export type GeplanteAktionenEintrag =
  | { typ: "info"; info: Awaited<ReturnType<typeof infosGeplantFuerZeitraum>>[number] }
  | { typ: "aufgabe"; aufgabe: Awaited<ReturnType<typeof aufgabenGeplantFuerZeitraum>>[number] }
  | { typ: "auftrag"; auftrag: Awaited<ReturnType<typeof auftraegeGeplantFuerZeitraum>>[number] }

export type GeplanteAktionenTagAnzeige = {
  datumIso: string
  tag: number
  imAktuellenMonat: boolean
  istHeute: boolean
  /** Infos und Aufgaben gemeinsam, bereits nach Zeit sortiert (siehe geplante-aktionen/page.tsx). */
  eintraege: GeplanteAktionenEintrag[]
}

/**
 * Eine Kalendertag-Zelle für "Geplante Aktionen" — Muster:
 * KalenderTagZelle, aber ohne Feiertags-/Ferien-Logik (die gibt es hier
 * nicht). Zeigt Infos (orange) und Aufgaben (blau) gemeinsam. Klick auf die
 * Tageszahl öffnet denselben ersten Punkt wie ein Klick auf den Punkt
 * selbst — größere, leichter zu treffende Fläche.
 */
export function GeplanteAktionenTag({
  tag,
  optionen,
  aktualisierenAktion,
  anhangLoeschenAktion,
  loeschenAktion,
  aufgabeAktualisierenAktion,
  aufgabeAnhangLoeschenAktion,
  aufgabeLoeschenAktion,
  auftragLoeschenAktion,
}: {
  tag: GeplanteAktionenTagAnzeige
  optionen: InfoFormularOptionen
  aktualisierenAktion: (infoId: string, formData: FormData) => void
  anhangLoeschenAktion: (anhangId: string) => void
  loeschenAktion: (infoId: string) => void
  aufgabeAktualisierenAktion: (aufgabeId: string, formData: FormData) => void
  aufgabeAnhangLoeschenAktion: (anhangId: string) => void
  aufgabeLoeschenAktion: (aufgabeId: string) => void
  auftragLoeschenAktion: (auftragId: string) => void
}) {
  const ersterPunktRef = useRef<GeplanteAktionPunktHandle>(null)

  const hatEintraege = tag.eintraege.length > 0
  const titelVonEintrag = (eintrag: GeplanteAktionenEintrag) =>
    eintrag.typ === "info" ? eintrag.info.titel : eintrag.typ === "aufgabe" ? eintrag.aufgabe.titel : eintrag.auftrag.titel
  const titel = tag.eintraege.map(titelVonEintrag).join(" · ")

  return (
    <div className="flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg">
      <div
        title={titel || undefined}
        role={hatEintraege ? "button" : undefined}
        tabIndex={hatEintraege ? 0 : undefined}
        onClick={hatEintraege ? () => ersterPunktRef.current?.oeffnen() : undefined}
        onKeyDown={
          hatEintraege
            ? (ereignis) => {
                if (ereignis.key === "Enter" || ereignis.key === " ") {
                  ereignis.preventDefault()
                  ersterPunktRef.current?.oeffnen()
                }
              }
            : undefined
        }
        className={
          "flex h-6 w-6 items-center justify-center rounded-full text-sm sm:h-7 sm:w-7 " +
          (hatEintraege ? "cursor-pointer " : "") +
          (tag.istHeute
            ? "bg-marke-gruen font-semibold text-neutral-900"
            : tag.imAktuellenMonat
              ? "text-primaer"
              : "text-neutral-300")
        }
      >
        {tag.tag}
      </div>

      {hatEintraege && (
        <div className="flex h-1.5 items-center gap-0.5">
          {tag.eintraege.slice(0, 3).map((eintrag, index) => {
            if (eintrag.typ === "info") {
              return (
                <GeplanteAktionPunkt
                  key={eintrag.info.id}
                  ref={index === 0 ? ersterPunktRef : undefined}
                  info={eintrag.info}
                  optionen={optionen}
                  aktualisierenAktion={aktualisierenAktion}
                  anhangLoeschenAktion={anhangLoeschenAktion}
                  loeschenAktion={loeschenAktion}
                />
              )
            }
            if (eintrag.typ === "aufgabe") {
              return (
                <GeplanteAufgabePunkt
                  key={eintrag.aufgabe.id}
                  ref={index === 0 ? ersterPunktRef : undefined}
                  aufgabe={eintrag.aufgabe}
                  aktualisierenAktion={aufgabeAktualisierenAktion}
                  anhangLoeschenAktion={aufgabeAnhangLoeschenAktion}
                  loeschenAktion={aufgabeLoeschenAktion}
                />
              )
            }
            return (
              <GeplanteAuftragPunkt
                key={eintrag.auftrag.id}
                ref={index === 0 ? ersterPunktRef : undefined}
                auftrag={eintrag.auftrag}
                loeschenAktion={auftragLoeschenAktion}
              />
            )
          })}
          {tag.eintraege.length > 3 && (
            <span className="text-[9px] leading-none text-tertiaer">+{tag.eintraege.length - 3}</span>
          )}
        </div>
      )}
    </div>
  )
}
