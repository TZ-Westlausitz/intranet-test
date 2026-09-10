import { prisma } from "@/lib/db"
import { chatSichtbarFuer, direktSchluesselBilden } from "@/lib/chat/sichtbarkeit"

type ChatKontext = { personId: string }

const NACHRICHTEN_VORSCHAU_INCLUDE = {
  orderBy: { erstelltAm: "desc" as const },
  take: 1,
  include: { absender: { select: { vorname: true, nachname: true } }, _count: { select: { anhaenge: true } } },
}

/** Vorschautext für die Konversationsliste — Anhänge ohne Bildunterschrift bekommen einen Platzhalter statt leer zu bleiben. */
function vorschauText(nachricht: { text: string | null; _count: { anhaenge: number } }): string {
  if (nachricht.text) return nachricht.text
  return nachricht._count.anhaenge === 1 ? "📎 Anhang" : `📎 ${nachricht._count.anhaenge} Anhänge`
}

/**
 * Konversationsübersicht — bestehende Konversationen (Direktnachrichten +
 * bereits einmal geöffnete Gruppenchats) PLUS die eigenen Gruppen, die
 * noch KEINEN Gruppenchat haben (`konversationId: null` — der Chat wird
 * erst beim ersten Öffnen über `gruppenchatOeffnen` angelegt, siehe
 * aktionen.ts; sonst gäbe es für jede Gruppe im Voraus eine leere Zeile).
 * Sortiert nach letzter Aktivität, neueste zuerst.
 */
export async function meineKonversationen(kontext: ChatKontext) {
  const [konversationen, eigeneGruppen] = await Promise.all([
    prisma.chatKonversation.findMany({
      where: chatSichtbarFuer(kontext.personId),
      include: {
        gruppe: { select: { id: true, name: true } },
        teilnehmer: { select: { person: { select: { benutzername: true, vorname: true, nachname: true } } } },
        nachrichten: NACHRICHTEN_VORSCHAU_INCLUDE,
        gelesen: { where: { personId: kontext.personId }, select: { zuletztGelesenAm: true } },
      },
    }),
    prisma.gruppe.findMany({
      where: { aktiv: true, mitglieder: { some: { personId: kontext.personId } } },
      select: { id: true, name: true },
    }),
  ])

  const gruppenMitChat = new Set(konversationen.map((k) => k.gruppeId).filter(Boolean))

  const bestehende = konversationen.map((k) => {
    const letzteNachricht = k.nachrichten[0] ?? null
    const zuletztGelesenAm = k.gelesen[0]?.zuletztGelesenAm ?? null
    const anderer = k.teilnehmer.map((t) => t.person).find((p) => p.benutzername !== kontext.personId)
    return {
      konversationId: k.id as string | null,
      gruppeId: k.gruppeId,
      titel: k.titel ?? (k.gruppe ? k.gruppe.name : anderer ? `${anderer.vorname} ${anderer.nachname}` : "Direktnachricht"),
      istGruppe: k.gruppe !== null || k.titel !== null,
      letzteNachricht: letzteNachricht
        ? { text: vorschauText(letzteNachricht), von: letzteNachricht.absender.vorname, erstelltAm: letzteNachricht.erstelltAm }
        : null,
      ungelesen: letzteNachricht !== null && (!zuletztGelesenAm || letzteNachricht.erstelltAm > zuletztGelesenAm),
      sortDatum: letzteNachricht?.erstelltAm ?? k.erstelltAm,
    }
  })

  const nochNichtBegonnen = eigeneGruppen
    .filter((g) => !gruppenMitChat.has(g.id))
    .map((g) => ({
      konversationId: null,
      gruppeId: g.id,
      titel: g.name,
      istGruppe: true,
      letzteNachricht: null,
      ungelesen: false,
      sortDatum: new Date(0),
    }))

  return [...bestehende, ...nochNichtBegonnen].sort((a, b) => b.sortDatum.getTime() - a.sortDatum.getTime())
}

/** Für die Konversationsansicht — `null`, wenn nicht sichtbar (Aufrufer antwortet dann mit 404, Muster Formular/Info). */
export async function konversationMitZugriff(konversationId: string, kontext: ChatKontext) {
  return prisma.chatKonversation.findFirst({
    where: { id: konversationId, ...chatSichtbarFuer(kontext.personId) },
    include: { gruppe: { select: { name: true } }, teilnehmer: { select: { person: { select: { benutzername: true, vorname: true, nachname: true } } } } },
  })
}

/** Nachrichten einer Konversation, optional nur die seit `seit` (für Polling) — chronologisch aufsteigend. */
export async function konversationNachrichten(konversationId: string, seit?: Date) {
  return prisma.chatNachricht.findMany({
    where: { konversationId, ...(seit ? { erstelltAm: { gt: seit } } : {}) },
    orderBy: { erstelltAm: "asc" },
    include: {
      absender: { select: { benutzername: true, vorname: true, nachname: true } },
      anhaenge: { select: { id: true, dateiname: true, mimetyp: true, groesseBytes: true } },
    },
  })
}

/** Existierende Direktnachricht zwischen zwei Personen, falls vorhanden. */
export async function direktkonversationOderNull(personId1: string, personId2: string) {
  return prisma.chatKonversation.findUnique({
    where: { direktSchluessel: direktSchluesselBilden(personId1, personId2) },
  })
}
