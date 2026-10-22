"use client"

import { useEffect, useId, useRef, useState } from "react"
import { Clock } from "lucide-react"

import { UhrzeitAuswahl } from "@/components/uhrzeit-auswahl"
import { teileInBerlinerZeit } from "@/lib/datum"
import { useIstTouch } from "@/lib/use-ist-touch"
import { usePopoverAnker } from "@/lib/use-popover-anker"

type Teile = { stunde: string; minute: string }

const LEER: Teile = { stunde: "", minute: "" }

/** "09:30" → { stunde: "09", minute: "30" }; alles andere → leer. */
function teileAusUhrzeit(uhrzeit: string | undefined): Teile {
  const treffer = /^(\d{2}):(\d{2})/.exec(uhrzeit ?? "")
  return treffer ? { stunde: treffer[1], minute: treffer[2] } : LEER
}

/** Vollständig UND eine echte Uhrzeit (00:00–23:59)? Liefert "HH:MM" oder null. */
function uhrzeitAusTeilen(teile: Teile): string | null {
  if (teile.stunde.length !== 2 || teile.minute.length !== 2) return null
  if (Number(teile.stunde) > 23 || Number(teile.minute) > 59) return null
  return `${teile.stunde}:${teile.minute}`
}

function jetztBerlin(): string {
  const { stunde, minute } = teileInBerlinerZeit(new Date())
  return `${stunde}:${minute}`
}

/**
 * Uhrzeitfeld im Stil des DatumFeld (Rückmeldung 2026-10-22): zwei Teile
 * (Stunde, Minute) mit Auto-Weiterspringen und Plausibilitätsprüfung, am
 * Computer dazu eine Auswahl im App-Design (UhrzeitAuswahl, Uhr-Symbol), auf
 * Handy und Tablet (`pointer: coarse`) die Zeitauswahl des Geräts — beide
 * Varianten liegen im DOM, CSS schaltet um (siehe DatumFeld, gleiche Logik).
 *
 * - Eine erste Ziffer, die keine gültige Zehnerstelle sein kann (Stunde 3–9,
 *   Minute 6–9), wird sofort zu "03"/"06" … ergänzt; ":" / "." / "," / Leerzeichen
 *   springen weiter und füllen eine einzelne Ziffer mit Null auf.
 * - Einfügen ("9:30", "09:30", "0930") füllt beide Teile; Rücktaste im leeren
 *   Teil springt zurück, Pfeile an den Rändern wechseln den Teil.
 * - Pfeil hoch/runter ändert den Wert: Stunde um 1, Minute um `schritt`.
 * - Fehlertext rot darunter und `setCustomValidity` sperrt das Absenden.
 *
 * Nach außen ein verstecktes `<input name>` mit "HH:MM" (oder leer, solange
 * unvollständig/ungültig). Kontrolliert (`wert` + `onAenderung`) oder
 * `defaultValue`. Ohne `name` entsteht kein Formularfeld (z. B. in DatumUhrzeitFeld).
 */
