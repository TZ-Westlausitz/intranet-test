"use client"

import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"

import { PersonenAuswahl } from "@/components/personen-auswahl"
import type { Person } from "@/components/termin-form-felder"
import {
  formulareModulPlatzieren,
  kontakteModulPlatzieren,
  modulEntfernen,
  modulPlatzieren,
  rasterLueckenFuellen,
  wissensbereichModulPlatzieren,
} from "@/lib/startseite/aktionen"
import {
  belegteZellen,
  brauchtUnterauswahl,
  FORMULARE_MAX_SHORTCUTS,
  KONTAKTE_MAX,
  KONTAKTE_MIN,
  modulAkzentKlassen,
  modulName,
  platzierungPasst,
  STARTSEITE_MODUL_KATALOG,
  WISSENSBEREICH_MAX_ORDNER_HOCH,
  type StartseiteForm,
  type StartseiteModulId,
  type StartseitePlatzierung,
} from "@/lib/startseite/raster"
import { SpeichernKnopf } from "@/components/speichern-knopf"

/** Kurzer Zusatz zum Modulnamen im Auswahl-Pop-up, wenn ein Modul mehrere Formen erlaubt (siehe STARTSEITE_MODUL_KATALOG) — bei nur einer möglichen Form (die meisten Module) bleibt der Name pur. */
const FORM_HINWEIS: Record<StartseiteForm, string> = {
  KLEIN: "",
  BREIT: "breit (2×1)",
  HOCH: "hoch (1×2)",
  GROSS: "groß (2×2)",
}

/**
 * Feste Grid-Position + Ausdehnung für eine Vorschau-Zelle — ohne
 * `gridColumnStart`/`gridRowStart` platziert der Browser die Kästchen
 * per Auto-Flow einfach der Reihe nach (die freien "+"-Felder sind ja
 * echte Lücken im DOM, keine leeren Platzhalter), das hat vorher an
 * genau der Stelle belegte Nachbarzellen und die Zeilenzuordnung
 * durcheinandergebracht (Rückmeldung 2026-09-28: HOCH/BREIT landeten an
 * der falschen Stelle bzw. verschluckten die falschen Zellen).
 */
function vorschauPosition(position: number, form: StartseiteForm): React.CSSProperties {
  const spalte = (position % 4) + 1
  const zeile = Math.floor(position / 4) + 1
  const spaltenSpanne = form === "GROSS" || form === "BREIT" ? 2 : 1
  const zeilenSpanne = form === "GROSS" || form === "HOCH" ? 2 : 1
  // Immer die Kurzform mit vollem "start / span N" setzen — nie mit
  // gridColumnStart/gridRowStart mischen, sonst warnt React bei einem
  // Re-Render vor widersprüchlichen Style-Werten zwischen den Renders.
  return {
    gridColumn: `${spalte} / span ${spaltenSpanne}`,
    gridRow: `${zeile} / span ${zeilenSpanne}`,
  }
}

