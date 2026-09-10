"use client"

import { useEffect, useRef, useState } from "react"

import type { konversationNachrichten } from "@/lib/chat/abfragen"
import type { nachrichtSenden, konversationAlsGelesenMarkieren, konversationNachrichtenLaden } from "@/lib/chat/aktionen"

type Nachricht = Awaited<ReturnType<typeof konversationNachrichten>>[number]

const POLL_INTERVALL_MS = 10_000

function zeitAnzeige(datum: Date): string {
  return datum.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
}

function dateigroesseAnzeige(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Anhänge einer Nachricht — Bilder als anklickbare Vorschau, alles andere als Datei-Link (Muster: Anhang-Listen bei Info/Termin, hier mit Bildvorschau, weil das im Chat-Kontext erwartbar ist). */
function NachrichtAnhaenge({ nachrichtId, anhaenge }: { nachrichtId: string; anhaenge: Nachricht["anhaenge"] }) {
  if (anhaenge.length === 0) return null
  return (
    <div className="mt-1 flex flex-col gap-1.5">
      {anhaenge.map((anhang) => {
        const url = `/api/chat/nachrichten/${nachrichtId}/anhaenge/${anhang.id}`
        if (anhang.mimetyp.startsWith("image/")) {
          return (
            <a key={anhang.id} href={url} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element -- Vorschau aus der Ablage, kein optimierbares Next-Image-Ziel */}
              <img src={url} alt={anhang.dateiname} className="max-h-56 max-w-full rounded-lg border border-neutral-200" />
            </a>
          )
        }
        return (
          <a
            key={anhang.id}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-marke-gruen-dunkel hover:underline"
          >
            📎 {anhang.dateiname}
            <span className="text-xs text-neutral-400">({dateigroesseAnzeige(anhang.groesseBytes)})</span>
          </a>
        )
      })}
    </div>
  )
}

/**
 * Nachrichtenliste + Sendeformular — leichtes Hintergrund-Polling statt
 * WebSocket (bewusst so entschieden, siehe Plan/Memory chat-baustein):
 * alle 10s wird per Server Action nach Nachrichten NEUER als die zuletzt
 * gesehene gefragt (Muster `vorlageZumBearbeitenLaden`: direkter Aufruf
 * einer "use server"-Funktion aus einer Client Component, kein
 * `<form action>` nötig). Nach dem eigenen Senden wird sofort einmal
 * zusätzlich abgefragt, statt auf das nächste Intervall zu warten, damit
 * die eigene Nachricht ohne spürbare Verzögerung erscheint.
 *
 * Anhänge (Rückmeldung 2026-09-10): Text ODER mindestens eine Datei
 * reicht zum Senden (siehe nachrichtSenden). Der Datei-Input bleibt
 * unkontrolliert (Browser-Standardverhalten: erneutes Auswählen ersetzt
 * die vorige Auswahl) — `dateiNamen` spiegelt nur die Namen fürs Anzeigen.
 */
