"use client"

import { useEffect, useId, useRef, useState } from "react"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"

import { FormularElementTyp } from "@/generated/prisma/enums"
import type { Person } from "@/components/termin-form-felder"
import { InfoEmpfaengerAuswahl } from "@/components/info-empfaenger-auswahl"
import { RichTextEditor } from "@/components/rich-text-editor"
import {
  FormularFeld,
  RICH_TEXT_ANZEIGE_KLASSE,
  formularElementSichtbar,
  formularTriggerIds,
} from "@/components/formular-feld"
import { EntwurfBestaetigenDialog } from "@/components/entwurf-bestaetigen-dialog"

const TYP_LABEL: Record<FormularElementTyp, string> = {
  TEXT_EINZEILIG: "Text (einzeilig)",
  TEXT_MEHRZEILIG: "Text (mehrzeilig)",
  ZAHL: "Zahl",
  DATUM: "Datum",
  AUSWAHL_EINZEL: "Auswahl (eine Option)",
  AUSWAHL_MEHRFACH: "Auswahl (mehrere Optionen)",
  CHECKBOX: "Checkliste-Punkt",
  DATEI: "Datei-Anhang",
  ORT: "Ort (aus Verwaltung)",
  TEXTBLOCK: "Textblock / Erklärung",
  TRENNZEICHEN: "Trennlinie",
}
const AUSWAHL_TYPEN = new Set<FormularElementTyp>([FormularElementTyp.AUSWAHL_EINZEL, FormularElementTyp.AUSWAHL_MEHRFACH])
const TRENNZEICHEN_STIL_LABEL: Record<string, string> = {
  DURCHGEZOGEN: "Durchgezogene Linie",
  GESTRICHELT: "Gestrichelte Linie",
  PUNKTIERT: "Punktierte Linie",
}

type BuilderElement = {
  clientId: string
  typ: FormularElementTyp
  label: string
  pflicht: boolean
  inhalt: string
  optionen: string[]
  /** Bedingung: nur anzeigen, wenn das Element mit dieser clientId (muss AUSWAHL_EINZEL sein) `bedingungWert` beantwortet ist. `null` = immer sichtbar. */
  bedingungClientId: string | null
  bedingungWert: string | null
}

function leeresElement(typ: FormularElementTyp): BuilderElement {
  return {
    clientId: crypto.randomUUID(),
    typ,
    label: typ === FormularElementTyp.TRENNZEICHEN ? "DURCHGEZOGEN" : "",
    pflicht: false,
    inhalt: "",
    optionen: AUSWAHL_TYPEN.has(typ) ? ["", ""] : [],
    bedingungClientId: null,
    bedingungWert: null,
  }
}

/**
 * Ob die per Klick gewählte Bedingung eines Elements (an `elemente[index]`)
 * noch gültig ist — der Trigger existiert noch, steht noch VOR diesem
 * Element, ist noch AUSWAHL_EINZEL, und der gewählte Wert ist noch eine
 * seiner Optionen. Wird live neu berechnet statt nach jedem Löschen/
 * Umsortieren/Optionen-Bearbeiten aufwendig aufzuräumen — eine ungültig
 * gewordene Bedingung wird dadurch einfach ignoriert (Anzeige: "immer
 * sichtbar"), lebt aber im State weiter und greift automatisch wieder,
 * falls die Reihenfolge sich später wieder passend ändert.
 */
function bedingungGueltig(elemente: BuilderElement[], index: number): { triggerClientId: string; wert: string } | null {
  const element = elemente[index]
  if (!element.bedingungClientId || !element.bedingungWert) return null
  const triggerIndex = elemente.findIndex((e) => e.clientId === element.bedingungClientId)
  if (triggerIndex === -1 || triggerIndex >= index) return null
  const trigger = elemente[triggerIndex]
  if (trigger.typ !== FormularElementTyp.AUSWAHL_EINZEL) return null
  const optionen = trigger.optionen.map((o) => o.trim()).filter(Boolean)
  if (!optionen.includes(element.bedingungWert)) return null
  return { triggerClientId: trigger.clientId, wert: element.bedingungWert }
}

