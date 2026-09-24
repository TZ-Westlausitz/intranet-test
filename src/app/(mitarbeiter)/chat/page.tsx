import Link from "next/link"
import { BellOff, Users } from "lucide-react"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import { ChatNeueNachrichtDialog } from "@/components/chat-neue-nachricht-dialog"
import { ChatNeueGruppeDialog } from "@/components/chat-neue-gruppe-dialog"
import { meineKonversationen } from "@/lib/chat/abfragen"
import { direktkonversationOeffnen, gruppenchatOeffnen, gruppenchatErstellen, konversationArchivieren } from "@/lib/chat/aktionen"
import { formatiereDatumAusDate, zeitAusDate } from "@/lib/datum"

/**
 * Konversationsübersicht — Direktnachrichten ("+ Neuer Chat", genau zwei
 * Personen), automatische Gruppenchats (eine Zeile pro eigener Gruppe,
 * auch bevor die erste Nachricht geschrieben wurde, siehe
 * meineKonversationen) und frei angelegte Gruppen ("+ Neue Gruppe", feste
 * Mitgliederliste, siehe gruppenchatErstellen) in einer Liste, sortiert
 * nach letzter Aktivität. Zugriffskontrolle statt Ende-zu-Ende-
 * Verschlüsselung (siehe Plan/Memory chat-baustein) — deshalb ist eine
 * echte Vorschauzeile hier möglich, anders als bei einer verschlüsselten
 * Variante.
 */
export default async function ChatUebersichtSeite({
  searchParams,
}: {
  searchParams: Promise<{ neu?: string }>
}) {
  const kontext = await berechtigung()
  const { neu } = await searchParams
  const [konversationen, personen, gruppen] = await Promise.all([
    meineKonversationen(kontext),
    prisma.person.findMany({
      where: { aktiv: true, NOT: { benutzername: kontext.personId } },
      orderBy: [{ nachname: "asc" }, { vorname: "asc" }],
      select: { benutzername: true, vorname: true, nachname: true },
    }),
    prisma.gruppe.findMany({ where: { aktiv: true }, orderBy: { name: "asc" } }),
  ])
  const personenOptionen = personen.map((p) => ({ id: p.benutzername, name: `${p.vorname} ${p.nachname}` }))
  const gruppenOptionen = gruppen.map((g) => ({ id: g.id, name: g.name }))

  // Archivierte Konversationen (Rückmeldung 2026-09-24) stecken in einer
  // eigenen, eingeklappten Box unten statt in der normalen Liste — Muster
  // "Deaktivierte Mitarbeiter" in der Benutzerverwaltung. Eine
  // Konversation, die noch nie geöffnet wurde (konversationId: null, siehe
  // meineKonversationen), kann nie archiviert sein.
  const aktive = konversationen.filter((k) => !k.istArchiviert)
  const archivierte = konversationen.filter((k) => k.istArchiviert)

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Kopfleiste />
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-ueberschrift">Chat</h1>
        <div className="flex gap-2">
          <ChatNeueGruppeDialog personen={personenOptionen} gruppen={gruppenOptionen} erstellenAktion={gruppenchatErstellen} />
          <ChatNeueNachrichtDialog
            personen={personenOptionen}
            oeffnenAktion={direktkonversationOeffnen}
            autoOeffnen={neu === "1"}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {aktive.length === 0 && archivierte.length === 0 && (
          <p className="text-sm text-sekundaer">Noch keine Konversationen.</p>
        )}

        {aktive.map((k) => (
          <KonversationZeile key={k.konversationId ?? k.gruppeId} konversation={k} gruppenchatOeffnenAktion={gruppenchatOeffnen} />
        ))}
      </div>

      {archivierte.length > 0 && (
        <details className="mt-6 rounded-xl border border-rand bg-flaeche">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-sekundaer">
            Archivierte Chats ({archivierte.length})
          </summary>
          <div className="flex flex-col gap-2 border-t border-rand p-2">
            {archivierte.map((k) => (
              <div key={k.konversationId} className="flex items-center gap-2">
                <Link
                  href={`/chat/${k.konversationId}`}
                  className="min-w-0 flex-1 rounded-xl border border-rand bg-flaeche p-4 text-left transition hover:border-marke-gruen"
                >
                  <KonversationInhalt konversation={k} />
                </Link>
                <form action={konversationArchivieren.bind(null, k.konversationId as string, false)}>
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

      <ZurueckButton />
    </main>
  )
}

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
