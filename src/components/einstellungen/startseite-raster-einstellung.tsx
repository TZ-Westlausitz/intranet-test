"use client"

import { useRef, useState } from "react"
import { X } from "lucide-react"

import { PersonenAuswahl } from "@/components/personen-auswahl"
import type { Person } from "@/components/termin-form-felder"
import {
  kontakteModulPlatzieren,
  modulEntfernen,
  modulPlatzieren,
  wissensbereichModulPlatzieren,
} from "@/lib/startseite/aktionen"
import {
  belegteZellen,
  brauchtUnterauswahl,
  KONTAKTE_MAX,
  KONTAKTE_MIN,
  modulName,
  platzierungPasst,
  STARTSEITE_MODUL_KATALOG,
  WISSENSBEREICH_MAX_ORDNER_HOCH,
  type StartseiteForm,
  type StartseiteModulId,
  type StartseitePlatzierung,
} from "@/lib/startseite/raster"

/** Randfarbe je Modul — identisch zur jeweiligen echten Kachel auf der Startseite (Muster: die einzelnen Kachel-Komponenten in src/components/startseite/). */
const RAHMENFARBE: Record<StartseiteModulId, string> = {
  NEWSFEED: "border-t-marke-gruen",
  KALENDER: "border-t-marke-orange",
  AUFGABEN: "border-t-marke-gruen-dunkel",
  WISSENSBEREICH: "border-t-marke-orange",
  FORMULARE: "border-t-marke-gruen-dunkel",
  KONTAKTE: "border-t-marke-gruen",
  FAHRZEUGE: "border-t-marke-gruen",
  TODO_LISTE: "border-t-marke-gruen",
  GEPLANTE_AKTIONEN: "border-t-marke-gruen",
}

/** Kurzer Zusatz zum Modulnamen im Auswahl-Pop-up, wenn ein Modul mehrere Formen erlaubt (siehe STARTSEITE_MODUL_KATALOG) — bei nur einer möglichen Form (die meisten Module) bleibt der Name pur. */
const FORM_HINWEIS: Record<StartseiteForm, string> = {
  KLEIN: "",
  BREIT: "breit (2×1)",
  HOCH: "hoch (1×2)",
  GROSS: "groß (2×2)",
}

function vorschauSpan(form: StartseiteForm): React.CSSProperties | undefined {
  if (form === "GROSS") return { gridColumn: "span 2", gridRow: "span 2" }
  if (form === "BREIT") return { gridColumn: "span 2" }
  if (form === "HOCH") return { gridRow: "span 2" }
  return undefined
}

type OrdnerAuswahlEintrag = { id: string; name: string; artikelAnzahl: number }

/**
 * Die 8 Rasterfelder als kleine, klickbare Skizze — Vorschau der echten
 * Startseiten-Anordnung (Tablet/Desktop, siehe src/app/page.tsx und
 * src/lib/startseite/raster.ts). Belegte Felder zeigen einen farbigen
 * Rand + Modulnamen und ein Kreuz zum Entfernen, leere Felder öffnen per
 * Klick ein Pop-up mit den Modulen, die dort passen (Schritt 1). KONTAKTE
 * und WISSENSBEREICH brauchen danach einen zweiten Schritt (Personen- bzw.
 * Ordner-Auswahl) — bei ihnen öffnet auch ein Klick auf die BELEGTE Kachel
 * (statt nur das Kreuz) direkt diesen zweiten Schritt wieder, vorausgefüllt,
 * um die Auswahl zu ändern; Form/Position ändern geht nur über Entfernen +
 * neu Platzieren.
 *
 * Jede Aktion speichert sofort — kein separater "Speichern"-Knopf für
 * Modul-ohne-Unterauswahl und fürs Entfernen (Muster: WissensOrdnerKachel),
 * nur die beiden Unterauswahl-Schritte haben einen eigenen Speichern-Knopf,
 * weil dort erst eine Mehrfachauswahl getroffen werden muss.
 */
