import Link from "next/link"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import { ChatNeueNachrichtDialog } from "@/components/chat-neue-nachricht-dialog"
import { ChatNeueGruppeDialog } from "@/components/chat-neue-gruppe-dialog"
import { meineKonversationen } from "@/lib/chat/abfragen"
import { direktkonversationOeffnen, gruppenchatOeffnen, gruppenchatErstellen } from "@/lib/chat/aktionen"
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
export default async function ChatUebersichtSeite() {
  const kontext = await berechtigung()
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

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Kopfleiste name={kontext.name} />
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-ueberschrift">Chat</h1>
        <div className="flex gap-2">
          <ChatNeueGruppeDialog personen={personenOptionen} gruppen={gruppenOptionen} erstellenAktion={gruppenchatErstellen} />
          <ChatNeueNachrichtDialog personen={personenOptionen} oeffnenAktion={direktkonversationOeffnen} />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {konversationen.length === 0 && <p className="text-sm text-sekundaer">Noch keine Konversationen.</p>}

        {konversationen.map((k) => {
          const inhalt = (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-ueberschrift">
                  {k.istGruppe && "👥 "}
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

          const klasse =
            "flex flex-col gap-0.5 rounded-xl border bg-flaeche p-4 text-left transition hover:border-marke-gruen " +
            (k.ungelesen ? "border-marke-gruen bg-marke-gruen/5" : "border-rand")

          return k.konversationId ? (
            <Link key={k.konversationId} href={`/chat/${k.konversationId}`} className={klasse}>
              {inhalt}
            </Link>
          ) : (
            <form key={k.gruppeId} action={gruppenchatOeffnen.bind(null, k.gruppeId as string)}>
              <button type="submit" className={klasse + " w-full"}>
                {inhalt}
              </button>
            </form>
          )
        })}
      </div>

      <ZurueckButton />
    </main>
  )
}
