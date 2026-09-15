import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import { Hinweis } from "@/components/hinweis"
import { FormularErstellenDialog } from "@/components/formular-erstellen-dialog"
import { FormularZeile } from "@/components/formular-zeile"
import { alleVorlagenFuerVerwaltung } from "@/lib/formulare/abfragen"
import {
  vorlageErstellen,
  vorlageAlsEntwurfSpeichern,
  vorlageZumBearbeitenLaden,
  vorlageAktualisieren,
  vorlageAktivSetzen,
  vorlageDuplizieren,
  vorlageLoeschen,
} from "@/lib/formulare/aktionen"

const FEHLER_TEXTE: Record<string, string> = {
  keinEmpfaengerAktivierung:
    "Diese Vorlage hat noch keinen Empfänger — bitte erst mindestens eine Person, Gruppe oder Abteilung eintragen, dann aktivieren.",
  entwurfAktivierung: "Dies ist noch ein Entwurf — bitte zuerst vervollständigen und normal speichern, dann aktivieren.",
  pflichtfeld: "Bitte einen Titel eingeben.",
  keinEmpfaenger: "Bitte mindestens eine Person, Gruppe oder Abteilung als Empfänger wählen.",
  keineZielgruppe: "Bitte mindestens eine Person, Gruppe oder Abteilung bei „Benutzbar für“ wählen.",
  keineElemente: "Bitte mindestens ein Element hinzufügen.",
  elemente: "Ein Element ist unvollständig — bitte alle Beschriftungen und Optionen prüfen.",
}

/** Kurze, kommagetrennte Zusammenfassung — "Benutzbar für" kann mehrere Personen/Gruppen/Abteilungen gleichzeitig umfassen. */
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
 * Nur für Wissensmanager — Tabelle statt Kachel-Raster (Vorbild:
 * Altsystem-Screenshot vom 2026-09-09), weil es hier potenziell viele
 * Formulare gibt, die man vergleichen/durchsuchen will. Aktionen (inkl.
 * Löschen) sitzen im Drei-Punkte-Menü pro Zeile (FormularAktionenMenu,
 * Rückmeldung 2026-09-09) statt einzeln als Links — Löschen dort aber nur
 * anklickbar, solange die Vorlage noch keine Einreichungen hat (siehe
 * vorlageLoeschen), sonst grau/deaktiviert. Die Einreichungs-ANZAHL selbst
 * wird NICHT mehr als eigene Spalte angezeigt (Rückmeldung 2026-09-09: "hat
 * für mich keinen Sinn") — nur noch intern für genau diese Lösch-Sperre
 * verwendet.
 *
 * "+ Formular" UND Bearbeiten (Titel-Klick ODER Menü-Eintrag, siehe
 * FormularZeile) sind Pop-Ups direkt hier auf der Seite (Rückmeldung
 * 2026-09-09: vorher zwei eigene Seiten `/formulare/erstellen` und
 * `/formulare/[id]/bearbeiten`) — deshalb lädt diese Seite jetzt auch
 * Personen/Gruppen/Abteilungen/Orte, die vorher dort geladen wurden.
 * Bearbeiten lädt seine vollen Elemente-Daten erst beim Öffnen nach
 * (siehe FormularBearbeitenDialog), nicht eager für jede Zeile.
 */
export default async function FormulareVerwaltenSeite({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string }>
}) {
  const kontext = await berechtigung(undefined, { benoetigteBerechtigung: "Wissensmanager" })
  const { fehler } = await searchParams
  const [vorlagen, personen, gruppen, abteilungen, orte] = await Promise.all([
    alleVorlagenFuerVerwaltung(kontext.personId),
    prisma.person.findMany({
      where: { aktiv: true },
      orderBy: [{ nachname: "asc" }, { vorname: "asc" }],
      select: { benutzername: true, vorname: true, nachname: true },
    }),
    prisma.gruppe.findMany({ where: { aktiv: true }, orderBy: { name: "asc" } }),
    prisma.abteilung.findMany({ where: { aktiv: true }, orderBy: { name: "asc" } }),
    prisma.ort.findMany({ where: { aktiv: true }, orderBy: { name: "asc" } }),
  ])
  const personenOptionen = personen.map((p) => ({ id: p.benutzername, name: `${p.vorname} ${p.nachname}` }))
  const gruppenOptionen = gruppen.map((g) => ({ id: g.id, name: g.name }))

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <Kopfleiste />
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-ueberschrift">Formulare verwalten</h1>
        <FormularErstellenDialog
          personen={personenOptionen}
          gruppen={gruppenOptionen}
          abteilungen={abteilungen}
          orte={orte}
          erstellenAktion={vorlageErstellen}
          entwurfSpeichernAktion={vorlageAlsEntwurfSpeichern}
        />
      </div>

      {fehler && <div className="mt-4"><Hinweis>{FEHLER_TEXTE[fehler] ?? "Das hat nicht geklappt."}</Hinweis></div>}

      <div className="mt-6 overflow-x-auto rounded-xl border border-rand bg-flaeche">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-rand text-xs text-sekundaer uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Titel</th>
              <th className="px-4 py-3 font-medium">Benutzer</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {vorlagen.map((vorlage) => (
              <FormularZeile
                key={vorlage.id}
                vorlage={vorlage}
                benutzerText={benutzerAnzeige(vorlage)}
                personen={personenOptionen}
                gruppen={gruppenOptionen}
                abteilungen={abteilungen}
                orte={orte}
                ladenAktion={vorlageZumBearbeitenLaden}
                aktualisierenAktion={vorlageAktualisieren}
                aktivSetzenAktion={vorlageAktivSetzen}
                duplizierenAktion={vorlageDuplizieren}
                loeschenAktion={vorlageLoeschen}
              />
            ))}
            {vorlagen.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sekundaer">
                  Noch keine Formulare angelegt.
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
