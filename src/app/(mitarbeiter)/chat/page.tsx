import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { ZurueckButton } from "@/components/zurueck-button"
import { ChatNeueNachrichtDialog } from "@/components/chat-neue-nachricht-dialog"
import { ChatNeueGruppeDialog } from "@/components/chat-neue-gruppe-dialog"
import { ChatKonversationenListe } from "@/components/chat-konversationen-liste"
import { meineKonversationen } from "@/lib/chat/abfragen"
import { direktkonversationOeffnen, gruppenchatOeffnen, gruppenchatErstellen, konversationArchivieren } from "@/lib/chat/aktionen"

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
 *
 * Suche (Rückmeldung 2026-10-01, Lupensymbol im Suchfeld) + die eigentliche
 * Listendarstellung stecken in ChatKonversationenListe (Client Component,
 * siehe dort) — diese Seite lädt nur die Daten und reicht sie durch.
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

      <ChatKonversationenListe
        aktive={aktive}
        archivierte={archivierte}
        gruppenchatOeffnenAktion={gruppenchatOeffnen}
        konversationArchivierenAktion={konversationArchivieren}
      />

      <ZurueckButton />
    </main>
  )
}
