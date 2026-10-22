"use client"

import { useEffect, useId, useRef, useState } from "react"
import { CalendarDays } from "lucide-react"

import { KalenderAuswahl } from "@/components/kalender-auswahl"
import { heutigesDatumIso } from "@/lib/datum"
import { useIstTouch } from "@/lib/use-ist-touch"

type Teile = { tag: string; monat: string; jahr: string }

const LEER: Teile = { tag: "", monat: "", jahr: "" }
const MIN_JAHR = 1900
const MAX_JAHR = 2100

/** "2026-10-17" → { tag: "17", monat: "10", jahr: "2026" }; alles andere → leer. */
function teileAusIso(iso: string | undefined): Teile {
  const treffer = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "")
  return treffer ? { tag: treffer[3], monat: treffer[2], jahr: treffer[1] } : LEER
}

/** Vollständig UND ein echtes Kalenderdatum (kein 31.04., kein 29.02. im Nichtschaltjahr)? Liefert ISO oder null. */
function isoAusTeilen(teile: Teile): string | null {
  if (teile.tag.length !== 2 || teile.monat.length !== 2 || teile.jahr.length !== 4) return null
  const [tag, monat, jahr] = [Number(teile.tag), Number(teile.monat), Number(teile.jahr)]
  if (jahr < MIN_JAHR || jahr > MAX_JAHR) return null
  const probe = new Date(Date.UTC(jahr, monat - 1, tag))
  if (probe.getUTCFullYear() !== jahr || probe.getUTCMonth() !== monat - 1 || probe.getUTCDate() !== tag) return null
  return `${teile.jahr}-${teile.monat}-${teile.tag}`
}

function anzeigeAusIso(iso: string): string {
  const t = teileAusIso(iso)
  return `${t.tag}.${t.monat}.${t.jahr}`
}

/**
 * Datumsfeld aus drei Teilen (Tag, Monat, Jahr) statt des Browser-Datumsfelds
 * (Rückmeldung 2026-10-06: dort sprang der Cursor nicht weiter und das Jahr
 * musste in einem Zug getippt werden). Hier:
 *
 * - Nach zwei Ziffern bei Tag und Monat springt der Cursor von selbst weiter,
 *   nach vier beim Jahr bleibt er stehen. Eine erste Ziffer, die keine
 *   gültige Zehnerstelle sein kann (Tag 4–9, Monat 2–9), wird sofort zu
 *   "04"/"05" … ergänzt; "." / "/" / "-" / Leerzeichen springen ebenfalls
 *   weiter und füllen eine einzelne Ziffer mit Null auf.
 * - Rücktaste im leeren Teil springt zurück, Pfeil links/rechts an den Rändern
 *   wechselt den Teil, Einfügen ("17.10.2026" oder "2026-10-17") füllt alle
 *   drei Teile.
 * - Plausibilität: Das Datum muss existieren (kein 31.04.) und zwischen 1900
 *   und 2100 liegen, bei `min` nicht davor. Das Feld zeigt den Grund rot
 *   darunter und sperrt das Absenden mit der Browser-Meldung am Tag-Feld.
 *
 * Nach außen bleibt es ein ganz normales Formularfeld: Ein verstecktes
 * `<input name>` trägt "2026-10-17" (oder leer, solange unvollständig/
 * ungültig) — die Server Actions bleiben unverändert. Mit `wert` +
 * `onAenderung` ist es kontrolliert (der Aufrufer darf den Wert setzen,
 * z. B. ein Enddatum nachziehen), sonst reicht `defaultValue`.
 *
 * Auswahl per Kalender (Rückmeldung 2026-10-22): Das Kalender-Symbol öffnet am
 * Computer unseren eigenen Kalender im App-Design (KalenderAuswahl, in einem
 * Pop-over über allem, auch über Pop-up-Fenstern). Auf Handy und Tablet
 * (`pointer: coarse`) steht stattdessen das Datumsfeld des Geräts da — mit dem
 * Datumsrad bzw. Kalender, den das Betriebssystem mitbringt. Beide Varianten
 * liegen im Dokument und teilen sich denselben Zustand; welche zu sehen ist,
 * entscheidet nur CSS (kein Flackern beim Laden).
 */