type OrdnerAuswahlEintrag = { id: string; name: string; artikelAnzahl: number }
type VorlagenAuswahlEintrag = { id: string; titel: string }

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
  vorlagenListe,
}: {
  raster: StartseitePlatzierung[]
  personen: Person[]
  ordnerListe: OrdnerAuswahlEintrag[]
  vorlagenListe: VorlagenAuswahlEintrag[]
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [offenePosition, setOffenePosition] = useState<number | null>(null)
  const [schritt, setSchritt] = useState<"modul" | "kontakte" | "wissensbereich" | "formulare">("modul")
  const [gewaehlteForm, setGewaehlteForm] = useState<StartseiteForm | null>(null)
  const [bearbeitetePlatzierung, setBearbeitetePlatzierung] = useState<StartseitePlatzierung | null>(null)
  const [ordnerAuswahl, setOrdnerAuswahl] = useState<string[]>([])
  const [formularAuswahl, setFormularAuswahl] = useState<string[]>([])

  // Rückmeldung 2026-09-30: "alle 8 Plätze sollen immer eine Belegung
  // haben, nie frei bleiben dürfen" — beim Verlassen dieser Seite (echtes
  // Unmounten, z. B. Klick auf einen anderen Menüpunkt oder "← Zurück")
  // füllt rasterLueckenFuellen() etwaige Lücken automatisch auf. Bewusst
  // beim Verlassen statt bei jeder einzelnen Änderung, damit man
  // zwischendurch (z. B. beim Tausch "erst entfernen, dann neu platzieren")
  // kurz eine leere Zelle sehen darf, ohne dass sofort etwas
  // hineingesetzt wird. Deckt nicht Tab schließen/Neuladen ab (kein
  // verlässlicher Weg, dabei noch eine Server Action abzuschließen) —
  // dieselbe Einschränkung wie bei FormularAenderungenSchutz.
  useEffect(() => {
    return () => {
      rasterLueckenFuellen()
    }
  }, [])

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

  function schrittFuer(modul: StartseiteModulId): "kontakte" | "wissensbereich" | "formulare" {
    if (modul === "KONTAKTE") return "kontakte"
    if (modul === "FORMULARE") return "formulare"
    return "wissensbereich"
  }

  function unterauswahlBearbeiten(platzierung: StartseitePlatzierung) {
    setOffenePosition(platzierung.position)
    setBearbeitetePlatzierung(platzierung)
    setGewaehlteForm(platzierung.form)
    setOrdnerAuswahl(platzierung.ordnerIds ?? [])
    setFormularAuswahl(platzierung.formularIds ?? [])
    setSchritt(schrittFuer(platzierung.modul))
    dialogRef.current?.showModal()
  }

  function modulGewaehlt(modul: StartseiteModulId, form: StartseiteForm) {
    if (brauchtUnterauswahl(modul, form)) {
      setGewaehlteForm(form)
      setOrdnerAuswahl([])
      setFormularAuswahl([])
      setSchritt(schrittFuer(modul))
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

  function formularUmschalten(vorlageId: string) {
    setFormularAuswahl((bisher) => {
      if (bisher.includes(vorlageId)) return bisher.filter((id) => id !== vorlageId)
      if (bisher.length >= FORMULARE_MAX_SHORTCUTS) return bisher
      return [...bisher, vorlageId]
    })
  }

  return (
    <>
      {/* aspect-[2/1] am GANZEN Raster statt aspect-square an jeder
          einzelnen Zelle (Rückmeldung 2026-09-28: Formulare BREIT wurde
          genauso hoch wie Newsfeed) — aspect-square auf einer 2 Spalten
          breiten Zelle zwingt SIE SELBST auf die doppelte Zeilenhöhe,
          unabhängig von ihrer echten Grid-Platzierung (row: 2 / span 1
          stimmte schon, nur die Höhe wurde vom Seitenverhältnis der
          Zelle überschrieben). Die Zellen füllen jetzt einfach ihre
          Grid-Spur (Standard-"stretch"), die Gesamthöhe kommt vom
          Container im echten 4:2-Seitenverhältnis der Startseite. */}
      <div className="grid aspect-[2/1] grid-cols-4 grid-rows-2 gap-3">
        {Array.from({ length: 8 }, (_, position) => {
          const anchor = raster.find((p) => p.position === position)

          if (anchor) {
            const editierbar = brauchtUnterauswahl(anchor.modul, anchor.form)
            return (
              <div
                key={position}
                style={vorschauPosition(position, anchor.form)}
                className={`relative flex flex-col items-center justify-center gap-1 rounded-2xl border border-x-rand border-b-rand border-t-4 ${modulAkzentKlassen(anchor.modul)} bg-flaeche p-2 text-center shadow-sm`}
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
                      {anchor.modul === "KONTAKTE" && `${anchor.personenIds?.length ?? 0} Personen — bearbeiten`}
                      {anchor.modul === "WISSENSBEREICH" && `${anchor.ordnerIds?.length ?? 0} Ordner — bearbeiten`}
                      {anchor.modul === "FORMULARE" && `${anchor.formularIds?.length ?? 0} Formulare — bearbeiten`}
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
              style={vorschauPosition(position, "KLEIN")}
              onClick={() => neueZelleOeffnen(position)}
              aria-label="Modul für dieses Feld auswählen"
              className="flex items-center justify-center rounded-2xl border border-dashed border-flaeche-300 text-3xl text-tertiaer transition hover:border-marke-gruen hover:text-marke-gruen-dunkel"
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
                  brauchtUnterauswahl(modul, form) ? (
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
              <SpeichernKnopf
                type="submit"
                className="h-9 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
              >
                Speichern
              </SpeichernKnopf>
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
              <SpeichernKnopf
                type="submit"
                disabled={ordnerAuswahl.length === 0}
                className="h-9 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel disabled:cursor-not-allowed disabled:opacity-50"
              >
                Speichern
              </SpeichernKnopf>
            </div>
          </form>
        )}

        {schritt === "formulare" && gewaehlteForm && (
          <form
            action={formulareModulPlatzieren.bind(null, offenePosition ?? -1, gewaehlteForm)}
            onSubmit={() => window.setTimeout(() => dialogRef.current?.close(), 0)}
          >
            <div className="border-b border-rand px-5 py-4">
              <h2 className="text-lg font-semibold text-ueberschrift">Formulare für den Schnellzugriff</h2>
              <p className="mt-1 text-xs text-sekundaer">Bis zu {FORMULARE_MAX_SHORTCUTS} eigene, verfügbare Vorlagen.</p>
            </div>

            <div className="flex max-h-[50vh] flex-col gap-1 overflow-y-auto px-3 py-3">
              {vorlagenListe.length === 0 ? (
                <p className="px-2 py-2 text-sm text-sekundaer">Keine Formulare für dich freigeschaltet.</p>
              ) : (
                vorlagenListe.map((vorlage) => {
                  const ausgewaehlt = formularAuswahl.includes(vorlage.id)
                  const deaktiviert = !ausgewaehlt && formularAuswahl.length >= FORMULARE_MAX_SHORTCUTS
                  return (
                    <label
                      key={vorlage.id}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-primaer hover:bg-flaeche-100 ${deaktiviert ? "opacity-50" : ""}`}
                    >
                      <input
                        type="checkbox"
                        name="vorlagen"
                        value={vorlage.id}
                        checked={ausgewaehlt}
                        disabled={deaktiviert}
                        onChange={() => formularUmschalten(vorlage.id)}
                        className="h-4 w-4"
                      />
                      {vorlage.titel}
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
              <SpeichernKnopf
                type="submit"
                disabled={formularAuswahl.length === 0}
                className="h-9 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel disabled:cursor-not-allowed disabled:opacity-50"
              >
                Speichern
              </SpeichernKnopf>
            </div>
          </form>
        )}
      </dialog>
    </>
  )
}
