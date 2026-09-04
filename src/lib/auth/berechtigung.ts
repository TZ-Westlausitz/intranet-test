import { redirect } from "next/navigation"

import { Rolle } from "@/generated/prisma/enums"

import { auth } from "./auth"
import { prisma } from "@/lib/db"

/**
 * DIE zentrale Rechteprüfung. Regel 5 in der CLAUDE.md.
 *
 * Jede Server Action ruft sie als ERSTE Zeile auf. Sie wirft, statt null
 * zurückzugeben — damit ist es unmöglich, die Prüfung versehentlich zu
 * ignorieren. Ein vergessenes `if` fällt sonst niemandem auf.
 *
 *   export async function ausleiheAnlegen(daten: FormData) {
 *     const kontext = await berechtigung([Rolle.WERKSTATTLEITER])
 *     ...
 *   }
 *
 * Warum hier eine Datenbankabfrage steht und nicht nur ein Blick ins Token:
 * Auth.js kann beim Credentials-Provider keine Datenbank-Sessions führen.
 * Ein deaktiviertes Konto behält sein gültiges Token bis zum Ablauf. Diese
 * Abfrage ist der Ersatz dafür — sie nicht wegzuoptimieren ist wichtiger
 * als die eingesparte Millisekunde.
 *
 * Erzwungener Passwortwechsel läuft über dieselbe Funktion statt über eine
 * zweite Prüfstelle (Regel 5): ist `passwortWechselErforderlich` gesetzt,
 * leitet sie auf /passwort-aendern um — jede Seite und jede Server Action
 * ist damit automatisch gesperrt, bis das erledigt ist. Die
 * Passwort-Ändern-Seite selbst braucht ihren eigenen Kontext aber, ohne
 * sofort wieder auf sich selbst umgeleitet zu werden — dafür
 * `optionen.erlaubeVorPasswortwechsel`.
 *
 * Zwei verschiedene Arten von "geht nicht", zwei verschiedene Reaktionen:
 * Fehlt eine gültige, aktive Person hinter dem Token (nicht angemeldet,
 * abgelaufener/ungültiger Token, deaktiviertes Konto), ist das ein
 * Authentifizierungs-Problem — Umleitung zu /anmelden, denselben Weg wie
 * jeder andere abgemeldete Aufruf. Ist die Person zwar gültig angemeldet,
 * hat aber nicht die geforderte Rolle, ist das ein echtes
 * Berechtigungs-Problem — dafür bleibt `NichtBerechtigt` ein lauter Fehler
 * (Regel 5: ein ausgeblendeter Knopf ist keine Zugriffskontrolle, ein
 * stillschweigendes Umleiten wäre hier dasselbe Versäumnis).
 *
 * `optionen.benoetigteBerechtigung` prüft zusätzlich eine benannte
 * PersonBerechtigung (z. B. "Projektmanager" für das Anlegen eines
 * Projekts) — genau wie ein fehlendes `erforderlich`-Rolle ein lauter
 * Fehler, kein stilles Umleiten. Das ist bewusst NICHT der große,
 * zurückgestellte Umbau "Berechtigung ersetzt Rolle überall" (siehe Memory
 * adminbereich-rechteverwaltung) — nur eine gezielte, additive Fähigkeit
 * dieser einen zentralen Funktion, für den einen Fall, der sie jetzt
 * braucht. Pro-Datensatz-Sichtbarkeit (z. B. "ist Mitglied dieses
 * Projekts") ist weiterhin NICHT Teil von `berechtigung()` — das läuft wie
 * bei Auftrag/Termin über einen eigenen, lokalen Helfer pro Baustein
 * (siehe src/lib/projekte/mitgliedschaft.ts).
 */

export class NichtBerechtigt extends Error {
  constructor(grund: string) {
    super(grund)
    this.name = "NichtBerechtigt"
  }
}

export type Kontext = {
  personId: string
  benutzername: string
  name: string
  rollen: Rolle[]
  standortIds: string[]
  berechtigungen: string[]
}

