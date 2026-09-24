import { notFound } from "next/navigation"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import { ChatKonversationAnsicht } from "@/components/chat-konversation-ansicht"
import { ChatKonversationMenuDialog } from "@/components/chat-konversation-menu-dialog"
import {
  konversationMitZugriff,
  konversationNachrichten,
  konversationTeilnehmerUndGelesenStand,
  eigeneKonversationEinstellungen,
} from "@/lib/chat/abfragen"
import {
  nachrichtSenden,
  konversationNachrichtenLaden,
  konversationAlsGelesenMarkieren,
  gruppeMitgliedHinzufuegen,
  gruppeMitgliedEntfernen,
  gruppeAdminMachen,
  konversationStummSchalten,
  konversationArchivieren,
  gruppeVerlassen,
} from "@/lib/chat/aktionen"

export default async function ChatKonversationSeite({ params }: { params: Promise<{ konversationId: string }> }) {
  const kontext = await berechtigung()
  const { konversationId } = await params

  const konversation = await konversationMitZugriff(konversationId, kontext)
  if (!konversation) notFound()

  const [nachrichten, { teilnehmerIds, gelesenStand }, eigeneEinstellungen] = await Promise.all([
    konversationNachrichten(konversationId),
    konversationTeilnehmerUndGelesenStand(konversation),
    eigeneKonversationEinstellungen(konversationId, kontext.personId),
  ])
  const anderer = konversation.teilnehmer.map((t) => t.person).find((p) => p.benutzername !== kontext.personId)
  const istGruppe = konversation.gruppe !== null || konversation.titel !== null
  const titel = konversation.titel ?? (konversation.gruppe ? konversation.gruppe.name : anderer ? `${anderer.vorname} ${anderer.nachname}` : "Direktnachricht")

  // Gruppenmenü ("anklicken des Namens", Rückmeldung 2026-09-24) gibt es
  // für JEDE Konversation — auch Direktnachricht und automatischer
  // Gruppenchat bekommen Stummschalten/Archivieren. Mitgliederverwaltung
  // und "Chat verlassen" bleiben aber nur beim automatischen Gruppenchat
  // bzw. bei einer frei angelegten Gruppe sinnvoll unterschiedlich
  // eingeschränkt, siehe ChatKonversationMenuDialog.
  const istEigeneGruppe = konversation.gruppe === null && konversation.titel !== null
  const eigenesMitglied = konversation.teilnehmer.find((t) => t.person.benutzername === kontext.personId)
  const binGruppenAdmin = istEigeneGruppe && (eigenesMitglied?.istGruppenAdmin ?? false)

  const letzteNachricht = nachrichten.at(-1) ?? null
  const istArchiviert =
    eigeneEinstellungen.archiviertAm !== null &&
    (!letzteNachricht || letzteNachricht.erstelltAm <= eigeneEinstellungen.archiviertAm)

  const [kandidaten, automatischeMitglieder] = await Promise.all([
    istEigeneGruppe
      ? prisma.person
          .findMany({
            where: { aktiv: true, benutzername: { notIn: konversation.teilnehmer.map((t) => t.person.benutzername) } },
            orderBy: [{ nachname: "asc" }, { vorname: "asc" }],
            select: { benutzername: true, vorname: true, nachname: true },
          })
          .then((personen) => personen.map((p) => ({ id: p.benutzername, name: `${p.vorname} ${p.nachname}` })))
      : Promise.resolve([]),
    konversation.gruppe !== null
      ? prisma.personGruppe
          .findMany({
            where: { gruppeId: konversation.gruppeId! },
            include: { person: { select: { benutzername: true, vorname: true, nachname: true } } },
            orderBy: [{ person: { nachname: "asc" } }, { person: { vorname: "asc" } }],
          })
          .then((zeilen) =>
            zeilen.map((z) => ({ personId: z.person.benutzername, name: `${z.person.vorname} ${z.person.nachname}`, istAdmin: false })),
          )
      : Promise.resolve([]),
  ])

  const mitglieder = istEigeneGruppe
    ? konversation.teilnehmer.map((t) => ({
        personId: t.person.benutzername,
        name: `${t.person.vorname} ${t.person.nachname}`,
        istAdmin: t.istGruppenAdmin,
      }))
    : automatischeMitglieder

  return (
    <main className="mx-auto flex h-[calc(100vh-2.5rem)] max-w-2xl flex-col px-5 py-10">
      <Kopfleiste />
      <ChatKonversationMenuDialog
        titel={titel}
        konversationId={konversationId}
        istGruppe={istGruppe}
        mitglieder={mitglieder}
        kandidaten={kandidaten}
        binAdmin={binGruppenAdmin}
        kannVerlassen={istEigeneGruppe}
        stumm={eigeneEinstellungen.stumm}
        istArchiviert={istArchiviert}
        hinzufuegenAktion={gruppeMitgliedHinzufuegen}
        entfernenAktion={gruppeMitgliedEntfernen}
        adminMachenAktion={gruppeAdminMachen}
        stummSchaltenAktion={konversationStummSchalten}
        archivierenAktion={konversationArchivieren}
        verlassenAktion={gruppeVerlassen}
      />

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