export function ChatKonversationAnsicht({
  konversationId,
  eigenePersonId,
  anfangsNachrichten,
  nachrichtenLadenAktion,
  sendenAktion,
  alsGelesenMarkierenAktion,
}: {
  konversationId: string
  eigenePersonId: string
  anfangsNachrichten: Nachricht[]
  nachrichtenLadenAktion: typeof konversationNachrichtenLaden
  sendenAktion: typeof nachrichtSenden
  alsGelesenMarkierenAktion: typeof konversationAlsGelesenMarkieren
}) {
  const [nachrichten, setNachrichten] = useState(anfangsNachrichten)
  const [text, setText] = useState("")
  const [dateiNamen, setDateiNamen] = useState<string[]>([])
  const [sendet, setSendet] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const letzteZeitRef = useRef(anfangsNachrichten.at(-1)?.erstelltAm ?? null)
  const listeEndeRef = useRef<HTMLDivElement>(null)
  const dateiInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    alsGelesenMarkierenAktion(konversationId)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- alsGelesenMarkierenAktion ist eine Server Action, die aus der Server Component bei jedem Router-Refresh eine NEUE Funktionsreferenz bekommt. Als Dependency würde das eine Endlosschleife auslösen (Aufruf → Refresh → neue Referenz → Effekt feuert erneut → ...), siehe Rückmeldung 2026-09-10: "history.replaceState() more than 100 times per 10 seconds".
  }, [konversationId])

  useEffect(() => {
    listeEndeRef.current?.scrollIntoView({ block: "end" })
  }, [nachrichten])

  async function neueLaden() {
    const neue = await nachrichtenLadenAktion(konversationId, letzteZeitRef.current?.toISOString())
    if (neue.length === 0) return
    letzteZeitRef.current = neue.at(-1)!.erstelltAm
    setNachrichten((bisher) => [...bisher, ...neue])
    alsGelesenMarkierenAktion(konversationId)
  }

  useEffect(() => {
    const intervall = window.setInterval(neueLaden, POLL_INTERVALL_MS)
    return () => window.clearInterval(intervall)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- neueLaden liest konversationId/Aktionen aus Props, die sich hier nicht ändern
  }, [konversationId])

  async function beiSenden(ereignis: React.FormEvent<HTMLFormElement>) {
    ereignis.preventDefault()
    const formData = new FormData(ereignis.currentTarget)
    const hatText = String(formData.get("text") ?? "").trim().length > 0
    const hatDateien = anhaengeAusFormData(formData).length > 0
    if ((!hatText && !hatDateien) || sendet) return
    setSendet(true)
    setFehler(null)
    try {
      await sendenAktion(konversationId, formData)
      setText("")
      setDateiNamen([])
      if (dateiInputRef.current) dateiInputRef.current.value = ""
      await neueLaden()
    } catch (fehlerObjekt) {
      setFehler(fehlerObjekt instanceof Error ? fehlerObjekt.message : "Senden fehlgeschlagen.")
    } finally {
      setSendet(false)
    }
  }

  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col rounded-xl border border-neutral-200 bg-white">
      <div className="flex-1 overflow-y-auto p-4">
        {nachrichten.length === 0 ? (
          <p className="text-sm text-neutral-500">Noch keine Nachrichten.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {nachrichten.map((nachricht) => {
              const eigene = nachricht.absender.benutzername === eigenePersonId
              return (
                <li key={nachricht.id} className={"flex flex-col " + (eigene ? "items-end" : "items-start")}>
                  <p className="text-xs font-medium text-neutral-400">
                    {eigene ? "Du" : `${nachricht.absender.vorname} ${nachricht.absender.nachname}`} · {zeitAnzeige(nachricht.erstelltAm)}
                  </p>
                  {nachricht.text && (
                    <p
                      className={
                        "mt-0.5 max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap " +
                        (eigene ? "bg-marke-gruen text-neutral-900" : "bg-neutral-100 text-neutral-700")
                      }
                    >
                      {nachricht.text}
                    </p>
                  )}
                  <NachrichtAnhaenge nachrichtId={nachricht.id} anhaenge={nachricht.anhaenge} />
                </li>
              )
            })}
          </ul>
        )}
        <div ref={listeEndeRef} />
      </div>

      <form onSubmit={beiSenden} className="flex flex-col gap-2 border-t border-neutral-100 p-3">
        {fehler && <p className="text-xs text-red-600">{fehler}</p>}
        {dateiNamen.length > 0 && (
          <p className="truncate text-xs text-neutral-500">
            {dateiNamen.length === 1 ? "Anhang: " : "Anhänge: "}
            {dateiNamen.join(", ")}
          </p>
        )}
        <div className="flex gap-2">
          <label
            aria-label="Anhang hinzufügen"
            title="Anhang hinzufügen"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-neutral-300 text-neutral-500 transition hover:bg-neutral-100"
          >
            📎
            <input
              ref={dateiInputRef}
              type="file"
              name="anhaenge"
              multiple
              accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
              onChange={(ereignis) => setDateiNamen(Array.from(ereignis.target.files ?? []).map((d) => d.name))}
              className="hidden"
            />
          </label>
          <input
            type="text"
            name="text"
            value={text}
            onChange={(ereignis) => setText(ereignis.target.value)}
            placeholder="Nachricht …"
            className="h-9 flex-1 rounded-lg border border-neutral-300 px-2 text-sm"
          />
          <button
            type="submit"
            disabled={sendet}
            className="h-9 shrink-0 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel disabled:opacity-50"
          >
            Senden
          </button>
        </div>
      </form>
    </div>
  )
}

function anhaengeAusFormData(formData: FormData): File[] {
  return formData.getAll("anhaenge").filter((wert): wert is File => wert instanceof File && wert.size > 0)
}
