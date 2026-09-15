"use client"

import { useEffect, useRef, useState } from "react"

import type { nachrichtSenden, konversationAlsGelesenMarkieren, konversationNachrichtenLaden } from "@/lib/chat/aktionen"

type LadeErgebnis = Awaited<ReturnType<typeof konversationNachrichtenLaden>>
type Nachricht = LadeErgebnis["nachrichten"][number]
type NachrichtAnzeige = Nachricht & { optimistisch?: boolean }
type GelesenStand = LadeErgebnis["gelesenStand"]

const POLL_INTERVALL_MS = 10_000

function zeitAnzeige(datum: Date): string {
  return datum.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
}

function dateigroesseAnzeige(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function aufnahmeZeitAnzeige(sekunden: number): string {
  const min = Math.floor(sekunden / 60)
  const sek = String(sekunden % 60).padStart(2, "0")
  return `${min}:${sek}`
}

/** Dateiendung passend zum tatsächlich von MediaRecorder gelieferten Basis-Mimetyp (ohne ";codecs=..."), siehe sprachaufnahmeStarten. */
const DATEIENDUNG_NACH_MIMETYP: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
}

/**
 * Bevorzugte, vom Browser tatsächlich unterstützte Aufnahmeformate für
 * Sprachnachrichten (Rückmeldung 2026-09-10). "audio/mp4" bewusst ZUERST,
 * nicht nach Verbreitung sortiert: Safari meldet über
 * `MediaRecorder.isTypeSupported("audio/webm")` fälschlich Unterstützung
 * (nimmt tatsächlich als WebM auf — die Datei ist auch technisch gültig),
 * kann eigene WebM-Aufnahmen aber selbst nicht wieder ABSPIELEN
 * (Rückmeldung 2026-09-10: "Fehler" im Player nach dem Senden — Safaris
 * `<audio>` unterstützt WebM nur als Aufnahme-, nicht als Wiedergabeformat).
 * "audio/mp4" spielt dagegen überall zuverlässig ab, auch dort, wo es nicht
 * aufgenommen werden kann (Chrome/Firefox fallen dann automatisch auf
 * "audio/webm" zurück, weil sie "audio/mp4" für MediaRecorder gar nicht
 * erst als unterstützt melden).
 */
const AUFNAHME_MIMETYP_KANDIDATEN = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg"]

/** Anhänge einer Nachricht — Bilder als anklickbare Vorschau, Audio (Sprachnachrichten) als abspielbarer Player, alles andere als Datei-Link (Muster: Anhang-Listen bei Info/Termin, hier mit Bild-/Audio-Vorschau, weil das im Chat-Kontext erwartbar ist). */
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
              <img src={url} alt={anhang.dateiname} className="max-h-56 max-w-full rounded-lg border border-rand" />
            </a>
          )
        }
        if (anhang.mimetyp.startsWith("audio/")) {
          return <audio key={anhang.id} controls src={url} className="h-9 max-w-full" />
        }
        return (
          <a
            key={anhang.id}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-rand bg-flaeche px-2.5 py-1.5 text-sm text-marke-gruen-dunkel hover:underline"
          >
            📎 {anhang.dateiname}
            <span className="text-xs text-tertiaer">({dateigroesseAnzeige(anhang.groesseBytes)})</span>
          </a>
        )
      })}
    </div>
  )
}

/**
 * WhatsApp-artige Haken für eigene Nachrichten (Rückmeldung 2026-09-10):
 * ein Haken = wird gerade gesendet (optimistisch, siehe beiSenden), zwei
 * graue Haken = auf dem Server bestätigt ("zugestellt" fällt bei uns
 * praktisch mit "gesendet" zusammen — es gibt keine Warteschlange, jeder
 * aktuelle Teilnehmer kann die Nachricht sofort abrufen), zwei grüne Haken
 * = JEDER andere aktuelle Teilnehmer hat sie gelesen (bei einer Gruppe
 * also alle Mitglieder, nicht nur eines).
 */