export function UhrzeitFeld({
  name,
  wert,
  defaultValue = "",
  onAenderung,
  required = false,
  id: idProp,
  groesse = "klein",
  schritt = 5,
  ariaLabel,
  className = "",
}: {
  name?: string
  /** Kontrollierter Wert als "HH:MM" oder "". */
  wert?: string
  defaultValue?: string
  /** Meldet die neue Uhrzeit "HH:MM"; leer, solange sie unvollständig oder ungültig ist. */
  onAenderung?: (uhrzeit: string) => void
  required?: boolean
  id?: string
  groesse?: "klein" | "gross"
  /** Minutenraster der Auswahl und der Pfeiltasten; Tippen bleibt minutengenau. */
  schritt?: number
  ariaLabel?: string
  className?: string
}) {
  const id = useId()
  const stundeRef = useRef<HTMLInputElement>(null)
  const minuteRef = useRef<HTMLInputElement>(null)
  const nativRef = useRef<HTMLInputElement>(null)
  const versteckRef = useRef<HTMLInputElement>(null)
  const istTouch = useIstTouch()
  const [offen, setOffen] = useState(false)
  const { feldRef, popoverRef, knopfRef, schliessen } = usePopoverAnker(offen, setOffen)

  const [teile, setTeile] = useState<Teile>(() => teileAusUhrzeit(wert ?? defaultValue))
  const [angefasst, setAngefasst] = useState(false)

  const uhrzeit = uhrzeitAusTeilen(teile)
  const ganzLeer = !teile.stunde && !teile.minute

  // Kontrollierter Betrieb: Von außen geänderten Wert übernehmen (nicht unser eigenes Tippen).
  const [vorherWert, setVorherWert] = useState(wert)
  if (wert !== undefined && wert !== vorherWert) {
    setVorherWert(wert)
    if (wert !== (uhrzeit ?? "")) setTeile(teileAusUhrzeit(wert))
  }

  let fehler = ""
  if (!ganzLeer && !uhrzeit) {
    const vollstaendig = teile.stunde.length === 2 && teile.minute.length === 2
    fehler = !vollstaendig ? "Bitte Stunde und Minute (zweistellig) eingeben." : "Diese Uhrzeit gibt es nicht."
  } else if (ganzLeer && required) {
    fehler = "Bitte eine Uhrzeit eingeben."
  }

  // Nur das SICHTBARE Eingabefeld trägt die Prüfmeldung (siehe DatumFeld).
  useEffect(() => {
    stundeRef.current?.setCustomValidity(istTouch ? "" : fehler)
    nativRef.current?.setCustomValidity(istTouch ? fehler : "")
  }, [fehler, istTouch])

  // Formular zurückgesetzt: zurück auf den Ausgangswert.
  useEffect(() => {
    const form = versteckRef.current?.form
    if (!form) return
    function beiReset() {
      window.setTimeout(() => setTeile(teileAusUhrzeit(wert ?? defaultValue)), 0)
    }
    form.addEventListener("reset", beiReset)
    return () => form.removeEventListener("reset", beiReset)
  }, [wert, defaultValue])

  function melden(neu: Teile) {
    setTeile(neu)
    onAenderung?.(uhrzeitAusTeilen(neu) ?? "")
  }

  function eingabe(teil: keyof Teile, text: string) {
    const laengen = { stunde: 2, minute: 2 }
    const neu = { ...teile }
    // Überzählige Ziffern (Autofill, Einfügen ohne Trennzeichen) laufen in die Minute weiter ("0930").
    let rest = text.replace(/\D/g, "")
    neu[teil] = rest.slice(0, laengen[teil])
    rest = rest.slice(laengen[teil])
    let letztes: keyof Teile = teil
    if (teil === "stunde" && rest.length > 0) {
      neu.minute = rest.slice(0, 2)
      letztes = "minute"
    }

    // Erste Ziffer kann keine Zehnerstelle sein (Stunde 3–9, Minute 6–9) → sofort mit Null auffüllen.
    const letzterText = neu[letztes]
    if (letzterText.length === 1 && Number(letzterText) > (letztes === "stunde" ? 2 : 5)) {
      neu[letztes] = "0" + letzterText
    }
    melden(neu)

    if (letztes === "stunde" && neu.stunde.length === 2) minuteRef.current?.focus()
  }

  function taste(ereignis: React.KeyboardEvent<HTMLInputElement>, teil: keyof Teile) {
    const feldEl = ereignis.currentTarget
    const vorher = teil === "minute" ? stundeRef.current : null
    const nachher = teil === "stunde" ? minuteRef.current : null

    if ([":", ".", ",", " ", "-"].includes(ereignis.key)) {
      ereignis.preventDefault()
      if (!nachher) return
      if (teile[teil].length === 1) melden({ ...teile, [teil]: "0" + teile[teil] })
      nachher.focus()
      return
    }
    if (ereignis.key === "Backspace" && feldEl.value === "" && vorher) {
      ereignis.preventDefault()
      vorher.focus()
      return
    }
    if (ereignis.key === "ArrowLeft" && feldEl.selectionStart === 0 && feldEl.selectionEnd === 0 && vorher) {
      ereignis.preventDefault()
      vorher.focus()
      vorher.setSelectionRange(vorher.value.length, vorher.value.length)
      return
    }
    if (ereignis.key === "ArrowRight" && feldEl.selectionStart === feldEl.value.length && nachher) {
      ereignis.preventDefault()
      nachher.focus()
      nachher.setSelectionRange(0, 0)
      return
    }
    // Pfeil hoch/runter: Stunde ±1, Minute ±Schritt, mit Überlauf innerhalb des Teils.
    if (ereignis.key === "ArrowUp" || ereignis.key === "ArrowDown") {
      ereignis.preventDefault()
      if (ereignis.altKey && ereignis.key === "ArrowDown") {
        setOffen(true)
        return
      }
      const richtung = ereignis.key === "ArrowUp" ? 1 : -1
      const grenze = teil === "stunde" ? 24 : 60
      const schrittweite = teil === "stunde" ? 1 : schritt
      const aktuell = Number(teile[teil] || (teil === "stunde" ? Number(jetztBerlin().slice(0, 2)) : 0))
      const neuerWert = (((aktuell + richtung * schrittweite) % grenze) + grenze) % grenze
      const ergaenzt = { stunde: teile.stunde || "00", minute: teile.minute || "00" }
      melden({ ...ergaenzt, [teil]: String(neuerWert).padStart(2, "0") })
    }
  }

  function einfuegen(ereignis: React.ClipboardEvent<HTMLInputElement>) {
    const text = ereignis.clipboardData.getData("text").trim()
    const mitDoppelpunkt = /^(\d{1,2})[:.](\d{2})(?::\d{2})?$/.exec(text)
    const ohne = /^(\d{2})(\d{2})$/.exec(text)
    const treffer = mitDoppelpunkt ?? ohne
    if (!treffer) return
    ereignis.preventDefault()
    melden({ stunde: treffer[1].padStart(2, "0"), minute: treffer[2] })
    minuteRef.current?.focus()
  }

  const zeigeFehler = fehler !== "" && (angefasst || teile.minute.length === 2)
  const gross = groesse === "gross"
  const teilKlasse =
    "bg-transparent text-center text-primaer outline-none placeholder:text-tertiaer " + (gross ? "text-base" : "text-sm")
  const rahmen = zeigeFehler ? "border-red-500" : "border-flaeche-300"
  const nativKlasse =
    "hidden w-full rounded-lg border bg-flaeche text-primaer focus:border-marke-gruen focus:outline focus:outline-2 focus:outline-marke-gruen pointer-coarse:block " +
    (gross ? "h-11 px-3 text-base " : "h-9 px-2 text-sm ") +
    rahmen

  return (
    <div className={className}>
      <div
        ref={feldRef}
        className={
          "relative flex items-center gap-0.5 rounded-lg border bg-flaeche focus-within:border-marke-gruen pointer-coarse:hidden " +
          (gross ? "h-11 px-3 " : "h-9 px-2 ") +
          rahmen
        }
        onBlur={(ereignis) => {
          if (offen) return
          if (!ereignis.currentTarget.contains(ereignis.relatedTarget as Node | null)) setAngefasst(true)
        }}
      >
        <input
          ref={stundeRef}
          id={istTouch ? undefined : idProp}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="HH"
          aria-label={`${ariaLabel ?? "Uhrzeit"}: Stunde`}
          aria-invalid={zeigeFehler}
          aria-required={required}
          aria-describedby={zeigeFehler ? `${id}-fehler` : undefined}
          value={teile.stunde}
          onChange={(e) => eingabe("stunde", e.target.value)}
          onKeyDown={(e) => taste(e, "stunde")}
          onPaste={einfuegen}
          onFocus={(e) => e.currentTarget.select()}
          className={teilKlasse + (gross ? " w-7" : " w-6")}
        />
        <span aria-hidden className="text-tertiaer">
          :
        </span>
        <input
          ref={minuteRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="MM"
          aria-label={`${ariaLabel ?? "Uhrzeit"}: Minute`}
          value={teile.minute}
          onChange={(e) => eingabe("minute", e.target.value)}
          onKeyDown={(e) => taste(e, "minute")}
          onPaste={einfuegen}
          onFocus={(e) => e.currentTarget.select()}
          className={teilKlasse + (gross ? " w-7" : " w-6")}
        />

        <button
          ref={knopfRef}
          type="button"
          onClick={() => (offen ? schliessen(false) : setOffen(true))}
          aria-label={`${ariaLabel ?? "Uhrzeit"}: Uhrzeit wählen`}
          aria-haspopup="dialog"
          aria-expanded={offen}
          className={
            "ml-1.5 rounded p-0.5 transition hover:text-primaer focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen " +
            (offen ? "text-marke-gruen-dunkel" : "text-tertiaer")
          }
        >
          <Clock className="h-4 w-4" aria-hidden />
        </button>

        <div
          ref={popoverRef}
          popover="manual"
          className="fixed inset-auto m-0 overflow-visible border-0 bg-transparent p-0"
        >
          {offen && (
            <UhrzeitAuswahl
              wert={uhrzeit ?? ""}
              jetzt={jetztBerlin()}
              schritt={schritt}
              onWahl={(gewaehlt, fertig) => {
                melden(teileAusUhrzeit(gewaehlt))
                if (fertig) {
                  setAngefasst(true)
                  schliessen(true)
                }
              }}
              onLoeschen={
                required
                  ? undefined
                  : () => {
                      melden(LEER)
                      schliessen(true)
                    }
              }
              onSchliessen={() => schliessen(true)}
            />
          )}
        </div>
      </div>

      {/* Handy/Tablet: Zeitauswahl des Geräts. */}
      <input
        ref={nativRef}
        id={istTouch ? idProp : undefined}
        type="time"
        aria-label={ariaLabel ?? "Uhrzeit"}
        aria-invalid={zeigeFehler}
        aria-describedby={zeigeFehler ? `${id}-fehler` : undefined}
        value={uhrzeit ?? ""}
        onChange={(e) => melden(e.target.value ? teileAusUhrzeit(e.target.value) : LEER)}
        onBlur={() => setAngefasst(true)}
        className={nativKlasse}
      />

      <input ref={versteckRef} type="hidden" name={name} value={uhrzeit ?? ""} disabled={!name} />

      {zeigeFehler && (
        <p id={`${id}-fehler`} role="alert" className="mt-1 text-xs text-red-600">
          {fehler}
        </p>
      )}
    </div>
  )
}
