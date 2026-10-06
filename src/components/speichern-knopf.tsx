"use client"

import { useEffect, useRef, type ButtonHTMLAttributes } from "react"
import { useFormStatus } from "react-dom"

import { zeigeToast } from "@/components/toast-anzeige"

/**
 * Absende-Knopf mit sichtbarer Rückmeldung (Rückmeldung 2026-10-06): Während
 * gespeichert wird, ist er gesperrt und zeigt `ladeText` ("Wird gespeichert
 * …") — das verhindert Doppelklicks und zeigt, dass etwas passiert. Danach
 * erscheint kurz die Einblendung "Gespeichert" (`gespeichertText`).
 *
 * Gedacht für jedes `<form action={Server Action}>`; `useFormStatus` liest den
 * Zustand des umgebenden Formulars, der Knopf muss also IM Formular stehen.
 * Alle üblichen Button-Eigenschaften (className, disabled, formAction, …)
 * gehen unverändert durch; das Aussehen bleibt Sache des Aufrufers.
 *
 * Fehlerfälle: Schlägt eine Aktion mit einer Meldung fehl, leitet sie wie
 * überall in der App auf dieselbe Seite mit `?fehler=…` um — dann bleibt die
 * Bestätigung aus, die Fehlermeldung der Seite steht für sich. `toast={false}`
 * schaltet die Einblendung ab, wenn der Aufrufer die Rückmeldung selbst gibt
 * (z. B. weil seine Aktion einen Fehlertext zurückliefert).
 */
export function SpeichernKnopf({
  children,
  ladeText = "Wird gespeichert …",
  gespeichertText = "Gespeichert",
  toast = true,
  laeuft,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  ladeText?: string
  gespeichertText?: string
  toast?: boolean
  /** Für Formulare, die per `onSubmit` statt `<form action>` absenden: Zustand von außen (z. B. aus useActionState). */
  laeuft?: boolean
}) {
  const formStatus = useFormStatus()
  const pending = laeuft ?? formStatus.pending
  const warPending = useRef(false)

  useEffect(() => {
    if (pending) {
      warPending.current = true
      return
    }
    if (!warPending.current) return
    warPending.current = false
    if (!toast) return
    // Kurz warten, bis eine mögliche Umleitung mit ?fehler=… in der Adresszeile steht.
    const timer = window.setTimeout(() => {
      if (!new URLSearchParams(window.location.search).has("fehler")) zeigeToast(gespeichertText)
    }, 50)
    return () => window.clearTimeout(timer)
  }, [pending, toast, gespeichertText])

  return (
    <button type="submit" {...rest} disabled={disabled || pending} aria-busy={pending}>
      {pending ? ladeText : children}
    </button>
  )
}
