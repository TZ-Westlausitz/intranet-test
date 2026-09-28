"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { formularPrueferRegistrieren } from "@/lib/formular-schutz"

/**
 * Warnt, bevor eine Seite mit ungespeicherten Formular-Änderungen verlassen
 * wird (Rückmeldung 2026-09-28, zuerst am Fuhrpark-Formular gewünscht, dann
 * "auch generell"). Als letztes Kind INNERHALB des zu schützenden `<form>`
 * einbinden — sucht sich sein Formular selbst über einen unsichtbaren
 * Marker (`.closest("form")`), keine Props nötig. Mehrere Formulare auf
 * derselben Seite (z. B. eines je Listenzeile) sind unabhängig voneinander.
 *
 * "Geändert" heißt: die aktuellen Formularwerte (`new FormData(form)`)
 * unterscheiden sich vom Stand beim Laden bzw. vom Stand beim letzten
 * echten Absenden. Das reicht für jedes Formular in diesem Projekt, ohne
 * dass jede Seite ihre Felder einzeln melden müsste.
 *
 * Deckt ab:
 * - Klick auf einen Link irgendwo auf der Seite (Kopfzeile, "← Zurück"/
 *   "← Fuhrpark"-Links, Bausteine-Leiste, Handy-Fußleiste) — eigenes Pop-up
 *   mit Ja/Nein statt sofort zu navigieren.
 * - Den "← Zurück"-Button (`ZurueckButton`) — der hat selbst keinen Link,
 *   sondern ruft `verlassenMitBestaetigung()` auf (siehe
 *   src/lib/formular-schutz.ts).
 * - Steckt das Formular in einem Pop-up-Dialog (`<dialog>`): Escape-Taste
 *   und der "Abbrechen"/"Schließen"-Knopf (jeder Klick, der `.close()`
 *   auslöst) — dieselbe Bestätigung, bevor der Dialog wirklich schließt.
 * - Tab schließen, Neuladen, Adresszeile, externer Link: NUR der native
 *   Browser-Hinweis (`beforeunload`) — Browser lassen aus
 *   Sicherheitsgründen seit Jahren keinen eigenen Text/eigenes Design mehr
 *   dafür zu, das ist keine Einschränkung dieses Codes.
 *
 * NICHT abgedeckt: der physische Zurück/Vorwärts-Button des Browsers
 * (History). Das bräuchte einen fehleranfälligen History-Trick — bewusst
 * weggelassen, siehe CLAUDE.md ("naheliegende, langweilige Lösungen
 * schlagen clevere").
 */