export function StartseiteRasterEinstellung({
  raster,
  personen,
  ordnerListe,
}: {
  raster: StartseitePlatzierung[]
  personen: Person[]
  ordnerListe: OrdnerAuswahlEintrag[]
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [offenePosition, setOffenePosition] = useState<number | null>(null)
  const [schritt, setSchritt] = useState<"modul" | "kontakte" | "wissensbereich">("modul")
  const [gewaehlteForm, setGewaehlteForm] = useState<StartseiteForm | null>(null)
  const [bearbeitetePlatzierung, setBearbeitetePlatzierung] = useState<StartseitePlatzierung | null>(null)
  const [ordnerAuswahl, setOrdnerAuswahl] = useState<string[]>([])

  const belegteZellenNachPosition = new Map<number, StartseiteModulId>()
  for (const platzierung of raster) {
    for (const zelle of belegteZellen(platzierung)) belegteZellenNachPosition.set(zelle, platzierung.modul)
  }

  function neueZelleOeffnen(position: number) {
    setOffenePosition(position)
    setBearbeitetePlatzierung(null)
    setSchritt("modul")
    dialogRef.current?.showModal()
  }

  function unterauswahlBearbeiten(platzierung: StartseitePlatzierung) {
    setOffenePosition(platzierung.position)
    setBearbeitetePlatzierung(platzierung)
    setGewaehlteForm(platzierung.form)
    setOrdnerAuswahl(platzierung.ordnerIds ?? [])
    setSchritt(platzierung.modul === "KONTAKTE" ? "kontakte" : "wissensbereich")
    dialogRef.current?.showModal()
  }

  function modulGewaehlt(modul: StartseiteModulId, form: StartseiteForm) {
    if (brauchtUnterauswahl(modul)) {
      setGewaehlteForm(form)
      setOrdnerAuswahl([])
      setSchritt(modul === "KONTAKTE" ? "kontakte" : "wissensbereich")
    }
    // Module ohne Unterauswahl platzieren sich selbst über ihr eigenes
    // <form> im Rendern unten (siehe passendeOptionen) und schließen den
    // Dialog über onSubmit.
  }

  const passendeOptionen =
    offenePosition === null
      ? []
      : STARTSEITE_MODUL_KATALOG.filter((m) => !raster.some((p) => p.modul === m.id)).flatMap((m) =>
          m.formen
            .filter((form) => platzierungPasst(raster, offenePosition, m.id, form))
            .map((form) => ({ modul: m.id, name: m.name, form }))
        )

  const maxOrdner = gewaehlteForm === "HOCH" ? WISSENSBEREICH_MAX_ORDNER_HOCH : 1

  function ordnerUmschalten(ordnerId: string) {
    setOrdnerAuswahl((bisher) => {
      if (bisher.includes(ordnerId)) return bisher.filter((id) => id !== ordnerId)
      if (bisher.length >= maxOrdner) return maxOrdner === 1 ? [ordnerId] : bisher
      return [...bisher, ordnerId]
    })
  }

  return (
    <>
      <div className="grid grid-cols-4 grid-rows-2 gap-3">
        {Array.from({ length: 8 }, (_, position) => {
          const anchor = raster.find((p) => p.position === position)

          if (anchor) {
            const editierbar = brauchtUnterauswahl(anchor.modul)
            return (
              <div
                key={position}
                style={vorschauSpan(anchor.form)}
                className={`relative flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border border-x-rand border-b-rand border-t-4 ${RAHMENFARBE[anchor.modul]} bg-flaeche p-2 text-center shadow-sm`}
              >
                <form action={modulEntfernen.bind(null, anchor.modul)} className="absolute top-2 right-2">
                  <button
                    type="submit"
                    aria-label={`${modulName(anchor.modul)} entfernen`}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-tertiaer transition hover:bg-red-50 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </form>

                {editierbar ? (
                  <button
                    type="button"
                    onClick={() => unterauswahlBearbeiten(anchor)}
                    className="flex flex-col items-center gap-1 rounded-lg px-2 py-1 text-center hover:underline"
                  >
                    <span className="text-sm font-semibold text-ueberschrift sm:text-base">{modulName(anchor.modul)}</span>
                    <span className="text-xs text-sekundaer">
                      {anchor.modul === "KONTAKTE"
                        ? `${anchor.personenIds?.length ?? 0} Personen — bearbeiten`
                        : `${anchor.ordnerIds?.length ?? 0} Ordner — bearbeiten`}
                    </span>
                  </button>
                ) : (
                  <span className="px-1 text-sm font-semibold text-ueberschrift sm:text-base">{modulName(anchor.modul)}</span>
                )}
              </div>
            )
          }

          // Von einer breiteren Platzierung (GROSS/BREIT/HOCH) mitbelegte Nachbarzelle — eigenes Feld bleibt unsichtbar, die Anker-Zelle deckt sie optisch ab.
          if (belegteZellenNachPosition.has(position)) return null

          return (
            <button
              key={position}
              type="button"
              onClick={() => neueZelleOeffnen(position)}
              aria-label="Modul für dieses Feld auswählen"
              className="flex aspect-square items-center justify-center rounded-2xl border border-dashed border-flaeche-300 text-3xl text-tertiaer transition hover:border-marke-gruen hover:text-marke-gruen-dunkel"
            >
              +
            </button>
          )
        })}
      </div>

      <dialog
        ref={dialogRef}
        onClose={() => {
          setOffenePosition(null)
          setBearbeitetePlatzierung(null)
        }}
        className="fixed top-1/2 left-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rand bg-flaeche p-0 shadow-xl backdrop:bg-neutral-900/40"
      >
        {schritt === "modul" && (
          <>
            <div className="border-b border-rand px-5 py-4">
              <h2 className="text-lg font-semibold text-ueberschrift">Modul auswählen</h2>
            </div>

            <div className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto px-3 py-3">
              {passendeOptionen.length === 0 ? (
                <p className="px-2 py-2 text-sm text-sekundaer">Kein passendes Modul mehr übrig für dieses Feld.</p>
              ) : (
                passendeOptionen.map(({ modul, name, form }) =>
                  brauchtUnterauswahl(modul) ? (
                    <button
                      key={`${modul}-${form}`}
                      type="button"
                      onClick={() => modulGewaehlt(modul, form)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm text-primaer transition hover:bg-marke-gruen/10"
                    >
                      <span>{name}</span>
                      {FORM_HINWEIS[form] && <span className="text-xs text-tertiaer">{FORM_HINWEIS[form]}</span>}
                    </button>
                  ) : (
                    <form
                      key={`${modul}-${form}`}
                      action={modulPlatzieren.bind(null, offenePosition ?? -1, modul, form)}
                      onSubmit={() => window.setTimeout(() => dialogRef.current?.close(), 0)}
                    >
                      <button
                        type="submit"
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm text-primaer transition hover:bg-marke-gruen/10"
                      >
                        <span>{name}</span>
                        {FORM_HINWEIS[form] && <span className="text-xs text-tertiaer">{FORM_HINWEIS[form]}</span>}
                      </button>
                    </form>
                  )
                )
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-rand px-5 py-3">
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="h-9 rounded-lg px-3 text-sm font-medium text-primaer transition hover:bg-flaeche-100"
              >
                Abbrechen
              </button>
            </div>
          </>
        )}

        {schritt === "kontakte" && gewaehlteForm && (
          <form
            action={kontakteModulPlatzieren.bind(null, offenePosition ?? -1, gewaehlteForm)}
            onSubmit={() => window.setTimeout(() => dialogRef.current?.close(), 0)}
          >
            <div className="border-b border-rand px-5 py-4">
              <h2 className="text-lg font-semibold text-ueberschrift">Kontakte auswählen</h2>
              <p className="mt-1 text-xs text-sekundaer">
                {KONTAKTE_MIN} bis {KONTAKTE_MAX} Personen.
              </p>
            </div>

            <div className="px-5 py-4">
              <PersonenAuswahl personen={personen} ausgewaehlteIds={bearbeitetePlatzierung?.personenIds ?? []} name="teilnehmer" />
            </div>

            <div className="flex justify-end gap-2 border-t border-rand px-5 py-3">
              {!bearbeitetePlatzierung && (
                <button
                  type="button"
                  onClick={() => setSchritt("modul")}
                  className="h-9 rounded-lg px-3 text-sm font-medium text-primaer transition hover:bg-flaeche-100"
                >
                  Zurück
                </button>
              )}
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
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
          </form>
        )}

        {schritt === "wissensbereich" && gewaehlteForm && (
          <form
            action={wissensbereichModulPlatzieren.bind(null, offenePosition ?? -1, gewaehlteForm)}
            onSubmit={() => window.setTimeout(() => dialogRef.current?.close(), 0)}
          >
            <div className="border-b border-rand px-5 py-4">
              <h2 className="text-lg font-semibold text-ueberschrift">Ordner auswählen</h2>
              <p className="mt-1 text-xs text-sekundaer">
                {maxOrdner === 1 ? "Ein Ordner." : `Bis zu ${maxOrdner} Ordner.`}
              </p>
            </div>

            <div className="flex max-h-[50vh] flex-col gap-1 overflow-y-auto px-3 py-3">
              {ordnerListe.length === 0 ? (
                <p className="px-2 py-2 text-sm text-sekundaer">Keine Ordner vorhanden.</p>
              ) : (
                ordnerListe.map((ordner) => {
                  const ausgewaehlt = ordnerAuswahl.includes(ordner.id)
                  return (
                    <label
                      key={ordner.id}
                      className="flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm text-primaer hover:bg-flaeche-100"
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type={maxOrdner === 1 ? "radio" : "checkbox"}
                          name="ordner"
                          value={ordner.id}
                          checked={ausgewaehlt}
                          onChange={() => ordnerUmschalten(ordner.id)}
                          className="h-4 w-4"
                        />
                        {ordner.name}
                      </span>
                      <span className="text-xs text-tertiaer">{ordner.artikelAnzahl}</span>
                    </label>
                  )
                })
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-rand px-5 py-3">
              {!bearbeitetePlatzierung && (
                <button
                  type="button"
                  onClick={() => setSchritt("modul")}
                  className="h-9 rounded-lg px-3 text-sm font-medium text-primaer transition hover:bg-flaeche-100"
                >
                  Zurück
                </button>
              )}
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="h-9 rounded-lg px-3 text-sm font-medium text-primaer transition hover:bg-flaeche-100"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={ordnerAuswahl.length === 0}
                className="h-9 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel disabled:cursor-not-allowed disabled:opacity-50"
              >
                Speichern
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  )
}
