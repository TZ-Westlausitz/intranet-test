import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { ZurueckButton } from "@/components/zurueck-button"
import { Hinweis } from "@/components/hinweis"
import { AufgabenVorlageDialog } from "@/components/aufgaben-vorlage-dialog"
import { AufgabenVorlageZeile } from "@/components/aufgaben-vorlage-zeile"
import { alleAufgabenVorlagenFuerVerwaltung } from "@/lib/aufgaben-vorlagen/abfragen"
import {
  aufgabenVorlageErstellen,
  aufgabenVorlageAktualisieren,
  aufgabenVorlageAktivSetzen,
  aufgabenVorlageLoeschen,
} from "@/lib/aufgaben-vorlagen/aktionen"

const FEHLER_TEXTE: Record<string, string> = {
  pflichtfeld: "Bitte einen Titel eingeben.",
  faelligInTagen: "„Fällig in Tagen“ muss leer oder eine Zahl ab 0 sein.",
}

/** Kurze, kommagetrennte Zusammenfassung — Muster benutzerAnzeige in newsfeed/vorlagen/page.tsx. */
function benutzerAnzeige(vorlage: {
  benutzbarPersonen: { person: { vorname: string; nachname: string } }[]
  benutzbarGruppen: { gruppe: { name: string } }[]
  benutzbarAbteilungen: { abteilung: { name: string } }[]
}): string {
  return [
    ...vorlage.benutzbarPersonen.map((b) => `${b.person.vorname} ${b.person.nachname}`),
    ...vorlage.benutzbarGruppen.map((b) => b.gruppe.name),
    ...vorlage.benutzbarAbteilungen.map((b) => b.abteilung.name),
  ].join(", ")
}

/**
 * Nur für Wissensmanager (Rückmeldung 2026-10-01) — erreichbar ausschließlich
 * über den Button auf /aufgaben, keine eigene Navigation. EIN gemeinsamer
 * Vorlagen-Bestand für beide Anlege-Wege (Auftrag zuweisen UND
 * persönliches To-do), siehe Kommentar am Model AufgabenVorlage.
 */
export default async function AufgabenVorlagenSeite({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string }>
}) {
  await berechtigung({ benoetigteBerechtigung: "Wissensmanager" })
  const { fehler } = await searchParams

  const [vorlagen, personen, gruppen, abteilungen] = await Promise.all([
    alleAufgabenVorlagenFuerVerwaltung(),
    prisma.person.findMany({
      where: { aktiv: true },
      orderBy: [{ nachname: "asc" }, { vorname: "asc" }],
      select: { benutzername: true, vorname: true, nachname: true },
    }),
    prisma.gruppe.findMany({ where: { aktiv: true }, orderBy: { name: "asc" } }),
    prisma.abteilung.findMany({ where: { aktiv: true }, orderBy: { name: "asc" } }),
  ])

  const auswahl = {
    personen: personen.map((p) => ({ id: p.benutzername, name: `${p.vorname} ${p.nachname}` })),
    gruppen: gruppen.map((g) => ({ id: g.id, name: g.name })),
    abteilungen: abteilungen.map((a) => ({ id: a.id, name: a.name })),
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-ueberschrift">Aufgaben-Vorlagen</h1>
        <AufgabenVorlageDialog auswahl={auswahl} erstellenAktion={aufgabenVorlageErstellen} />
      </div>

      {fehler && (
        <div className="mt-4">
          <Hinweis>{FEHLER_TEXTE[fehler] ?? "Das hat nicht geklappt."}</Hinweis>
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-xl border border-rand bg-flaeche">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-rand text-xs text-sekundaer uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Titel</th>
              <th className="px-4 py-3 font-medium">Benutzbar für</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {vorlagen.map((vorlage) => (
              <AufgabenVorlageZeile
                key={vorlage.id}
                vorlage={vorlage}
                benutzerText={benutzerAnzeige(vorlage)}
                auswahl={auswahl}
                aktualisierenAktion={aufgabenVorlageAktualisieren}
                aktivSetzenAktion={aufgabenVorlageAktivSetzen}
                loeschenAktion={aufgabenVorlageLoeschen}
              />
            ))}
            {vorlagen.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sekundaer">
                  Noch keine Vorlagen angelegt.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ZurueckButton />
    </main>
  )
}
