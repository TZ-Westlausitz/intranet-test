"use client"

import { useState } from "react"
import Link from "next/link"
import { BellOff, Search, Users } from "lucide-react"

import { formatiereDatumAusDate, zeitAusDate } from "@/lib/datum"
// Laufzeit-Import aus @/lib/chat/abfragen vermeiden (zieht dessen
// Prisma-Import in den Browser-Bundle, diese Datei ist eine Client
// Component) — nur der Typ wird gebraucht, der ist zur Laufzeit weg.
import type { meineKonversationen } from "@/lib/chat/abfragen"

type KonversationAnzeige = Awaited<ReturnType<typeof meineKonversationen>>[number]

/** Titel(+Symbole)/Vorschauzeile — ausgelagert für Wiederverwendung in der archivierten Box. */
function KonversationInhalt({ konversation: k }: { konversation: KonversationAnzeige }) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1 truncate text-sm font-medium text-ueberschrift">
          {k.istGruppe && <Users className="h-4 w-4 shrink-0 text-sekundaer" aria-hidden />}
          {k.stumm && <BellOff className="h-4 w-4 shrink-0 text-tertiaer" aria-hidden />}
          {k.titel}
        </p>
        {k.letzteNachricht && (
          <p className="shrink-0 text-xs text-tertiaer">
            {formatiereDatumAusDate(k.letzteNachricht.erstelltAm)}, {zeitAusDate(k.letzteNachricht.erstelltAm)}
          </p>
        )}
      </div>
      {k.letzteNachricht ? (
        <p className="truncate text-sm text-sekundaer">
          {k.letzteNachricht.von}: {k.letzteNachricht.text}
        </p>
      ) : (
        <p className="text-sm text-tertiaer">Noch keine Nachrichten.</p>
      )}
    </>
  )
}

/** Eine Zeile der aktiven Liste — Link bei bereits geöffneter Konversation, sonst ein Button, der `gruppenchatOeffnen` anstößt (Muster oben unverändert). */
function KonversationZeile({
  konversation: k,
  gruppenchatOeffnenAktion,
}: {
  konversation: KonversationAnzeige
  gruppenchatOeffnenAktion: (gruppeId: string) => void
}) {
  const klasse =
    "flex flex-col gap-0.5 rounded-xl border bg-flaeche p-4 text-left transition hover:border-marke-gruen " +
    (k.ungelesen ? "border-marke-gruen bg-marke-gruen/5" : "border-rand")

  return k.konversationId ? (
    <Link href={`/chat/${k.konversationId}`} className={klasse}>
      <KonversationInhalt konversation={k} />
    </Link>
  ) : (
    <form action={gruppenchatOeffnenAktion.bind(null, k.gruppeId as string)}>
      <button type="submit" className={klasse + " w-full"}>
        <KonversationInhalt konversation={k} />
      </button>
    </form>
  )
}

/**
 * Konversationsliste samt Suchzeile — Suche ist echte Interaktivität,
 * deshalb Client Component mit vorab geladenen, serialisierbaren Props
 * (analog zu KontakteListe): kein Server-Roundtrip pro Tastenanschlag.
 * Rückmeldung 2026-10-01: Suchfeld mit Lupensymbol oben, filtert nach dem
 * angezeigten Titel (Personenname bei Direktnachrichten, Gruppenname bei
 * Gruppen) — keine Volltextsuche über Nachrichteninhalte, das wäre ein
 * eigenes, größeres Thema.
 */
export function ChatKonversationenListe({
  aktive,
  archivierte,
  gruppenchatOeffnenAktion,
  konversationArchivierenAktion,
}: {
  aktive: KonversationAnzeige[]
  archivierte: KonversationAnzeige[]
  gruppenchatOeffnenAktion: (gruppeId: string) => void
  konversationArchivierenAktion: (konversationId: string, archivieren: boolean) => void
}) {
  const [suchtext, setSuchtext] = useState("")

  const treffer = (k: KonversationAnzeige) => k.titel.toLowerCase().includes(suchtext.toLowerCase())
  const aktiveGefiltert = aktive.filter(treffer)
  const archivierteGefiltert = archivierte.filter(treffer)

  return (
    <>
      <div className="relative mt-6">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-tertiaer" />
        <input
          type="text"
          value={suchtext}
          onChange={(ereignis) => setSuchtext(ereignis.target.value)}
          placeholder="Chat suchen …"
          aria-label="Chat suchen"
          className="h-10 w-full rounded-lg border border-flaeche-300 pr-3 pl-9 text-sm"
        />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {aktiveGefiltert.length === 0 && (
          <p className="text-sm text-sekundaer">
            {aktive.length === 0 && archivierte.length === 0 ? "Noch keine Konversationen." : "Keine Treffer."}
          </p>
        )}

        {aktiveGefiltert.map((k) => (
          <KonversationZeile key={k.konversationId ?? k.gruppeId} konversation={k} gruppenchatOeffnenAktion={gruppenchatOeffnenAktion} />
        ))}
      </div>

      {archivierteGefiltert.length > 0 && (
        <details className="mt-6 rounded-xl border border-rand bg-flaeche" open={suchtext !== ""}>
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-sekundaer">
            Archivierte Chats ({archivierteGefiltert.length})
          </summary>
          <div className="flex flex-col gap-2 border-t border-rand p-2">
            {archivierteGefiltert.map((k) => (
              <div key={k.konversationId} className="flex items-center gap-2">
                <Link
                  href={`/chat/${k.konversationId}`}
                  className="min-w-0 flex-1 rounded-xl border border-rand bg-flaeche p-4 text-left transition hover:border-marke-gruen"
                >
                  <KonversationInhalt konversation={k} />
                </Link>
                <form action={konversationArchivierenAktion.bind(null, k.konversationId as string, false)}>
                  <button
                    type="submit"
                    className="h-9 shrink-0 rounded-lg px-2.5 text-xs font-medium text-sekundaer transition hover:bg-flaeche-100"
                  >
                    Wiederherstellen
                  </button>
                </form>
              </div>
            ))}
          </div>
        </details>
      )}
    </>
  )
}
