import { prisma } from "@/lib/db"

export type Geburtstag = { name: string; tag: number; monat: number }

/**
 * Geburtstage, die diese Person im Kalender sehen darf: ihr eigener und die
 * aller aktiven Personen, die mit ihr mindestens EINE Gruppe teilen. Die
 * automatische Gruppe "Alle" zählt nicht (`automatisch: false`) — in ihr
 * ist jede Person, sonst wären die Geburtstage doch für alle sichtbar.
 * Alle anderen bekommen den Geburtstag gar nicht erst vom Server (nicht nur
 * ausgeblendet). Nur Tag und Monat, kein Jahr.
 */
export async function sichtbareGeburtstage(personId: string): Promise<Geburtstag[]> {
  const personen = await prisma.person.findMany({
    where: {
      aktiv: true,
      geburtstagTag: { not: null },
      geburtstagMonat: { not: null },
      OR: [
        { benutzername: personId },
        {
          gruppen: {
            some: { gruppe: { automatisch: false, mitglieder: { some: { personId } } } },
          },
        },
      ],
    },
    select: { vorname: true, nachname: true, geburtstagTag: true, geburtstagMonat: true },
  })

  return personen.map((p) => ({
    name: `${p.vorname} ${p.nachname}`,
    tag: p.geburtstagTag!,
    monat: p.geburtstagMonat!,
  }))
}

/** Tag/Monat aus dem Profilformular: beide leer = nicht angegeben; ungültig (z. B. 31.04.) → "ungueltig". */
export function geburtstagAusEingabe(
  tagWert: FormDataEntryValue | null,
  monatWert: FormDataEntryValue | null,
): { tag: number; monat: number } | null | "ungueltig" {
  const tagText = String(tagWert ?? "").trim()
  const monatText = String(monatWert ?? "").trim()
  if (!tagText && !monatText) return null
  if (!tagText || !monatText) return "ungueltig"

  const tag = Number(tagText)
  const monat = Number(monatText)
  if (!Number.isInteger(tag) || !Number.isInteger(monat) || monat < 1 || monat > 12 || tag < 1) return "ungueltig"
  // 2024 ist ein Schaltjahr — der 29.02. bleibt erlaubt.
  const probe = new Date(Date.UTC(2024, monat - 1, tag))
  if (probe.getUTCMonth() !== monat - 1 || probe.getUTCDate() !== tag) return "ungueltig"
  return { tag, monat }
}
