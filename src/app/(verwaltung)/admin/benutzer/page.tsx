import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import { PersonErstellenFormular } from "@/components/admin/person-erstellen-formular"
import { BenutzerListe } from "@/components/admin/benutzer-liste"
import {
  personErstellen,
  personAktivSetzen,
  personPasswortZuruecksetzen,
  personBenutzernameAktualisieren,
  zugehoerigkeitHinzufuegen,
  zugehoerigkeitBeenden,
  personGruppenAktualisieren,
  personBerechtigungenAktualisieren,
} from "@/lib/admin/personen-aktionen"

/**
 * Zentrale Benutzerverwaltung: Zugänge anlegen, Zugehörigkeiten (Standort ×
 * Abteilung), Gruppen und Berechtigungen zuweisen, Passwörter
 * zurücksetzen. Anders als das Altsystem (app.ueberblick.io, siehe PDF-
 * Vorlage) gibt es hier KEIN Löschen — Regel 4: Person wird nie gelöscht,
 * nur deaktiviert.
 *
 * Suche + Abteilungs-/Gruppenfilter (Rückmeldung 2026-09-23) stecken in
 * der Client-Komponente BenutzerListe — diese Seite lädt weiterhin alles
 * auf einmal (Adminbereich, keine große Belegschaft) und bereitet pro
 * Person nur die schlanken Felder auf, die die Liste zum Filtern und
 * Anzeigen braucht.
 */
export default async function BenutzerSeite() {
  await berechtigung({ benoetigteBerechtigung: "Adminbereich" })
  const jetzt = new Date()

  const [personen, standorte, abteilungen, gruppen, berechtigungenListe] = await Promise.all([
    prisma.person.findMany({
      include: {
        zugehoerigkeiten: {
          where: { OR: [{ bisDatum: null }, { bisDatum: { gt: jetzt } }] },
          include: { standort: true, abteilung: true },
        },
        // automatisch: false blendet die Mitgliedschaft in der Sonder-
        // Gruppe "Alle" aus (siehe Kommentar am Model Gruppe) — die hätte
        // sonst jede Person in Zählung/Checkbox-Liste als "+1 Gruppe"
        // gezeigt, obwohl niemand sie zugewiesen hat.
        gruppen: { where: { gruppe: { automatisch: false } }, include: { gruppe: true } },
        berechtigungen: { include: { berechtigung: true } },
      },
      orderBy: [{ aktiv: "desc" }, { nachname: "asc" }, { vorname: "asc" }],
    }),
    prisma.standort.findMany({ where: { aktiv: true }, orderBy: { name: "asc" } }),
    prisma.abteilung.findMany({ where: { aktiv: true }, orderBy: { name: "asc" } }),
    prisma.gruppe.findMany({ where: { aktiv: true, automatisch: false }, orderBy: { name: "asc" } }),
    prisma.berechtigung.findMany({ where: { aktiv: true }, orderBy: { name: "asc" } }),
  ])

  const personenZeilen = personen.map((person) => ({
    benutzername: person.benutzername,
    vorname: person.vorname,
    nachname: person.nachname,
    aktiv: person.aktiv,
    zugehoerigkeiten: person.zugehoerigkeiten.map((z) => ({
      id: z.id,
      standort: z.standort,
      abteilung: z.abteilung,
    })),
    abteilungIds: person.zugehoerigkeiten.map((z) => z.abteilungId),
    gruppenIds: person.gruppen.map((g) => g.gruppeId),
    berechtigungIds: person.berechtigungen.map((b) => b.berechtigungId),
  }))

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Kopfleiste />
      <h1 className="text-center text-2xl font-semibold text-ueberschrift md:text-left">Benutzer</h1>

      <div className="mt-6">
        <PersonErstellenFormular abteilungen={abteilungen} aktion={personErstellen} />
      </div>

      <BenutzerListe
        personen={personenZeilen}
        abteilungen={abteilungen}
        gruppen={gruppen}
        standorte={standorte}
        berechtigungenListe={berechtigungenListe}
        benutzernameAktualisierenAktion={personBenutzernameAktualisieren}
        zugehoerigkeitHinzufuegenAktion={zugehoerigkeitHinzufuegen}
        zugehoerigkeitBeendenAktion={zugehoerigkeitBeenden}
        personGruppenAktualisierenAktion={personGruppenAktualisieren}
        personBerechtigungenAktualisierenAktion={personBerechtigungenAktualisieren}
        personPasswortZuruecksetzenAktion={personPasswortZuruecksetzen}
        personAktivSetzenAktion={personAktivSetzen}
      />

      <ZurueckButton />
    </main>
  )
}
