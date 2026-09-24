"use client"

import { useRef } from "react"
import { Check, X } from "lucide-react"

import type { Person, TerminStandardwerte } from "@/components/termin-form-felder"
import { TerminBearbeitenDialog } from "@/components/termin-bearbeiten-dialog"
import { TerminInfoDialog, type TerminInfoDialogHandle } from "@/components/termin-info-dialog"
import type { TerminAnzeige } from "@/lib/termine/typen"
import { TerminTeilnahmeStatus } from "@/generated/prisma/enums"

export type TerminListenEintrag = TerminAnzeige & { beginnIso: string }

export type TerminListenAktionen = {
  personen: Person[]
  aktualisierenAktion: (terminId: string, formData: FormData) => void
  loeschenAktion: (terminId: string, formData: FormData) => void
  serieLoeschenAktion: (serieId: string, formData: FormData) => void
  serieAbHierLoeschenAktion: (terminId: string, formData: FormData) => void
  teilnahmeAktion: (terminId: string, status: TerminTeilnahmeStatus) => void
  kommentarAktion: (terminId: string, formData: FormData) => void
  rueckkehrJahr: number
  rueckkehrMonat: number
}

/**
 * Eine Zeile in einer Terminliste — eigene Komponente wegen des Refs auf
 * ihr eigenes Info-Pop-Up. Geteilt zwischen "Nächste Termine"
 * (TerminUebersicht) und den Suchergebnissen (TerminSuche), damit dieselbe
 * gleichmäßige Spaltendarstellung nicht zweimal gepflegt werden muss.
 *
 * Feste Spaltenbreiten (Datum/Titel/Beschreibung/Teilnehmer/Einstellungen)
 * statt variabler Flex-Breiten, die je nach vorhandenem Inhalt sprangen —
 * jede Zeile reserviert jede Spalte, auch wenn sie für diesen Termin leer
 * bleibt, damit die Liste unabhängig vom Inhalt gleichmäßig aussieht.
 *
 * Ein Klick auf die Zeile öffnet dasselbe Info-Pop-Up wie ein Klick auf
 * den Punkt im Kalenderblatt (TerminInfoDialog) — z. B. um an Anhänge zu
 * kommen, ohne extra ins Bearbeiten-Pop-Up zu müssen. Das Zahnrad bleibt
 * ein eigenes Klickziel daneben, nur für die erstellende Person.
 */
export function TerminZeile({ eintrag, aktionen }: { eintrag: TerminListenEintrag; aktionen: TerminListenAktionen }) {
  const infoRef = useRef<TerminInfoDialogHandle>(null)

  const standardwerte: TerminStandardwerte = {
    titel: eintrag.titel,
    ganztaegig: eintrag.ganztaegig,
    datum: eintrag.datum,
    von: eintrag.von,
    bis: eintrag.bis,
    vonDatum: eintrag.vonDatum,
    bisDatum: eintrag.bisDatum,
    beschreibung: eintrag.beschreibung ?? "",
    ort: eintrag.ort ?? "",
    farbe: eintrag.farbe,
    teilnehmerIds: eintrag.teilnehmer.map((t) => t.personId),
    erinnerungenMinuten: eintrag.erinnerungenMinuten,
    kommentareErlaubt: eintrag.kommentareErlaubt,
  }

  function beiZeileAktivieren() {
    infoRef.current?.oeffnen()
  }

  return (
    <li data-ziel={eintrag.id} className="grid grid-cols-1 gap-1 py-2.5 sm:grid-cols-[8rem_11rem_1fr_10rem_auto] sm:items-center sm:gap-3">
      {/* `contents` nimmt den Wrapper selbst aus dem Grid-Layout raus, ohne
          seine Kind-Spalten zu verschieben — so lässt sich der ganze
          Info-Bereich in EINEM Klickziel öffnen, ohne die 4 Spalten in
          eigene, separat klickbare Elemente aufteilen zu müssen. */}
      <div
        role="button"
        tabIndex={0}
        onClick={beiZeileAktivieren}
        onKeyDown={(ereignis) => {
          if (ereignis.key === "Enter" || ereignis.key === " ") {
            ereignis.preventDefault()
            beiZeileAktivieren()
          }
        }}
        className="contents"
      >
        <span className="shrink-0 cursor-pointer text-sm font-medium text-ueberschrift">
          {eintrag.datumAnzeige}
          {!eintrag.ganztaegig && <> · {eintrag.zeitraumAnzeige}</>}
        </span>
        <span className="shrink-0 cursor-pointer font-medium text-primaer">{eintrag.titel}</span>
        <span className="min-w-0 cursor-pointer truncate text-sm text-sekundaer">
          {eintrag.beschreibungVorschau}
        </span>
        <span className="cursor-pointer text-xs text-tertiaer sm:text-right">
          {eintrag.teilnehmer.map((t, i) => (
            <span key={t.personId}>
              {i > 0 && ", "}
              {t.name}
              {t.status === "ERSTELLER" && " (Ersteller)"}
              {t.status === TerminTeilnahmeStatus.ZUGESAGT && (
                <span className="ml-1 inline-flex align-text-bottom text-green-600" aria-label="hat zugesagt">
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}
              {t.status === TerminTeilnahmeStatus.ABGESAGT && (
                <span className="ml-1 inline-flex align-text-bottom text-red-600" aria-label="hat abgesagt">
                  <X className="h-3.5 w-3.5" />
                </span>
              )}
            </span>
          ))}
        </span>
      </div>

      <div className="flex justify-end">
        {eintrag.istErsteller && (
          <TerminBearbeitenDialog
            terminId={eintrag.id}
            serieId={eintrag.serieId}
            standardwerte={standardwerte}
            bestehendeAnhaenge={eintrag.anhaenge}
            personen={aktionen.personen}
            aktualisierenAktion={aktionen.aktualisierenAktion}
            loeschenAktion={aktionen.loeschenAktion}
            serieLoeschenAktion={aktionen.serieLoeschenAktion}
            serieAbHierLoeschenAktion={aktionen.serieAbHierLoeschenAktion}
            rueckkehrJahr={aktionen.rueckkehrJahr}
            rueckkehrMonat={aktionen.rueckkehrMonat}
          />
        )}
      </div>

      <TerminInfoDialog
        ref={infoRef}
        termin={eintrag}
        personen={aktionen.personen}
        aktualisierenAktion={aktionen.aktualisierenAktion}
        loeschenAktion={aktionen.loeschenAktion}
        serieLoeschenAktion={aktionen.serieLoeschenAktion}
        serieAbHierLoeschenAktion={aktionen.serieAbHierLoeschenAktion}
        teilnahmeAktion={aktionen.teilnahmeAktion}
        kommentarAktion={aktionen.kommentarAktion}
        rueckkehrJahr={aktionen.rueckkehrJahr}
        rueckkehrMonat={aktionen.rueckkehrMonat}
      />
    </li>
  )
}

/** Die reine Listendarstellung — Überschrift/Filter bleibt Sache des Aufrufers. */
export function TerminListe({
  eintraege,
  leerText,
  aktionen,
}: {
  eintraege: TerminListenEintrag[]
  leerText: string
  aktionen: TerminListenAktionen
}) {
  if (eintraege.length === 0) {
    return <p className="mt-3 text-sm text-sekundaer">{leerText}</p>
  }

  return (
    <ul className="mt-3 flex flex-col divide-y divide-flaeche-100">
      {eintraege.map((eintrag) => (
        <TerminZeile key={eintrag.id} eintrag={eintrag} aktionen={aktionen} />
      ))}
    </ul>
  )
}
