"use client"

import { useState } from "react"
import Link from "next/link"

export type ChatWidgetKonversation = {
  konversationId: string | null
  gruppeId: string | null
  titel: string
  istGruppe: boolean
  letzteNachricht: { text: string; von: string; erstelltAm: Date } | null
  ungelesen: boolean
}

/**
 * Rundes Icon unten rechts, das sich wie bei bekannten Messengern nach
 * oben zu einem Fenster mit den letzten Konversationen ausklappt — bis
 * 2026-09-10 nur eine "kommt bald"-Hülle (siehe Git-Historie), jetzt mit
 * echten Daten aus demselben `meineKonversationen` wie die volle
 * Übersicht `/chat` (Rückmeldung: Menüpunkt "Chat" und dieses Icon liefen
 * sichtbar auseinander). Zeigt bewusst nur die 5 aktivsten BESTEHENDEN
 * Konversationen (keine "noch nicht begonnenen" Gruppenchats — die
 * gehören in die volle Übersicht, hier soll es ein schneller Überblick
 * bleiben) — ein Klick öffnet die jeweilige Konversation direkt, "Alle
 * Chats ansehen" führt zu `/chat`.
 */
export function ChatWidget({
  konversationen,
  ungeleseneAnzahl,
}: {
  konversationen: ChatWidgetKonversation[]
  ungeleseneAnzahl: number
}) {
  const [offen, setOffen] = useState(false)
  const angezeigt = konversationen.filter((k) => k.konversationId !== null).slice(0, 5)

  return (
    <div className="fixed right-4 bottom-4 z-40 flex flex-col items-end gap-3">
      {offen && (
        <div
          role="dialog"
          aria-label="Chats"
          className="flex h-[50vh] max-h-[28rem] min-h-[16rem] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-rand bg-flaeche shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-rand bg-marke-gruen/10 px-4 py-3">
            <span className="text-sm font-semibold text-ueberschrift">Chats</span>
            <button
              type="button"
              onClick={() => setOffen(false)}
              aria-label="Chats schließen"
              className="rounded-lg p-1 text-sekundaer transition hover:bg-marke-gruen/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {angezeigt.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-1 px-6 text-center">
                <p className="text-sm font-medium text-primaer">Noch keine Konversationen</p>
                <p className="text-xs text-tertiaer">Schreib über den Menüpunkt Chat jemandem eine Nachricht.</p>
              </div>
            ) : (
              angezeigt.map((k) => (
                <Link
                  key={k.konversationId}
                  href={`/chat/${k.konversationId}`}
                  onClick={() => setOffen(false)}
                  className={
                    "block border-b border-rand px-4 py-2.5 transition hover:bg-marke-gruen/5 " +
                    (k.ungelesen ? "bg-marke-gruen/5" : "")
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className={"truncate text-sm " + (k.ungelesen ? "font-semibold text-ueberschrift" : "text-primaer")}>
                      {k.istGruppe && "👥 "}
                      {k.titel}
                    </p>
                    {k.ungelesen && <span className="h-2 w-2 shrink-0 rounded-full bg-marke-orange" />}
                  </div>
                  {k.letzteNachricht && (
                    <p className="truncate text-xs text-tertiaer">
                      {k.letzteNachricht.von}: {k.letzteNachricht.text}
                    </p>
                  )}
                </Link>
              ))
            )}
          </div>

          <Link
            href="/chat"
            onClick={() => setOffen(false)}
            className="border-t border-rand px-4 py-2.5 text-center text-sm font-medium text-marke-gruen-dunkel hover:underline"
          >
            Alle Chats ansehen
          </Link>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOffen((v) => !v)}
        aria-expanded={offen}
        aria-label={offen ? "Chats schließen" : "Chats öffnen"}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-marke-gruen text-neutral-900 shadow-lg transition hover:bg-marke-gruen-dunkel focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marke-gruen-dunkel"
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

        {ungeleseneAnzahl > 0 && (
          <span
            aria-label={`${ungeleseneAnzahl} ungelesene Chats`}
            className="absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-marke-orange px-1 text-[10px] font-bold text-neutral-900"
          >
            {ungeleseneAnzahl}
          </span>
        )}
      </button>
    </div>
  )
}