/**
 * Ein Element-Block im Baukasten — Drag-Griff, Typ-Label, die passenden
 * Eingaben, Entfernen-Knopf, und (falls es dafür infrage kommende Elemente
 * VOR diesem gibt) eine "Nur anzeigen, wenn …"-Bedingung — siehe
 * bedingungGueltig.
 */
function ElementBlock({
  element,
  moeglicheTrigger,
  aendern,
  entfernen,
}: {
  element: BuilderElement
  moeglicheTrigger: { clientId: string; label: string; optionen: string[] }[]
  aendern: (aenderung: Partial<BuilderElement>) => void
  entfernen: () => void
}) {
  const aktuellerTrigger = moeglicheTrigger.find((t) => t.clientId === element.bedingungClientId)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: element.clientId })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-xl border border-rand bg-flaeche p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label="Zum Sortieren ziehen"
            className="cursor-grab text-tertiaer hover:text-primaer active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <span className="text-xs font-semibold tracking-wide text-tertiaer uppercase">{TYP_LABEL[element.typ]}</span>
        </div>
        <button type="button" onClick={entfernen} className="text-xs text-tertiaer hover:text-red-600">
          Entfernen
        </button>
      </div>

      {element.typ === FormularElementTyp.TEXTBLOCK ? (
        <RichTextEditor name={`__inhalt_${element.clientId}`} defaultValue={element.inhalt} />
      ) : element.typ === FormularElementTyp.TRENNZEICHEN ? (
        <select
          value={element.label}
          onChange={(e) => aendern({ label: e.target.value })}
          className="h-9 rounded-lg border border-flaeche-300 px-2 text-sm"
        >
          {Object.entries(TRENNZEICHEN_STIL_LABEL).map(([wert, text]) => (
            <option key={wert} value={wert}>
              {text}
            </option>
          ))}
        </select>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={element.label}
              onChange={(e) => aendern({ label: e.target.value })}
              placeholder="Beschriftung"
              className="h-9 flex-1 rounded-lg border border-flaeche-300 px-2 text-sm"
            />
            <label className="flex shrink-0 items-center gap-1.5 text-xs text-primaer">
              <input
                type="checkbox"
                checked={element.pflicht}
                onChange={(e) => aendern({ pflicht: e.target.checked })}
                className="h-4 w-4 rounded border-flaeche-300"
              />
              Pflichtfeld
            </label>
          </div>

          {AUSWAHL_TYPEN.has(element.typ) && (
            <div className="mt-3 flex flex-col gap-1.5">
              {element.optionen.map((option, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => {
                      const optionen = [...element.optionen]
                      optionen[index] = e.target.value
                      aendern({ optionen })
                    }}
                    placeholder={`Option ${index + 1}`}
                    className="h-8 flex-1 rounded-lg border border-flaeche-300 px-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => aendern({ optionen: element.optionen.filter((_, i) => i !== index) })}
                    aria-label="Option entfernen"
                    className="flex h-8 w-8 items-center justify-center text-tertiaer hover:text-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => aendern({ optionen: [...element.optionen, ""] })}
                className="self-start text-xs font-medium text-marke-gruen-dunkel hover:underline"
              >
                + Option
              </button>
            </div>
          )}
        </>
      )}

      {moeglicheTrigger.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-flaeche-100 pt-3 text-xs text-primaer">
          <span className="font-medium">Nur anzeigen, wenn</span>
          <select
            value={aktuellerTrigger?.clientId ?? ""}
            onChange={(e) => aendern({ bedingungClientId: e.target.value || null, bedingungWert: null })}
            className="h-7 rounded-lg border border-flaeche-300 px-1.5"
          >
            <option value="">(immer anzeigen)</option>
            {moeglicheTrigger.map((t) => (
              <option key={t.clientId} value={t.clientId}>
                {t.label}
              </option>
            ))}
          </select>
          {aktuellerTrigger && (
            <>
              <span>=</span>
              <select
                value={aktuellerTrigger.optionen.includes(element.bedingungWert ?? "") ? (element.bedingungWert ?? "") : ""}
                onChange={(e) => aendern({ bedingungWert: e.target.value })}
                className="h-7 rounded-lg border border-flaeche-300 px-1.5"
              >
                <option value="" disabled>
                  Wert wählen …
                </option>
                {aktuellerTrigger.optionen.map((wert) => (
                  <option key={wert} value={wert}>
                    {wert}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function FormularBaukasten({
  vorlage,
  bearbeitbar,
  personen,
  gruppen,
  abteilungen,
  orte,
  speichernAktion,
  entwurfSpeichernAktion,
  dialogRef,
}: {
  vorlage?: {
    titel: string
    beschreibung: string | null
    pdfExport: boolean
    elemente: {
      id: string
      typ: FormularElementTyp
      label: string | null
      pflicht: boolean
      inhalt: string | null
      optionen: { wert: string }[]
      bedingungElementId?: string | null
      bedingungWert?: string | null
    }[]
    empfaengerPersonen: string[]
    empfaengerGruppen: string[]
    empfaengerAbteilungen: string[]
    benutzbarPersonen: string[]
    benutzbarGruppen: string[]
    benutzbarAbteilungen: string[]
  }
  bearbeitbar: boolean
  personen: Person[]
  gruppen: Person[]
  abteilungen: Person[]
  orte: { id: string; name: string }[]
  speichernAktion: (formData: FormData) => void
  /** Nur beim Anlegen gereicht (siehe FormularErstellenDialog) — schaltet die Entwurf-Nachfrage beim Abbrechen-Knopf/Escape frei (Rückmeldung 2026-09-09). */
  entwurfSpeichernAktion?: (formData: FormData) => void
  /** Der Pop-Up-Dialog, in dem der Baukasten beim Anlegen steckt (siehe FormularErstellenDialog) — nur beim Anlegen gesetzt, nie beim Bearbeiten (dort läuft der Baukasten weiterhin als normale Seite). */
  dialogRef?: React.RefObject<HTMLDialogElement | null>
}) {
  const id = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const entwurfKnopfRef = useRef<HTMLButtonElement>(null)
  const [entwurfNachfrageOffen, setEntwurfNachfrageOffen] = useState(false)
  const [titel, setTitel] = useState(vorlage?.titel ?? "")
  const [beschreibung, setBeschreibung] = useState(vorlage?.beschreibung ?? "")
  const [pdfExport, setPdfExport] = useState(vorlage?.pdfExport ?? false)
  const [elemente, setElemente] = useState<BuilderElement[]>(
    () =>
      vorlage?.elemente.map((e) => ({
        clientId: e.id,
        typ: e.typ,
        label: e.label ?? "",
        pflicht: e.pflicht,
        inhalt: e.inhalt ?? "",
        optionen: e.optionen.map((o) => o.wert),
        bedingungClientId: e.bedingungElementId ?? null,
        bedingungWert: e.bedingungWert ?? null,
      })) ?? [],
  )
  const [typPickerOffen, setTypPickerOffen] = useState(false)
  const [vorschauTriggerWerte, setVorschauTriggerWerte] = useState<Record<string, string>>({})

  // Nur beim Anlegen (kein `vorlage`-Prop) relevant — beim Bearbeiten
  // bestehender Formulare gilt weiterhin die normale Zurück-Navigation
  // ohne Nachfrage (siehe Plan, Rückmeldung 2026-09-09).
  const hatAenderungen = !vorlage && (titel.trim() !== "" || elemente.length > 0)

  const sensoren = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // Escape auf dem umschließenden Pop-Up (natives "cancel"-Ereignis, siehe
  // FormularErstellenDialog) abfangen, solange ungespeicherte Eingaben
  // vorliegen — sonst schließt der Dialog sofort und alles geht verloren.
  useEffect(() => {
    const dialog = dialogRef?.current
    if (!dialog) return
    function beiAbbrechen(ereignis: Event) {
      if (!hatAenderungen) return
      ereignis.preventDefault()
      setEntwurfNachfrageOffen(true)
    }
    dialog.addEventListener("cancel", beiAbbrechen)
    return () => dialog.removeEventListener("cancel", beiAbbrechen)
  }, [dialogRef, hatAenderungen])

  function abbrechenKlick() {
    if (!hatAenderungen) {
      dialogRef?.current?.close()
      return
    }
    setEntwurfNachfrageOffen(true)
  }

  function entwurfVerwerfen() {
    setEntwurfNachfrageOffen(false)
    dialogRef?.current?.close()
  }

  function entwurfSpeichern() {
    entwurfKnopfRef.current?.click()
  }

  function elementAendern(clientId: string, aenderung: Partial<BuilderElement>) {
    setElemente((bisher) => bisher.map((el) => (el.clientId === clientId ? { ...el, ...aenderung } : el)))
  }

  function elementHinzufuegen(typ: FormularElementTyp) {
    setElemente((bisher) => [...bisher, leeresElement(typ)])
    setTypPickerOffen(false)
  }

  function elementEntfernen(clientId: string) {
    setElemente((bisher) => bisher.filter((el) => el.clientId !== clientId))
  }

  function beiDragEnde(ereignis: DragEndEvent) {
    const { active, over } = ereignis
    if (!over || active.id === over.id) return
    setElemente((bisher) => {
      const von = bisher.findIndex((el) => el.clientId === active.id)
      const nach = bisher.findIndex((el) => el.clientId === over.id)
      return arrayMove(bisher, von, nach)
    })
  }

  // Für TEXTBLOCK-Elemente steht der Rich-Text-Inhalt nicht im "elemente"-JSON
  // (der Editor spiegelt ihn stattdessen in ein eigenes verstecktes Feld
  // __inhalt_<clientId>, siehe RichTextEditor) — beim Absenden hier wieder
  // aus dem DOM zusammengeführt, statt den Editor-State zusätzlich im
  // Eltern-State zu duplizieren.
  function elementeJsonBeiAbsenden(formEvent: React.FormEvent<HTMLFormElement>) {
    const form = formEvent.currentTarget
    const vollstaendig = elemente.map((el) => {
      if (el.typ !== FormularElementTyp.TEXTBLOCK) return el
      const feld = form.elements.namedItem(`__inhalt_${el.clientId}`) as HTMLInputElement | null
      return { ...el, inhalt: feld?.value ?? el.inhalt }
    })
    const feld = form.elements.namedItem("elemente") as HTMLInputElement
    feld.value = JSON.stringify(
      vollstaendig.map((el, index) => {
        const bedingung = bedingungGueltig(vollstaendig, index)
        return {
          typ: el.typ,
          label: el.label,
          pflicht: el.pflicht,
          inhalt: el.inhalt,
          optionen: el.optionen.map((o) => o.trim()).filter(Boolean),
          bedingungIndex: bedingung ? vollstaendig.findIndex((e) => e.clientId === bedingung.triggerClientId) : null,
          bedingungWert: bedingung ? bedingung.wert : null,
        }
      }),
    )
  }

  const vorschauElemente = elemente
    .map((el, index) => ({ el, bedingung: bedingungGueltig(elemente, index) }))
    .filter(({ el }) => el.typ === FormularElementTyp.TEXTBLOCK || el.label.trim())
    .map(({ el, bedingung }) => ({
      id: el.clientId,
      typ: el.typ,
      label: el.label || "(ohne Beschriftung)",
      pflicht: el.pflicht,
      inhalt: el.inhalt,
      optionen: el.optionen.filter(Boolean).map((wert) => ({ wert })),
      bedingungElementId: bedingung?.triggerClientId ?? null,
      bedingungWert: bedingung?.wert ?? null,
    }))
  const vorschauTriggerIds = formularTriggerIds(vorschauElemente)

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form
        ref={formRef}
        action={speichernAktion}
        onSubmit={elementeJsonBeiAbsenden}
        className="flex flex-col gap-5"
      >
        <input type="hidden" name="elemente" defaultValue="[]" />
        <div>
          <label htmlFor={`${id}-titel`} className="mb-1 block text-sm font-medium text-primaer">
            Titel
          </label>
          <input
            id={`${id}-titel`}
            name="titel"
            type="text"
            required
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            className="h-9 w-full rounded-lg border border-flaeche-300 px-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-primaer">Beschreibung</label>
          <RichTextEditor
            name="beschreibung"
            defaultValue={vorlage?.beschreibung ?? ""}
            bilderErlaubt
            tabelleErlaubt
            onChange={setBeschreibung}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-primaer">Empfänger der Einreichungen</label>
          <InfoEmpfaengerAuswahl
            abteilungen={abteilungen}
            gruppen={gruppen}
            personen={personen}
            ausgewaehlt={{
              abteilungen: vorlage?.empfaengerAbteilungen ?? [],
              gruppen: vorlage?.empfaengerGruppen ?? [],
              personen: vorlage?.empfaengerPersonen ?? [],
            }}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-primaer">Benutzbar für</label>
          <InfoEmpfaengerAuswahl
            abteilungen={abteilungen}
            gruppen={gruppen}
            personen={personen}
            ausgewaehlt={{
              abteilungen: vorlage?.benutzbarAbteilungen ?? [],
              gruppen: vorlage?.benutzbarGruppen ?? [],
              personen: vorlage?.benutzbarPersonen ?? [],
            }}
            feldnamen={{ abteilung: "benutzbarAbteilungen", gruppe: "benutzbarGruppen", person: "benutzbarPersonen" }}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-primaer">
          <input
            type="checkbox"
            name="pdfExport"
            checked={pdfExport}
            onChange={(e) => setPdfExport(e.target.checked)}
            className="h-4 w-4 rounded border-flaeche-300"
          />
          Ausgefüllte PDF bei jeder Einreichung erzeugen
        </label>

        <div className="border-t border-rand pt-5">
          <h2 className="mb-3 text-sm font-semibold text-ueberschrift">Elemente</h2>

          {!bearbeitbar && (
            <p className="mb-3 rounded-lg bg-flaeche-100 px-3 py-2 text-xs text-primaer">
              Dieses Formular hat bereits Einreichungen — die Elemente sind deshalb nicht mehr veränderbar, nur noch
              die Angaben oben.
            </p>
          )}

          {bearbeitbar ? (
            <DndContext sensors={sensoren} collisionDetection={closestCenter} onDragEnd={beiDragEnde}>
              <SortableContext items={elemente.map((e) => e.clientId)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-3">
                  {elemente.map((element, index) => (
                    <ElementBlock
                      key={element.clientId}
                      element={element}
                      moeglicheTrigger={elemente
                        .slice(0, index)
                        .filter(
                          (e) =>
                            e.typ === FormularElementTyp.AUSWAHL_EINZEL &&
                            e.label.trim() &&
                            e.optionen.some((o) => o.trim()),
                        )
                        .map((e) => ({ clientId: e.clientId, label: e.label, optionen: e.optionen.map((o) => o.trim()).filter(Boolean) }))}
                      aendern={(aenderung) => elementAendern(element.clientId, aenderung)}
                      entfernen={() => elementEntfernen(element.clientId)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="flex flex-col gap-2">
              {elemente.map((element) => (
                <div key={element.clientId} className="rounded-lg border border-rand px-3 py-2 text-sm">
                  <span className="text-xs font-semibold tracking-wide text-tertiaer uppercase">
                    {TYP_LABEL[element.typ]}
                  </span>
                  {element.typ === FormularElementTyp.TRENNZEICHEN ? (
                    <p className="text-primaer">{TRENNZEICHEN_STIL_LABEL[element.label] ?? element.label}</p>
                  ) : (
                    element.typ !== FormularElementTyp.TEXTBLOCK && <p className="text-primaer">{element.label}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {bearbeitbar && (
            <div className="relative mt-3">
              <button
                type="button"
                onClick={() => setTypPickerOffen((v) => !v)}
                className="h-9 rounded-lg border border-dashed border-flaeche-300 px-3 text-sm font-medium text-primaer hover:border-marke-gruen hover:text-ueberschrift"
              >
                + Element
              </button>
              {typPickerOffen && (
                <div className="absolute z-10 mt-1 w-64 overflow-hidden rounded-lg border border-rand bg-flaeche py-1 shadow-lg">
                  {(Object.keys(TYP_LABEL) as FormularElementTyp[]).map((typ) => (
                    <button
                      key={typ}
                      type="button"
                      onClick={() => elementHinzufuegen(typ)}
                      className="block w-full px-3 py-2 text-left text-sm text-primaer hover:bg-marke-gruen/10"
                    >
                      {TYP_LABEL[typ]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-2 flex items-center gap-3">
          <button
            type="submit"
            className="h-10 self-start rounded-lg bg-marke-gruen px-5 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
          >
            Speichern
          </button>
          {dialogRef && (
            <button
              type="button"
              onClick={abbrechenKlick}
              className="h-10 rounded-lg px-3 text-sm font-medium text-primaer transition hover:bg-flaeche-100"
            >
              Abbrechen
            </button>
          )}
        </div>

        {/* Verstecktes zweites Submit-Ziel im selben Formular (React
           erlaubt mehrere Server Actions pro <form> über `formAction` an
           EINEM Knopf) — so läuft beim Entwurf-Speichern exakt dieselbe
           `elementeJsonBeiAbsenden`-Serialisierung wie beim normalen
           Speichern, ohne sie zu duplizieren. */}
        {entwurfSpeichernAktion && (
          <button ref={entwurfKnopfRef} type="submit" formAction={entwurfSpeichernAktion} className="hidden" />
        )}
      </form>

      {!vorlage && (
        <EntwurfBestaetigenDialog
          offen={entwurfNachfrageOffen}
          onVerwerfen={entwurfVerwerfen}
          onEntwurfSpeichern={entwurfSpeichern}
          onZurueckZumBearbeiten={() => setEntwurfNachfrageOffen(false)}
        />
      )}

      {/* Bewusst AUSSERHALB des <form> — die Vorschau rendert dieselben
         FormularFeld-Komponenten inkl. "required", die sonst die
         Baukasten-Absendung blockieren würden, obwohl sie leer bleiben. */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <p className="mb-2 text-xs font-semibold tracking-wide text-tertiaer uppercase">Vorschau</p>
        <div className="rounded-xl border border-rand bg-flaeche p-5 shadow-sm">
          <h1 className="text-xl font-semibold text-ueberschrift">{titel || "(Titel)"}</h1>
          {beschreibung && (
            <div
              className={RICH_TEXT_ANZEIGE_KLASSE + " mt-2 text-primaer"}
              dangerouslySetInnerHTML={{ __html: beschreibung }}
            />
          )}
          <div className="mt-5 flex flex-col gap-5">
            {vorschauElemente.length === 0 ? (
              <p className="text-sm text-tertiaer">Noch keine Elemente hinzugefügt.</p>
            ) : (
              vorschauElemente
                .filter((element) => formularElementSichtbar(element, vorschauTriggerWerte))
                .map((element) => (
                  <FormularFeld
                    key={element.id}
                    element={element}
                    orte={orte}
                    wert={vorschauTriggerIds.has(element.id) ? (vorschauTriggerWerte[element.id] ?? "") : undefined}
                    aufWertAendern={
                      vorschauTriggerIds.has(element.id)
                        ? (wert) => setVorschauTriggerWerte((bisher) => ({ ...bisher, [element.id]: wert }))
                        : undefined
                    }
                  />
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