export function FormularAenderungenSchutz() {
  const router = useRouter()
  const markerRef = useRef<HTMLSpanElement>(null)
  // Ein einmaliger "ich schließe gerade selbst, nicht erneut fragen"-Schuss
  // für genau den einen `.close()`-Aufruf aus `verlassen()` unten — KEINE
  // dauerhafte "schon einmal bestätigt"-Sperre (die würde nach dem ersten
  // Bestätigen jede spätere echte Änderung ungefragt durchlassen).
  const selbstAusgeloestRef = useRef(false)
  const naechsteAktionRef = useRef<(() => void) | null>(null)
  const [bestaetigungOffen, setBestaetigungOffen] = useState(false)
  const bestaetigungsDialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const form = markerRef.current?.closest("form")
    if (!form) return

    // Nach einem echten Absenden gilt der gerade abgeschickte Stand als der
    // neue "gespeicherte" Ausgangspunkt — sonst bliebe ein Formular, das
    // nach dem Speichern auf derselben Seite stehen bleibt (z. B. in einem
    // Bearbeiten-Dialog), für immer als "geändert" markiert.
    let anfangswert = serialisiere(form)
    const istSchmutzig = () => serialisiere(form!) !== anfangswert

    function beiAbsenden() {
      anfangswert = serialisiere(form!)
    }
    form.addEventListener("submit", beiAbsenden)

    // Manche Formulare setzen sich nach erfolgreichem (asynchronem)
    // Absenden selbst per `form.reset()` zurück (z. B.
    // person-erstellen-formular.tsx) — das feuert ein natives
    // "reset"-Ereignis, auf das hier ebenfalls neu eingemessen wird, sonst
    // würde das jetzt leere Formular fälschlich als "geändert" gegenüber
    // dem zuletzt AUSGEFÜLLTEN Stand gelten.
    function beiZuruecksetzen() {
      // `reset` feuert VOR dem eigentlichen Zurücksetzen der Feldwerte —
      // ohne Verzögerung würden wir noch die alten (ausgefüllten) Werte lesen.
      setTimeout(() => {
        anfangswert = serialisiere(form!)
      }, 0)
    }
    form.addEventListener("reset", beiZuruecksetzen)

    function beiBeforeUnload(ereignis: BeforeUnloadEvent) {
      if (istSchmutzig()) {
        ereignis.preventDefault()
        ereignis.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", beiBeforeUnload)

    // Klick auf einen Link irgendwo auf der Seite (Capture-Phase, damit wir
    // vor dem Link selbst reagieren) — nur echte Seitenwechsel abfangen,
    // kein Anker-Sprung, kein neuer Tab, kein Klick mit gedrückter Zusatztaste.
    function beiKlick(ereignis: MouseEvent) {
      if (!istSchmutzig()) return
      if (ereignis.defaultPrevented || ereignis.button !== 0) return
      if (ereignis.metaKey || ereignis.ctrlKey || ereignis.shiftKey || ereignis.altKey) return
      const link = (ereignis.target as HTMLElement)?.closest?.("a")
      if (!link) return
      const href = link.getAttribute("href")
      if (!href || href.startsWith("#") || link.target === "_blank") return

      ereignis.preventDefault()
      ereignis.stopPropagation()
      naechsteAktionRef.current = () => router.push(href)
      setBestaetigungOffen(true)
    }
    document.addEventListener("click", beiKlick, true)

    // Formular in einem Pop-up-Dialog: Escape-Taste ("cancel"-Ereignis,
    // abbrechbar) und der "Abbrechen"/"Schließen"-Knopf (löst direkt
    // `.close()` aus, dafür gibt es kein abbrechbares Vorher-Ereignis — der
    // Dialog wird deshalb sofort wieder geöffnet und stattdessen unsere
    // Bestätigung gezeigt).
    const dialog = form.closest("dialog")
    function beiAbbrechenTaste(ereignis: Event) {
      if (!istSchmutzig()) return
      ereignis.preventDefault()
      naechsteAktionRef.current = () => {
        selbstAusgeloestRef.current = true
        dialog!.close()
      }
      setBestaetigungOffen(true)
    }
    function beiSchliessen() {
      if (selbstAusgeloestRef.current) {
        selbstAusgeloestRef.current = false
        return
      }
      if (!istSchmutzig()) return
      dialog!.showModal()
      naechsteAktionRef.current = () => {
        selbstAusgeloestRef.current = true
        dialog!.close()
      }
      setBestaetigungOffen(true)
    }
    dialog?.addEventListener("cancel", beiAbbrechenTaste)
    dialog?.addEventListener("close", beiSchliessen)

    // "← Zurück"-Button (und Ähnliches ohne eigenen Link): kennt dieses
    // Formular nicht, ruft stattdessen verlassenMitBestaetigung() auf, die
    // reihum bei allen angemeldeten Formularen dieser Seite nachfragt.
    const abmelden = formularPrueferRegistrieren({
      istSchmutzig,
      dialogOeffnen: (weiterNavigieren) => {
        naechsteAktionRef.current = weiterNavigieren
        setBestaetigungOffen(true)
      },
    })

    return () => {
      form.removeEventListener("submit", beiAbsenden)
      form.removeEventListener("reset", beiZuruecksetzen)
      window.removeEventListener("beforeunload", beiBeforeUnload)
      document.removeEventListener("click", beiKlick, true)
      dialog?.removeEventListener("cancel", beiAbbrechenTaste)
      dialog?.removeEventListener("close", beiSchliessen)
      abmelden()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (bestaetigungOffen) bestaetigungsDialogRef.current?.showModal()
  }, [bestaetigungOffen])

  function abbrechen() {
    bestaetigungsDialogRef.current?.close()
    setBestaetigungOffen(false)
    naechsteAktionRef.current = null
  }

  function verlassen() {
    naechsteAktionRef.current?.()
    bestaetigungsDialogRef.current?.close()
    setBestaetigungOffen(false)
  }

  return (
    <>
      <span ref={markerRef} aria-hidden className="hidden" />

      {bestaetigungOffen && (
        <dialog
          ref={bestaetigungsDialogRef}
          onClose={abbrechen}
          className="fixed top-1/2 left-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rand bg-flaeche p-0 shadow-xl backdrop:bg-neutral-900/40"
        >
          <div className="flex flex-col gap-3 px-5 py-5">
            <h2 className="text-lg font-semibold text-ueberschrift">Ungespeicherte Änderungen</h2>
            <p className="text-sm text-primaer">Diese Seite verlassen, ohne zu speichern?</p>
            <div className="mt-1 flex justify-end gap-2">
              <button
                type="button"
                onClick={abbrechen}
                className="h-9 rounded-lg px-3 text-sm font-medium text-sekundaer transition hover:bg-flaeche-100"
              >
                Nein
              </button>
              <button
                type="button"
                onClick={verlassen}
                className="h-9 rounded-lg bg-marke-orange px-3 text-sm font-semibold text-neutral-900 transition hover:brightness-95"
              >
                Ja, verlassen
              </button>
            </div>
          </div>
        </dialog>
      )}
    </>
  )
}

/**
 * Formularwerte als Vergleichs-String — reicht als einfacher "hat sich
 * etwas geändert"-Test. Datei-Eingaben (z. B. Anhänge) gehen über
 * Name/Größe/Änderungsdatum ein, nicht über den Dateiinhalt — genug, um
 * "eine andere/neue Datei gewählt" zu erkennen, ohne die Datei zu lesen.
 */
function serialisiere(form: HTMLFormElement): string {
  const teile: string[] = []
  for (const [schluessel, wert] of new FormData(form)) {
    teile.push(
      wert instanceof File ? `${schluessel}=${wert.name}:${wert.size}:${wert.lastModified}` : `${schluessel}=${wert}`,
    )
  }
  return teile.join("&")
}