export async function berechtigung(
  erforderlich?: Rolle[],
  optionen?: { erlaubeVorPasswortwechsel?: boolean; benoetigteBerechtigung?: string },
): Promise<Kontext> {
  const session = await auth()
  const personId = session?.user?.id

  if (!personId) {
    redirect("/anmelden")
  }

  const jetzt = new Date()

  const person = await prisma.person.findUnique({
    where: { benutzername: personId },
    include: {
      zugehoerigkeiten: {
        where: {
          OR: [{ bisDatum: null }, { bisDatum: { gt: jetzt } }],
        },
      },
      berechtigungen: {
        where: { berechtigung: { aktiv: true } },
        include: { berechtigung: true },
      },
    },
  })

  // Konto gelöscht, deaktiviert oder ausgeschieden, oder der Token zeigt auf
  // eine ID, die es nicht mehr gibt (z. B. nach einer Migration, die den
  // Primärschlüssel von Person geändert hat) — in allen drei Fällen ist die
  // Sitzung nicht mehr gültig, kein Berechtigungsproblem der angemeldeten
  // Person. Einfach neu anmelden lassen, statt die Seite abstürzen zu
  // lassen.
  if (!person || !person.aktiv) {
    redirect("/anmelden")
  }

  if (person.passwortWechselErforderlich && !optionen?.erlaubeVorPasswortwechsel) {
    redirect("/passwort-aendern")
  }

  const rollen = [...new Set(person.zugehoerigkeiten.map((z) => z.rolle))]
  const standortIds = [
    ...new Set(person.zugehoerigkeiten.map((z) => z.standortId).filter((id): id is string => id !== null)),
  ]
  const berechtigungen = [...new Set(person.berechtigungen.map((b) => b.berechtigung.name))]

  if (erforderlich?.length && !erforderlich.some((r) => rollen.includes(r))) {
    throw new NichtBerechtigt("fehlende Rolle")
  }

  if (optionen?.benoetigteBerechtigung && !berechtigungen.includes(optionen.benoetigteBerechtigung)) {
    throw new NichtBerechtigt("fehlende Berechtigung")
  }

  return {
    personId: person.benutzername,
    benutzername: person.benutzername,
    name: `${person.vorname} ${person.nachname}`,
    rollen,
    standortIds,
    berechtigungen,
  }
}

/**
 * True für Next.js' eigenen redirect()-Signalwert, aber NUR für die
 * Umleitung nach /passwort-aendern — gezielt am Ziel im digest erkannt,
 * nicht an "irgendein redirect". `kontextOderNull()` läuft auch auf
 * /anmelden selbst; würde sie JEDES Redirect-Signal durchlassen, würde die
 * neue Umleitung dorthin (siehe berechtigung()) sich dort selbst wieder
 * auslösen — Endlosschleife. Nur die erzwungene Passwortwechsel-Umleitung
 * muss durch diese Funktion hindurch nach außen dringen, jede andere
 * (z. B. "Sitzung ungültig" → /anmelden) ist für kontextOderNull einfach
 * "kein Kontext", genau wie jeder andere abgemeldete Aufruf.
 */
function istPasswortWechselWeiterleitung(wert: unknown): boolean {
  return (
    typeof wert === "object" &&
    wert !== null &&
    "digest" in wert &&
    typeof (wert as { digest: unknown }).digest === "string" &&
    (wert as { digest: string }).digest.startsWith("NEXT_REDIRECT") &&
    (wert as { digest: string }).digest.includes("/passwort-aendern")
  )
}

/**
 * Nur für Anzeigezwecke — etwa um einen Menüpunkt auszublenden.
 * KEIN Ersatz für `berechtigung()` in einer Server Action: ein
 * ausgeblendeter Knopf ist keine Zugriffskontrolle.
 *
 * Läuft mit `erlaubeVorPasswortwechsel: true`: Das Root-Layout ruft diese
 * Funktion auf JEDER Seite auf, auch auf /passwort-aendern und /anmelden
 * selbst — ohne die Ausnahme würde sie dort ihre eigene Umleitung wieder
 * auslösen (Endlosschleife aus 307ern). Die eigentliche Sperre bleibt
 * trotzdem scharf: jede geschützte Seite/Aktion ruft `berechtigung([...])`
 * direkt auf, ohne diese Ausnahme.
 */
export async function kontextOderNull(): Promise<Kontext | null> {
  try {
    return await berechtigung(undefined, { erlaubeVorPasswortwechsel: true })
  } catch (fehler) {
    // Nur die Passwortwechsel-Umleitung muss Next.js selbst zu sehen
    // bekommen, sonst bleibt sie hier hängen und die Seite zeigt einfach
    // "abgemeldet". Jede andere Umleitung (z. B. "Sitzung ungültig" nach
    // /anmelden) und jeder sonstige Fehler bedeutet für diese Funktion
    // schlicht: kein Kontext.
    if (istPasswortWechselWeiterleitung(fehler)) {
      throw fehler
    }
    return null
  }
}
