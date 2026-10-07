import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { ZurueckButton } from "@/components/zurueck-button"
import { Hinweis } from "@/components/hinweis"
import { InfoVorlageDialog } from "@/components/info-vorlage-dialog"
import { InfoVorlageZeile } from "@/components/info-vorlage-zeile"
import { wissenVerweiseFuer } from "@/lib/wissen/abfragen"
import { alleInfoVorlagenFuerVerwaltung } from "@/lib/infos/vorlagen-abfragen"
import { infoVorlageErstellen, infoVorlageAktualisieren, infoVorlageAktivSetzen, infoVorlageLoeschen } from "@/lib/infos/vorlagen-aktionen"

const FEHLER_TEXTE: Record<string, string> = {
  pflichtfeld: "Bitte einen Titel eingeben.",
}

/** Kurze, kommagetrennte Zusammenfassung — Muster benutzerAnzeige in formulare/verwalten/page.tsx. */
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
 * über den Button auf /newsfeed, keine eigene Navigation, genau wie
 * /formulare/verwalten. Tabelle statt Kachel-Raster (Muster dort),
 * deutlich schlanker: kein Entwurf-Status, keine Duplizieren-Funktion,
 * Löschen ist immer möglich (eine Vorlage hat keine Einreichungen, die das
 * sperren könnten).
 */
export default async function InfoVorlagenSeite({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string }>
}) {
  const kontext = await berechtigung({ benoetigteBerechtigung: "Wissensmanager" })
  const { fehler } = await searchParams

  const [vorlagen, personen, gruppen, abteilungen, kategorien, wissen] = await Promise.all([
    alleInfoVorlagenFuerVerwaltung(),
    prisma.person.findMany({
      where: { aktiv: true },
      orderBy: [{ nachname: "asc" }, { vorname: "asc" }],
      select: { benutzername: true, vorname: true, nachname: true },
    }),
    prisma.gruppe.findMany({ where: { aktiv: true }, orderBy: { name: "asc" } }),
    prisma.abteilung.findMany({ where: { aktiv: true }, orderBy: { name: "asc" } }),
    prisma.infoKategorie.findMany({ where: { aktiv: true }, orderBy: { name: "asc" } }),
    wissenVerweiseFuer(kontext.personId),
  ])

  const auswahl = {
    personen: personen.map((p) => ({ id: p.benutzername, name: `${p.vorname} ${p.nachname}` })),
    gruppen: gruppen.map((g) => ({ id: g.id, name: g.name })),
    abteilungen: abteilungen.map((a) => ({ id: a.id, name: a.name })),
    kategorien: kategorien.map((k) => ({ id: k.id, name: k.name })),
    wissen,
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-ueberschrift">Info-Vorlagen</h1>
        <InfoVorlageDialog auswahl={auswahl} erstellenAktion={infoVorlageErstellen} />
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
              <InfoVorlageZeile
                key={vorlage.id}
                vorlage={vorlage}
                benutzerText={benutzerAnzeige(vorlage)}
                auswahl={auswahl}
                aktualisierenAktion={infoVorlageAktualisieren}
                aktivSetzenAktion={infoVorlageAktivSetzen}
                loeschenAktion={infoVorlageLoeschen}
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
