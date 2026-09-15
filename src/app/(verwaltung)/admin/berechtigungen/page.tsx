import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { Rolle } from "@/generated/prisma/enums"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import {
  berechtigungErstellen,
  berechtigungUmbenennen,
  berechtigungAktivSetzen,
} from "@/lib/admin/berechtigungen-aktionen"

/**
 * Berechtigungen sind feature-bezogene Freischaltungen unabhängig von
 * Rolle und Gruppe (siehe Model Berechtigung). Kein Löschen, nur Umbenennen
 * und Deaktivieren: bestehende Zuweisungen (PersonBerechtigung) müssen ihre
 * Berechtigung behalten. Die meisten Einträge betreffen Bausteine, die es
 * hier noch nicht gibt — der Adminbereich selbst prüft weiterhin über
 * Rolle.ADMINISTRATION, nicht über einen Eintrag hier.
 */
export default async function BerechtigungenSeite() {
  await berechtigung([Rolle.ADMINISTRATION])
  const berechtigungen = await prisma.berechtigung.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { mitglieder: true } } },
  })

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Kopfleiste />
      <h1 className="text-center text-2xl font-semibold text-ueberschrift md:text-left">Berechtigungen</h1>

      <form
        action={berechtigungErstellen}
        className="mt-6 flex gap-2 rounded-xl border border-rand bg-flaeche p-4"
      >
        <input
          name="name"
          type="text"
          required
          placeholder="Neue Berechtigung"
          className="h-9 flex-1 rounded-lg border border-flaeche-300 px-2 text-sm"
        />
        <button
          type="submit"
          className="h-9 shrink-0 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
        >
          Hinzufügen
        </button>
      </form>

      <ul className="mt-6 flex flex-col divide-y divide-flaeche-100 rounded-xl border border-rand bg-flaeche">
        {berechtigungen.map((berechtigung) => (
          <li key={berechtigung.id} className="flex items-center gap-2 px-4 py-2.5">
            <form
              action={berechtigungUmbenennen.bind(null, berechtigung.id)}
              className="flex flex-1 items-center gap-2"
            >
              <input
                name="name"
                type="text"
                defaultValue={berechtigung.name}
                required
                className={
                  "h-9 flex-1 rounded-lg border border-flaeche-300 px-2 text-sm " +
                  (berechtigung.aktiv ? "" : "text-tertiaer")
                }
              />
              <button
                type="submit"
                className="h-9 shrink-0 rounded-lg px-2 text-xs font-medium text-sekundaer transition hover:bg-flaeche-100"
              >
                Speichern
              </button>
            </form>
            <span
              title="Mitarbeitende mit dieser Berechtigung"
              className="h-9 shrink-0 rounded-full bg-flaeche-100 px-2.5 text-xs font-medium leading-9 text-sekundaer"
            >
              {berechtigung._count.mitglieder}
            </span>
            <form action={berechtigungAktivSetzen.bind(null, berechtigung.id, !berechtigung.aktiv)}>
              <button
                type="submit"
                className={
                  "h-9 shrink-0 rounded-lg px-2.5 text-xs font-medium transition " +
                  (berechtigung.aktiv
                    ? "text-sekundaer hover:bg-flaeche-100"
                    : "bg-marke-gruen/15 text-marke-gruen-dunkel hover:bg-marke-gruen/25")
                }
              >
                {berechtigung.aktiv ? "Deaktivieren" : "Aktivieren"}
              </button>
            </form>
          </li>
        ))}
      </ul>

      <ZurueckButton />
    </main>
  )
}
