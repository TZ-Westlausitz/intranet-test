import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import { PersonErstellenFormular } from "@/components/admin/person-erstellen-formular"
import { PersonBearbeitenDialog } from "@/components/admin/person-bearbeiten-dialog"
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
        gruppen: { include: { gruppe: true } },
        berechtigungen: { include: { berechtigung: true } },
      },
      orderBy: [{ aktiv: "desc" }, { nachname: "asc" }, { vorname: "asc" }],
    }),
    prisma.standort.findMany({ where: { aktiv: true }, orderBy: { name: "asc" } }),
    prisma.abteilung.findMany({ where: { aktiv: true }, orderBy: { name: "asc" } }),
    prisma.gruppe.findMany({ where: { aktiv: true }, orderBy: { name: "asc" } }),
    prisma.berechtigung.findMany({ where: { aktiv: true }, orderBy: { name: "asc" } }),
  ])

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Kopfleiste />
      <h1 className="text-center text-2xl font-semibold text-ueberschrift md:text-left">Benutzer</h1>

      <div className="mt-6">
        <PersonErstellenFormular abteilungen={abteilungen} aktion={personErstellen} />
      </div>

      <ul className="mt-6 flex flex-col divide-y divide-flaeche-100 rounded-xl border border-rand bg-flaeche">
        {personen.map((person) => {
          const zugehoerigkeitenAnzeige = person.zugehoerigkeiten.map((z) => ({
            id: z.id,
            standort: z.standort,
            abteilung: z.abteilung,
          }))
          const gruppenIds = person.gruppen.map((g) => g.gruppeId)
          const berechtigungIds = person.berechtigungen.map((b) => b.berechtigungId)

          return (
            <li key={person.benutzername} className="flex flex-col gap-2 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className={"font-medium " + (person.aktiv ? "text-ueberschrift" : "text-tertiaer")}>
                    {person.vorname} {person.nachname}
                  </span>
                  <span className="ml-2 text-xs text-tertiaer">{person.benutzername}</span>
                  {!person.aktiv && (
                    <span className="ml-2 rounded-full bg-flaeche-100 px-2 py-0.5 text-xs text-sekundaer">
                      deaktiviert
                    </span>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <PersonBearbeitenDialog
                    personId={person.benutzername}
                    name={`${person.vorname} ${person.nachname}`}
                    benutzername={person.benutzername}
                    zugehoerigkeiten={zugehoerigkeitenAnzeige}
                    standorte={standorte}
                    abteilungen={abteilungen}
                    gruppen={gruppen}
                    ausgewaehlteGruppenIds={gruppenIds}
                    berechtigungenListe={berechtigungenListe}
                    ausgewaehlteBerechtigungIds={berechtigungIds}
                    benutzernameAktualisierenAktion={personBenutzernameAktualisieren}
                    zugehoerigkeitHinzufuegenAktion={zugehoerigkeitHinzufuegen}
                    zugehoerigkeitBeendenAktion={zugehoerigkeitBeenden}
                    personGruppenAktualisierenAktion={personGruppenAktualisieren}
                    personBerechtigungenAktualisierenAktion={personBerechtigungenAktualisieren}
                    personPasswortZuruecksetzenAktion={personPasswortZuruecksetzen}
                  />
                  <form action={personAktivSetzen.bind(null, person.benutzername, !person.aktiv)}>
                    <button
                      type="submit"
                      className={
                        "h-9 shrink-0 rounded-lg px-2.5 text-xs font-medium transition " +
                        (person.aktiv
                          ? "text-sekundaer hover:bg-red-50 hover:text-red-600"
                          : "bg-marke-gruen/15 text-marke-gruen-dunkel hover:bg-marke-gruen/25")
                      }
                    >
                      {person.aktiv ? "Deaktivieren" : "Aktivieren"}
                    </button>
                  </form>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 text-xs text-sekundaer">
                {zugehoerigkeitenAnzeige.length === 0 ? (
                  <span className="text-tertiaer">Keine Zugehörigkeit</span>
                ) : (
                  zugehoerigkeitenAnzeige.map((z) => (
                    <span key={z.id} className="rounded-full bg-flaeche-100 px-2 py-0.5">
                      {z.standort ? `${z.standort.name} · ` : ""}
                      {z.abteilung.name}
                    </span>
                  ))
                )}
                {gruppenIds.length > 0 && (
                  <span className="rounded-full bg-flaeche-100 px-2 py-0.5">
                    {gruppenIds.length} Gruppe{gruppenIds.length === 1 ? "" : "n"}
                  </span>
                )}
                {berechtigungIds.length > 0 && (
                  <span className="rounded-full bg-flaeche-100 px-2 py-0.5">
                    {berechtigungIds.length} Berechtigung{berechtigungIds.length === 1 ? "" : "en"}
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <ZurueckButton />
    </main>
  )
}
