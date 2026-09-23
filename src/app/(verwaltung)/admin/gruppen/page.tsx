import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import { gruppeErstellen, gruppeUmbenennen, gruppeAktivSetzen } from "@/lib/admin/gruppen-aktionen"
import { abteilungErstellen, abteilungUmbenennen, abteilungAktivSetzen } from "@/lib/admin/abteilungen-aktionen"

/**
 * Gruppen UND Abteilungen in einem Fenster — entspricht der "Gruppen &
 * Abteilungen"-Kachel im Adminbereich, die beide zusammen anspricht (siehe
 * auch die geplante "Orte & Kategorien"-Kachel, die später genauso beide
 * Themen in einer Ansicht zeigen soll).
 *
 * Gruppen sind eine freie Mehrfachzuordnung unabhängig von Abteilung,
 * Standort und Rolle (siehe Model Gruppe) — z. B. Berufsgruppen oder
 * funktionale Teams. Abteilungen sind Teil des Rechtemodells (siehe Model
 * Zugehoerigkeit) und liefern außerdem das Kürzel für den Benutzernamen
 * (vorname.nachname@kuerzel, siehe personErstellen) — ohne Kürzel kann in
 * dieser Abteilung niemand mehr angelegt werden.
 *
 * Beide Listen: kein Löschen, nur Umbenennen und Deaktivieren — bestehende
 * Mitgliedschaften bzw. Zugehörigkeiten müssen ihre Gruppe/Abteilung
 * behalten.
 *
 * Nebeneinander statt untereinander (zwei Spalten ab `md:`) — so wie jede
 * Kachel mit zwei Inhalten ihre Unterseite aufbauen soll.
 *
 * `automatisch: false` filtert die eine Sonder-Gruppe "Alle" (siehe
 * Kommentar am Model Gruppe) aus dieser Verwaltungsliste heraus — die
 * pflegt sich selbst über personErstellen/seed.ts, hier gäbe es nichts
 * umzubenennen oder zu deaktivieren, das nicht kaputtginge.
 */
export default async function GruppenUndAbteilungenSeite() {
  await berechtigung({ benoetigteBerechtigung: "Adminbereich" })
  const [gruppen, abteilungen] = await Promise.all([
    prisma.gruppe.findMany({ where: { automatisch: false }, orderBy: { name: "asc" } }),
    prisma.abteilung.findMany({ orderBy: { name: "asc" } }),
  ])

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <Kopfleiste />
      <h1 className="text-center text-2xl font-semibold text-ueberschrift md:text-left">Gruppen &amp; Abteilungen</h1>

      <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
        <section>
          <h2 className="text-sm font-semibold text-primaer">Gruppen</h2>

          <form
            action={gruppeErstellen}
            className="mt-2 flex gap-2 rounded-xl border border-rand bg-flaeche p-4"
          >
            <input
              name="name"
              type="text"
              required
              placeholder="Neue Gruppe"
              className="h-9 flex-1 rounded-lg border border-flaeche-300 px-2 text-sm"
            />
            <button
              type="submit"
              className="h-9 shrink-0 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
            >
              Hinzufügen
            </button>
          </form>

          <ul className="mt-3 flex flex-col divide-y divide-flaeche-100 rounded-xl border border-rand bg-flaeche">
            {gruppen.map((gruppe) => (
              <li key={gruppe.id} className="flex items-center gap-2 px-4 py-2.5">
                <form action={gruppeUmbenennen.bind(null, gruppe.id)} className="flex flex-1 items-center gap-2">
                  <input
                    name="name"
                    type="text"
                    defaultValue={gruppe.name}
                    required
                    className={
                      "h-9 flex-1 rounded-lg border border-flaeche-300 px-2 text-sm " +
                      (gruppe.aktiv ? "" : "text-tertiaer")
                    }
                  />
                  <button
                    type="submit"
                    className="h-9 shrink-0 rounded-lg px-2 text-xs font-medium text-sekundaer transition hover:bg-flaeche-100"
                  >
                    Speichern
                  </button>
                </form>
                <form action={gruppeAktivSetzen.bind(null, gruppe.id, !gruppe.aktiv)}>
                  <button
                    type="submit"
                    className={
                      "h-9 shrink-0 rounded-lg px-2.5 text-xs font-medium transition " +
                      (gruppe.aktiv
                        ? "text-sekundaer hover:bg-flaeche-100"
                        : "bg-marke-gruen/15 text-marke-gruen-dunkel hover:bg-marke-gruen/25")
                    }
                  >
                    {gruppe.aktiv ? "Deaktivieren" : "Aktivieren"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-primaer">Abteilungen</h2>

          <form
            action={abteilungErstellen}
            className="mt-2 flex gap-2 rounded-xl border border-rand bg-flaeche p-4"
          >
            <input
              name="name"
              type="text"
              required
              placeholder="Neue Abteilung"
              className="h-9 flex-1 rounded-lg border border-flaeche-300 px-2 text-sm"
            />
            <input
              name="kuerzel"
              type="text"
              required
              placeholder="Kürzel"
              maxLength={8}
              className="h-9 w-32 shrink-0 rounded-lg border border-flaeche-300 px-2 text-sm"
            />
            <button
              type="submit"
              className="h-9 shrink-0 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
            >
              Hinzufügen
            </button>
          </form>

          <ul className="mt-3 flex flex-col divide-y divide-flaeche-100 rounded-xl border border-rand bg-flaeche">
            {abteilungen.map((abteilung) => (
              <li key={abteilung.id} className="flex items-center gap-2 px-4 py-2.5">
                <form
                  action={abteilungUmbenennen.bind(null, abteilung.id)}
                  className="flex flex-1 items-center gap-2"
                >
                  <input
                    name="name"
                    type="text"
                    defaultValue={abteilung.name}
                    required
                    className={
                      "h-9 flex-1 rounded-lg border border-flaeche-300 px-2 text-sm " +
                      (abteilung.aktiv ? "" : "text-tertiaer")
                    }
                  />
                  <input
                    name="kuerzel"
                    type="text"
                    defaultValue={abteilung.kuerzel ?? ""}
                    placeholder="Kürzel"
                    maxLength={8}
                    className={
                      "h-9 w-24 shrink-0 rounded-lg border border-flaeche-300 px-2 text-sm " +
                      (abteilung.aktiv ? "" : "text-tertiaer")
                    }
                  />
                  <button
                    type="submit"
                    className="h-9 shrink-0 rounded-lg px-2 text-xs font-medium text-sekundaer transition hover:bg-flaeche-100"
                  >
                    Speichern
                  </button>
                </form>
                <form action={abteilungAktivSetzen.bind(null, abteilung.id, !abteilung.aktiv)}>
                  <button
                    type="submit"
                    className={
                      "h-9 shrink-0 rounded-lg px-2.5 text-xs font-medium transition " +
                      (abteilung.aktiv
                        ? "text-sekundaer hover:bg-flaeche-100"
                        : "bg-marke-gruen/15 text-marke-gruen-dunkel hover:bg-marke-gruen/25")
                    }
                  >
                    {abteilung.aktiv ? "Deaktivieren" : "Aktivieren"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <ZurueckButton />
    </main>
  )
}