function NachrichtHaken({ optimistisch, gelesenVonAllen }: { optimistisch: boolean; gelesenVonAllen: boolean }) {
  if (optimistisch) {
    return (
      <svg viewBox="0 0 16 12" className="h-3 w-3.5" aria-label="Wird gesendet">
        <path d="M1 6.5 L5.5 11 L15 1" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  return (
    <svg
      viewBox="0 0 20 12"
      className={"h-3 w-4 " + (gelesenVonAllen ? "text-marke-gruen-dunkel" : "text-tertiaer")}
      aria-label={gelesenVonAllen ? "Von allen gelesen" : "Zugestellt"}
    >
      <path d="M1 6.5 L5.5 11 L15 1" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 6.5 L10.5 11 L20 1" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Nachrichtenliste + Sendeformular — leichtes Hintergrund-Polling statt
 * WebSocket (bewusst so entschieden, siehe Plan/Memory chat-baustein):
 * alle 10s wird per Server Action nach Nachrichten NEUER als die zuletzt
 * gesehene gefragt (Muster `vorlageZumBearbeitenLaden`: direkter Aufruf
 * einer "use server"-Funktion aus einer Client Component, kein
 * `<form action>` nötig) — die Antwort bringt IMMER auch den aktuellen
 * Gelesen-Stand mit, damit sich die Haken bereits angezeigter eigener
 * Nachrichten nachträglich einfärben, sobald die Gegenseite liest.
 *
 * Eigene Nachrichten erscheinen sofort optimistisch (ein Haken, siehe
 * NachrichtHaken) — nach Bestätigung durch den Server wird der
 * Platzhalter durch die echte(n), gerade eingetroffene(n) Nachricht(en)
 * ersetzt, bei einem Fehler wieder entfernt.
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
  anfangsTeilnehmerIds,
  anfangsGelesenStand,
  nachrichtenLadenAktion,
  sendenAktion,
  alsGelesenMarkierenAktion,
}: {
  konversationId: string
  eigenePersonId: string
  anfangsNachrichten: Nachricht[]
  anfangsTeilnehmerIds: string[]
  anfangsGelesenStand: GelesenStand
  nachrichtenLadenAktion: typeof konversationNachrichtenLaden
  sendenAktion: typeof nachrichtSenden
  alsGelesenMarkierenAktion: typeof konversationAlsGelesenMarkieren
}) {
  const [nachrichten, setNachrichten] = useState<NachrichtAnzeige[]>(anfangsNachrichten)
  const [teilnehmerIds, setTeilnehmerIds] = useState(anfangsTeilnehmerIds)
  const [gelesenStand, setGelesenStand] = useState(anfangsGelesenStand)
  const [text, setText] = useState("")
  const [dateiNamen, setDateiNamen] = useState<string[]>([])
  const [sendet, setSendet] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [aufnahmeLaeuft, setAufnahmeLaeuft] = useState(false)
  const [aufnahmeSekunden, setAufnahmeSekunden] = useState(0)
  const letzteZeitRef = useRef(anfangsNachrichten.at(-1)?.erstelltAm ?? null)
  const listeEndeRef = useRef<HTMLDivElement>(null)
  const dateiInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const aufnahmeChunksRef = useRef<Blob[]>([])
  const aufnahmeIntervallRef = useRef<number | null>(null)
  const aufnahmeStreamRef = useRef<MediaStream | null>(null)

  // Gibt das Mikrofon frei, falls die Seite mitten in einer Aufnahme
  // verlassen wird — sonst bliebe die Browser-Mikrofonanzeige aktiv.
  useEffect(() => {
    return () => {
      aufnahmeStreamRef.current?.getTracks().forEach((spur) => spur.stop())
      if (aufnahmeIntervallRef.current !== null) window.clearInterval(aufnahmeIntervallRef.current)
    }
  }, [])

  useEffect(() => {
    alsGelesenMarkierenAktion(konversationId)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- alsGelesenMarkierenAktion ist eine Server Action, die aus der Server Component bei jedem Router-Refresh eine NEUE Funktionsreferenz bekommt. Als Dependency würde das eine Endlosschleife auslösen (Aufruf → Refresh → neue Referenz → Effekt feuert erneut → ...), siehe Rückmeldung 2026-09-10: "history.replaceState() more than 100 times per 10 seconds".
  }, [konversationId])

  useEffect(() => {
    listeEndeRef.current?.scrollIntoView({ block: "end" })
  }, [nachrichten])

  async function neueLaden() {
    const ergebnis = await nachrichtenLadenAktion(konversationId, letzteZeitRef.current?.toISOString())
    setTeilnehmerIds(ergebnis.teilnehmerIds)
    setGelesenStand(ergebnis.gelesenStand)
    if (ergebnis.nachrichten.length === 0) return
    letzteZeitRef.current = ergebnis.nachrichten.at(-1)!.erstelltAm
    setNachrichten((bisher) => [...bisher, ...ergebnis.nachrichten])
    alsGelesenMarkierenAktion(konversationId)
  }

  useEffect(() => {
    const intervall = window.setInterval(neueLaden, POLL_INTERVALL_MS)
    return () => window.clearInterval(intervall)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- neueLaden liest konversationId/Aktionen aus Props, die sich hier nicht ändern
  }, [konversationId])

  /**
   * Eigentliche Sendelogik, losgelöst vom Formular-Submit — wird sowohl
   * vom "Senden"-Knopf (beiSenden, formData aus dem Formular) als auch
   * direkt nach dem Stoppen einer Sprachaufnahme aufgerufen (Rückmeldung
   * 2026-09-10: "automatisch abgeschickt werden", selbst zusammengebaute
   * formData ohne Umweg über den Datei-Input).
   */
  async function nachrichtWirklichSenden(formData: FormData) {
    const eingegebenerText = String(formData.get("text") ?? "").trim()
    const hatDateien = anhaengeAusFormData(formData).length > 0
    if ((!eingegebenerText && !hatDateien) || sendet) return

    const optimistischeId = `optimistisch-${crypto.randomUUID()}`
    const optimistischeNachricht: NachrichtAnzeige = {
      id: optimistischeId,
      konversationId,
      absenderId: eigenePersonId,
      text: eingegebenerText || null,
      erstelltAm: new Date(),
      absender: { benutzername: eigenePersonId, vorname: "Du", nachname: "" },
      anhaenge: [],
      optimistisch: true,
    }

    setNachrichten((bisher) => [...bisher, optimistischeNachricht])
    setSendet(true)
    setFehler(null)
    setText("")
    setDateiNamen([])
    if (dateiInputRef.current) dateiInputRef.current.value = ""

    try {
      await sendenAktion(konversationId, formData)
      const ergebnis = await nachrichtenLadenAktion(konversationId, letzteZeitRef.current?.toISOString())
      if (ergebnis.nachrichten.length > 0) letzteZeitRef.current = ergebnis.nachrichten.at(-1)!.erstelltAm
      setTeilnehmerIds(ergebnis.teilnehmerIds)
      setGelesenStand(ergebnis.gelesenStand)
      setNachrichten((bisher) => [...bisher.filter((n) => n.id !== optimistischeId), ...ergebnis.nachrichten])
      alsGelesenMarkierenAktion(konversationId)
    } catch (fehlerObjekt) {
      setNachrichten((bisher) => bisher.filter((n) => n.id !== optimistischeId))
      setFehler(fehlerObjekt instanceof Error ? fehlerObjekt.message : "Senden fehlgeschlagen.")
    } finally {
      setSendet(false)
    }
  }

  function beiSenden(ereignis: React.FormEvent<HTMLFormElement>) {
    ereignis.preventDefault()
    nachrichtWirklichSenden(new FormData(ereignis.currentTarget))
  }

  /**
   * Startet die Mikrofon-Aufnahme (Rückmeldung 2026-09-10: Sprachnachrichten
   * wie im Altsystem "Überblick") — beim Stoppen wird SOFORT gesendet
   * (Rückmeldung 2026-09-10: "automatisch abgeschickt", anders als bei
   * einem Foto/Dokument gibt es hier kein Ansehen-vor-dem-Senden), direkt
   * über `nachrichtWirklichSenden` mit einer selbst zusammengebauten
   * `FormData` statt über den Datei-Input/"Senden"-Knopf.
   */
  async function sprachaufnahmeStarten() {
    setFehler(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      aufnahmeStreamRef.current = stream
      const unterstuetzterTyp = AUFNAHME_MIMETYP_KANDIDATEN.find(
        (typ) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(typ),
      )
      const recorder = new MediaRecorder(stream, unterstuetzterTyp ? { mimeType: unterstuetzterTyp } : undefined)
      aufnahmeChunksRef.current = []

      recorder.ondataavailable = (ereignis) => {
        if (ereignis.data.size > 0) aufnahmeChunksRef.current.push(ereignis.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((spur) => spur.stop())
        const basisMimetyp = (recorder.mimeType || "audio/mp4").split(";")[0]
        const blob = new Blob(aufnahmeChunksRef.current, { type: basisMimetyp })
        const endung = DATEIENDUNG_NACH_MIMETYP[basisMimetyp] ?? "mp4"
        const datei = new File([blob], `Sprachnachricht.${endung}`, { type: basisMimetyp })

        const formData = new FormData()
        formData.append("anhaenge", datei)
        nachrichtWirklichSenden(formData)
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setAufnahmeSekunden(0)
      setAufnahmeLaeuft(true)
      aufnahmeIntervallRef.current = window.setInterval(() => setAufnahmeSekunden((s) => s + 1), 1000)
    } catch {
      setFehler("Zugriff auf das Mikrofon nicht möglich — bitte Berechtigung im Browser prüfen.")
    }
  }

  function sprachaufnahmeStoppen() {
    mediaRecorderRef.current?.stop()
    setAufnahmeLaeuft(false)
    if (aufnahmeIntervallRef.current !== null) window.clearInterval(aufnahmeIntervallRef.current)
  }

  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col rounded-xl border border-rand bg-flaeche">
      <div className="flex-1 overflow-y-auto p-4">
        {nachrichten.length === 0 ? (
          <p className="text-sm text-sekundaer">Noch keine Nachrichten.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {nachrichten.map((nachricht) => {
              const eigene = nachricht.absender.benutzername === eigenePersonId
              const andereTeilnehmer = teilnehmerIds.filter((id) => id !== nachricht.absenderId)
              const gelesenVonAllen =
                andereTeilnehmer.length > 0 &&
                andereTeilnehmer.every((id) => {
                  const zeit = gelesenStand[id]
                  return zeit && zeit >= nachricht.erstelltAm
                })
              return (
                <li key={nachricht.id} className={"flex flex-col " + (eigene ? "items-end" : "items-start")}>
                  <p className="text-xs font-medium text-tertiaer">
                    {eigene ? "Du" : `${nachricht.absender.vorname} ${nachricht.absender.nachname}`} · {zeitAnzeige(nachricht.erstelltAm)}
                  </p>
                  {nachricht.text && (
                    <p
                      className={
                        "mt-0.5 max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap " +
                        (eigene ? "bg-marke-gruen text-neutral-900" : "bg-flaeche-100 text-primaer")
                      }
                    >
                      {nachricht.text}
                    </p>
                  )}
                  <NachrichtAnhaenge nachrichtId={nachricht.id} anhaenge={nachricht.anhaenge} />
                  {eigene && (
                    <span className="mt-0.5">
                      <NachrichtHaken optimistisch={nachricht.optimistisch ?? false} gelesenVonAllen={gelesenVonAllen} />
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        <div ref={listeEndeRef} />
      </div>

      <form onSubmit={beiSenden} className="flex flex-col gap-2 border-t border-flaeche-100 p-3">
        {fehler && <p className="text-xs text-red-600">{fehler}</p>}
        {dateiNamen.length > 0 && (
          <p className="truncate text-xs text-sekundaer">
            {dateiNamen.length === 1 ? "Anhang: " : "Anhänge: "}
            {dateiNamen.join(", ")}
          </p>
        )}
        <div className="flex gap-2">
          <label
            aria-label="Anhang hinzufügen"
            title="Anhang hinzufügen"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-flaeche-300 text-sekundaer transition hover:bg-flaeche-100"
          >
            📎
            <input
              ref={dateiInputRef}
              type="file"
              name="anhaenge"
              multiple
              accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,audio/webm,audio/mp4,audio/ogg,audio/mpeg"
              onChange={(ereignis) => setDateiNamen(Array.from(ereignis.target.files ?? []).map((d) => d.name))}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={aufnahmeLaeuft ? sprachaufnahmeStoppen : sprachaufnahmeStarten}
            aria-label={aufnahmeLaeuft ? "Aufnahme beenden" : "Sprachnachricht aufnehmen"}
            title={aufnahmeLaeuft ? "Aufnahme beenden" : "Sprachnachricht aufnehmen"}
            className={
              "flex h-9 shrink-0 items-center justify-center rounded-lg border px-2 text-sm transition " +
              (aufnahmeLaeuft ? "min-w-9 border-red-300 bg-red-50 text-red-600" : "w-9 border-flaeche-300 text-sekundaer hover:bg-flaeche-100")
            }
          >
            {aufnahmeLaeuft ? `● ${aufnahmeZeitAnzeige(aufnahmeSekunden)}` : "🎤"}
          </button>
          <input
            type="text"
            name="text"
            value={text}
            onChange={(ereignis) => setText(ereignis.target.value)}
            placeholder="Nachricht …"
            className="h-9 flex-1 rounded-lg border border-flaeche-300 px-2 text-sm"
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