export function DatumFeld({
  name,
  wert,
  defaultValue = "",
  onAenderung,
  required = false,
  min,
  max,
  id: idProp,
  groesse = "klein",
  ariaLabel,
  className = "",
}: {
  /** Name des Formularfelds (trägt "2026-10-17"); ohne Namen bleibt das Feld ohne eigenes Formularfeld, z. B. als Teil von DatumUhrzeitFeld. */
  name?: string
  /** Kontrollierter Wert als ISO ("2026-10-17" oder ""). */
  wert?: string
  defaultValue?: string
  /** Meldet den neuen ISO-Wert; leer, solange das Datum unvollständig oder ungültig ist. */
  onAenderung?: (iso: string) => void
  required?: boolean
  /** Frühestes erlaubtes Datum als ISO. */
  min?: string
  /** Spätestes erlaubtes Datum als ISO. */
  max?: string
  /** Für `<label htmlFor>`: Ziel ist das Tag-Feld (am Handy das Gerätefeld). */
  id?: string
  /** "gross": höhere Felder mit größerer Schrift (Formulare, die am Handy am Fahrzeug ausgefüllt werden). */
  groesse?: "klein" | "gross"
  ariaLabel?: string
  className?: string
}) {
  const id = useId()
  const tagRef = useRef<HTMLInputElement>(null)
  const monatRef = useRef<HTMLInputElement>(null)
  const jahrRef = useRef<HTMLInputElement>(null)
  const nativRef = useRef<HTMLInputElement>(null)
  const versteckRef = useRef<HTMLInputElement>(null)
  const feldRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const kalenderKnopfRef = useRef<HTMLButtonElement>(null)
  const istTouch = useIstTouch()
  const [kalenderOffen, setKalenderOffen] = useState(false)

  const [teile, setTeile] = useState<Teile>(() => teileAusIso(wert ?? defaultValue))
  const [angefasst, setAngefasst] = useState(false)

  const iso = isoAusTeilen(teile)
  const ganzLeer = !teile.tag && !teile.monat && !teile.jahr

  // Kontrollierter Betrieb: Ändert der Aufrufer den Wert von außen (nicht durch
  // unser eigenes Tippen), übernehmen wir ihn in die drei Teile. Muster
  // "Zustand beim Rendern aus geänderten Props ableiten", ohne Effekt.
  const [vorherWert, setVorherWert] = useState(wert)
  if (wert !== undefined && wert !== vorherWert) {
    setVorherWert(wert)
    if (wert !== (iso ?? "")) setTeile(teileAusIso(wert))
  }

  // Fehlertext: erst nach der ersten Berührung bzw. beim Absenden zeigen.
  let fehler = ""
  if (!ganzLeer && !iso) {
    const vollstaendig = teile.tag.length === 2 && teile.monat.length === 2 && teile.jahr.length === 4
    const jahr = Number(teile.jahr)
    fehler = !vollstaendig
      ? "Bitte Tag, Monat und Jahr (vierstellig) eingeben."
      : jahr < MIN_JAHR || jahr > MAX_JAHR
        ? `Das Jahr muss zwischen ${MIN_JAHR} und ${MAX_JAHR} liegen.`
        : "Dieses Datum gibt es nicht."
  } else if (iso && min && iso < min) {
    fehler = `Das Datum darf nicht vor dem ${anzeigeAusIso(min)} liegen.`
  } else if (iso && max && iso > max) {
    fehler = `Das Datum darf nicht nach dem ${anzeigeAusIso(max)} liegen.`
  } else if (ganzLeer && required) {
    fehler = "Bitte ein Datum eingeben."
  }

  // Browser-Meldung: sperrt das Absenden, solange das Datum nicht passt. Nur das
  // SICHTBARE Eingabefeld bekommt sie — ein verstecktes Feld mit Fehler würde
  // das Absenden sonst stumm blockieren (der Browser kann es nicht anzeigen).
  useEffect(() => {
    tagRef.current?.setCustomValidity(istTouch ? "" : fehler)
    nativRef.current?.setCustomValidity(istTouch ? fehler : "")
  }, [fehler, istTouch])

  // Formular zurückgesetzt (z. B. nach dem Speichern): zurück auf den Ausgangswert.
  useEffect(() => {
    const form = versteckRef.current?.form
    if (!form) return
    function beiReset() {
      window.setTimeout(() => setTeile(teileAusIso(wert ?? defaultValue)), 0)
    }
    form.addEventListener("reset", beiReset)
    return () => form.removeEventListener("reset", beiReset)
  }, [wert, defaultValue])

  function melden(neu: Teile) {
    setTeile(neu)
    onAenderung?.(isoAusTeilen(neu) ?? "")
  }

  function eingabe(teil: keyof Teile, text: string) {
    const reihenfolge: (keyof Teile)[] = ["tag", "monat", "jahr"]
    const laengen = { tag: 2, monat: 2, jahr: 4 }
    const neu = { ...teile }

    // Normalfall: eine Ziffer ins aktuelle Teil. Kommen mehr Ziffern auf einmal
    // an (Autofill, Spracheingabe, Einfügen ohne Trennzeichen), laufen die
    // überzähligen in die folgenden Teile weiter ("17102026" → 17 / 10 / 2026).
    let rest = text.replace(/\D/g, "")
    let letztes = teil
    for (let i = reihenfolge.indexOf(teil); i < reihenfolge.length && (rest.length > 0 || i === reihenfolge.indexOf(teil)); i++) {
      const aktuell = reihenfolge[i]
      neu[aktuell] = rest.slice(0, laengen[aktuell])
      rest = rest.slice(laengen[aktuell])
      letztes = aktuell
    }

    // Erste Ziffer kann keine Zehnerstelle sein (Tag 4–9, Monat 2–9) → sofort mit Null auffüllen.
    const letzterText = neu[letztes]
    if (letzterText.length === 1 && ((letztes === "tag" && Number(letzterText) > 3) || (letztes === "monat" && Number(letzterText) > 1))) {
      neu[letztes] = "0" + letzterText
    }
    melden(neu)

    // Ist das zuletzt bearbeitete Teil voll, springt der Cursor ins nächste.
    if (neu[letztes].length === laengen[letztes]) {
      if (letztes === "tag") monatRef.current?.focus()
      if (letztes === "monat") jahrRef.current?.focus()
    }
  }

  function taste(ereignis: React.KeyboardEvent<HTMLInputElement>, teil: keyof Teile) {
    const feld = ereignis.currentTarget
    const vorher = teil === "monat" ? tagRef.current : teil === "jahr" ? monatRef.current : null
    const nachher = teil === "tag" ? monatRef.current : teil === "monat" ? jahrRef.current : null

    if ([".", "/", "-", " ", ","].includes(ereignis.key)) {
      ereignis.preventDefault()
      if (!nachher) return
      // Einzelne Ziffer mit Null auffüllen und weiter.
      if (teile[teil].length === 1) melden({ ...teile, [teil]: "0" + teile[teil] })
      nachher.focus()
      return
    }
    if (ereignis.key === "Backspace" && feld.value === "" && vorher) {
      ereignis.preventDefault()
      vorher.focus()
      return
    }
    if (ereignis.key === "ArrowLeft" && feld.selectionStart === 0 && feld.selectionEnd === 0 && vorher) {
      ereignis.preventDefault()
      vorher.focus()
      vorher.setSelectionRange(vorher.value.length, vorher.value.length)
      return
    }
    if (ereignis.key === "ArrowRight" && feld.selectionStart === feld.value.length && nachher) {
      ereignis.preventDefault()
      nachher.focus()
      nachher.setSelectionRange(0, 0)
    }
  }

  function einfuegen(ereignis: React.ClipboardEvent<HTMLInputElement>) {
    const text = ereignis.clipboardData.getData("text").trim()
    const punkt = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(text)
    const iso8601 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
    if (!punkt && !iso8601) return // alles andere: normales Einfügen in das aktuelle Teil
    ereignis.preventDefault()
    const [tag, monat, jahr] = punkt ? [punkt[1], punkt[2], punkt[3]] : [iso8601![3], iso8601![2], iso8601![1]]
    melden({ tag: tag.padStart(2, "0"), monat: monat.padStart(2, "0"), jahr })
    jahrRef.current?.focus()
  }

  // --- Kalender-Pop-over (nur Computer) -------------------------------------

  /** Setzt das Pop-over unter (oder, wenn dort kein Platz ist, über) das Feld. */
  function positionieren() {
    const feld = feldRef.current
    const pop = popoverRef.current
    if (!feld || !pop) return
    const rand = 8
    const rect = feld.getBoundingClientRect()
    const hoehe = pop.offsetHeight
    const breite = pop.offsetWidth
    let oben = rect.bottom + 6
    if (oben + hoehe > window.innerHeight - rand && rect.top - 6 - hoehe >= rand) oben = rect.top - 6 - hoehe
    const links = Math.min(Math.max(rand, rect.left), window.innerWidth - breite - rand)
    pop.style.top = `${Math.max(rand, oben)}px`
    pop.style.left = `${links}px`
  }

  function kalenderSchliessen(fokusZurueck: boolean) {
    setKalenderOffen(false)
    if (fokusZurueck) kalenderKnopfRef.current?.focus()
  }

  // Pop-over zeigen/verstecken (Top Layer: liegt auch über modalen Fenstern) und
  // dabei Klick außerhalb, Scrollen und Größenänderung überwachen.
  useEffect(() => {
    const pop = popoverRef.current
    if (!pop) return
    if (!kalenderOffen) {
      if (pop.matches(":popover-open")) pop.hidePopover()
      return
    }
    pop.showPopover()
    positionieren()
    const frame = window.requestAnimationFrame(positionieren)

    function beiKlickAussen(ereignis: PointerEvent) {
      const ziel = ereignis.target as Node
      if (pop?.contains(ziel) || kalenderKnopfRef.current?.contains(ziel)) return
      setKalenderOffen(false)
    }
    // Escape schließt NUR den Kalender (nicht das umgebende Fenster) — auf
    // Dokumentebene, damit es auch greift, wenn der Fokus gerade nirgends im
    // Kalender steht (z. B. nach dem Wechsel zur Monatsauswahl).
    function beiTaste(ereignis: KeyboardEvent) {
      if (ereignis.key !== "Escape") return
      ereignis.preventDefault()
      ereignis.stopPropagation()
      kalenderSchliessen(true)
    }
    document.addEventListener("keydown", beiTaste, true)
    document.addEventListener("pointerdown", beiKlickAussen, true)
    window.addEventListener("resize", positionieren)
    window.addEventListener("scroll", positionieren, true)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener("keydown", beiTaste, true)
      document.removeEventListener("pointerdown", beiKlickAussen, true)
      window.removeEventListener("resize", positionieren)
      window.removeEventListener("scroll", positionieren, true)
    }
  }, [kalenderOffen])

  // Fehler zeigen, sobald das Jahr komplett ist (dann ist die Eingabe fertig) oder das Feld verlassen wurde.
  const zeigeFehler = fehler !== "" && (angefasst || teile.jahr.length === 4)
  const gross = groesse === "gross"
  const teilKlasse =
    "bg-transparent text-center text-primaer outline-none placeholder:text-tertiaer " + (gross ? "text-base" : "text-sm")
  const rahmen = zeigeFehler ? "border-red-500" : "border-flaeche-300"
  // Handy/Tablet: das Gerätefeld bekommt dieselbe Optik und Höhe wie die Nachbarfelder.
  const nativKlasse =
    "hidden w-full rounded-lg border bg-flaeche text-primaer focus:border-marke-gruen focus:outline focus:outline-2 focus:outline-marke-gruen pointer-coarse:block " +
    (gross ? "h-11 px-3 text-base " : "h-9 px-2 text-sm ") +
    rahmen

  return (
    <div className={className}>
      <div
        ref={feldRef}
        className={
          "relative items-center gap-0.5 rounded-lg border bg-flaeche focus-within:border-marke-gruen flex pointer-coarse:hidden " +
          (gross ? "h-11 px-3 " : "h-9 px-2 ") +
          rahmen
        }
        onBlur={(ereignis) => {
          // Nur wenn der Fokus das GANZE Feld verlässt (nicht beim Wechsel zwischen den Teilen
          // oder in den geöffneten Kalender hinein).
          if (kalenderOffen) return
          if (!ereignis.currentTarget.contains(ereignis.relatedTarget as Node | null)) {
            setAngefasst(true)
            // "05.10.26" → Jahr 2026 ergänzen.
            if (teile.jahr.length === 2) melden({ ...teile, jahr: "20" + teile.jahr })
          }
        }}
      >
        <input
          ref={tagRef}
          id={istTouch ? undefined : idProp}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="TT"
          aria-label={`${ariaLabel ?? "Datum"}: Tag`}
          aria-invalid={zeigeFehler}
          aria-required={required}
          aria-describedby={zeigeFehler ? `${id}-fehler` : undefined}
          value={teile.tag}
          onChange={(e) => eingabe("tag", e.target.value)}
          onKeyDown={(e) => taste(e, "tag")}
          onPaste={einfuegen}
          onFocus={(e) => e.currentTarget.select()}
          className={teilKlasse + (gross ? " w-7" : " w-6")}
        />
        <span aria-hidden className="text-tertiaer">
          .
        </span>
        <input
          ref={monatRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="MM"
          aria-label={`${ariaLabel ?? "Datum"}: Monat`}
          value={teile.monat}
          onChange={(e) => eingabe("monat", e.target.value)}
          onKeyDown={(e) => taste(e, "monat")}
          onPaste={einfuegen}
          onFocus={(e) => e.currentTarget.select()}
          className={teilKlasse + (gross ? " w-7" : " w-6")}
        />
        <span aria-hidden className="text-tertiaer">
          .
        </span>
        <input
          ref={jahrRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="JJJJ"
          aria-label={`${ariaLabel ?? "Datum"}: Jahr`}
          value={teile.jahr}
          onChange={(e) => eingabe("jahr", e.target.value)}
          onKeyDown={(e) => taste(e, "jahr")}
          onPaste={einfuegen}
          onFocus={(e) => e.currentTarget.select()}
          className={teilKlasse + (gross ? " w-12" : " w-10")}
        />

        <button
          ref={kalenderKnopfRef}
          type="button"
          onClick={() => (kalenderOffen ? kalenderSchliessen(false) : setKalenderOffen(true))}
          aria-label={`${ariaLabel ?? "Datum"}: Kalender öffnen`}
          aria-haspopup="dialog"
          aria-expanded={kalenderOffen}
          className={
            "ml-1.5 rounded p-0.5 transition hover:text-primaer focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen " +
            (kalenderOffen ? "text-marke-gruen-dunkel" : "text-tertiaer")
          }
        >
          <CalendarDays className="h-4 w-4" aria-hidden />
        </button>

        {/* Der Kalender selbst: im Top Layer (liegt über Pop-up-Fenstern, wird nicht von
            scrollenden Containern abgeschnitten), per Hand geöffnet/geschlossen. */}
        <div
          ref={popoverRef}
          popover="manual"
          className="fixed inset-auto m-0 overflow-visible border-0 bg-transparent p-0"
        >
          {kalenderOffen && (
            <KalenderAuswahl
              wert={iso ?? ""}
              heute={heutigesDatumIso()}
              min={min}
              max={max}
              onWahl={(gewaehlt) => {
                melden(teileAusIso(gewaehlt))
                setAngefasst(true)
                kalenderSchliessen(true)
              }}
              onLoeschen={
                required
                  ? undefined
                  : () => {
                      melden(LEER)
                      kalenderSchliessen(true)
                    }
              }
              onSchliessen={() => kalenderSchliessen(true)}
            />
          )}
        </div>
      </div>

      {/* Handy/Tablet: Datumsauswahl des Geräts (Rad bzw. Kalender des Betriebssystems). */}
      <input
        ref={nativRef}
        id={istTouch ? idProp : undefined}
        type="date"
        min={min}
        max={max}
        aria-label={ariaLabel ?? "Datum"}
        aria-invalid={zeigeFehler}
        aria-describedby={zeigeFehler ? `${id}-fehler` : undefined}
        value={iso ?? ""}
        onChange={(e) => melden(e.target.value ? teileAusIso(e.target.value) : LEER)}
        onBlur={() => setAngefasst(true)}
        className={nativKlasse}
      />

      <input ref={versteckRef} type="hidden" name={name} value={iso ?? ""} disabled={!name} />

      {zeigeFehler && (
        <p id={`${id}-fehler`} role="alert" className="mt-1 text-xs text-red-600">
          {fehler}
        </p>
      )}
    </div>
  )
}
