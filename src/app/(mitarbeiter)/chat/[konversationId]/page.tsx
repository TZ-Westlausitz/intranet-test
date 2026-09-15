import { notFound } from "next/navigation"

import { berechtigung } from "@/lib/auth/berechtigung"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import { ChatKonversationAnsicht } from "@/components/chat-konversation-ansicht"
import { konversationMitZugriff, konversationNachrichten, konversationTeilnehmerUndGelesenStand } from "@/lib/chat/abfragen"
import { nachrichtSenden, konversationNachrichtenLaden, konversationAlsGelesenMarkieren } from "@/lib/chat/aktionen"

export default async function ChatKonversationSeite({ params }: { params: Promise<{ konversationId: string }> }) {
  const kontext = await berechtigung()
  const { konversationId } = await params

  const konversation = await konversationMitZugriff(konversationId, kontext)
  if (!konversation) notFound()

  const [nachrichten, { teilnehmerIds, gelesenStand }] = await Promise.all([
    konversationNachrichten(konversationId),
    konversationTeilnehmerUndGelesenStand(konversation),
  ])
  const anderer = konversation.teilnehmer.map((t) => t.person).find((p) => p.benutzername !== kontext.personId)
  const istGruppe = konversation.gruppe !== null || konversation.titel !== null
  const titel = konversation.titel ?? (konversation.gruppe ? konversation.gruppe.name : anderer ? `${anderer.vorname} ${anderer.nachname}` : "Direktnachricht")

  return (
    <main className="mx-auto flex h-[calc(100vh-2.5rem)] max-w-2xl flex-col px-5 py-10">
      <Kopfleiste name={kontext.name} />
      <h1 className="flex items-center gap-2 text-2xl font-semibold text-ueberschrift">
        {istGruppe && "👥 "}
        {titel}
      </h1>

      <ChatKonversationAnsicht
        konversationId={konversationId}
        eigenePersonId={kontext.personId}
        anfangsNachrichten={nachrichten}
        anfangsTeilnehmerIds={teilnehmerIds}
        anfangsGelesenStand={gelesenStand}
        nachrichtenLadenAktion={konversationNachrichtenLaden}
        sendenAktion={nachrichtSenden}
        alsGelesenMarkierenAktion={konversationAlsGelesenMarkieren}
      />

      <ZurueckButton />
    </main>
  )
}
