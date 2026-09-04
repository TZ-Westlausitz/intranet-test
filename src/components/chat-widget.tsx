"use client"

import { useState } from "react"

/**
 * Platzhalter für den künftigen Chat-Baustein (siehe Memory
 * kuenftige-bausteine-aus-altsystem) — nur die Fenster-Hülle: ein rundes
 * Icon unten rechts, das sich wie bei bekannten Messengern nach oben zu
 * einem Fenster ausklappt. Zeigt noch keine echten Chats — die
 * Verschlüsselungs- und Datenmodell-Entscheidung für den echten Baustein
 * (Ende-zu-Ende vs. Transport, siehe Regel 10 CLAUDE.md) steht noch aus.
 */
export function ChatWidget() {
  const [offen, setOffen] = useState(false)

  return (
    <div className="fixed right-4 bottom-4 z-40 flex flex-col items-end gap-3">
      {offen && (
        <div
          role="dialog"
          aria-label="Chats"
          className="flex h-[50vh] max-h-[28rem] min-h-[16rem] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-neutral-200 bg-marke-gruen/10 px-4 py-3">
            <span className="text-sm font-semibold text-marke-grau">Chats</span>
            <button
              type="button"
              onClick={() => setOffen(false)}
              aria-label="Chats schließen"
              className="rounded-lg p-1 text-neutral-500 transition hover:bg-marke-gruen/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center gap-1 px-6 text-center">
            <p className="text-sm font-medium text-neutral-600">Chatfunktion kommt bald</p>
            <p className="text-xs text-neutral-400">
              Hier können Kolleginnen und Kollegen künftig direkt miteinander schreiben.
            </p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOffen((v) => !v)}
        aria-expanded={offen}
        aria-label={offen ? "Chats schließen" : "Chats öffnen"}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-marke-gruen text-neutral-900 shadow-lg transition hover:bg-marke-gruen-dunkel focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marke-gruen-dunkel"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
          aria-hidden
        >
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      </button>
    </div>
  )
}
