import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { Rolle } from "@/generated/prisma/enums"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import { ortErstellen, ortUmbenennen, ortAktivSetzen } from "@/lib/admin/orte-aktionen"

/**
 * Orte sind feinere Standorte innerhalb eines Standorts, z. B. "Kamenz -
 * Praxis" (siehe Model Ort) — gedacht für eine spätere Orts-Auswahl bei
 * Terminen statt Freitext. Kein Löschen, nur Umbenennen und Deaktivieren.
 */
export default async function OrteSeite() {
  const kontext = await berechtigung([Rolle.ADMINISTRATION])
  const orte = await prisma.ort.findMany({ orderBy: { name: "asc" } })

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Kopfleiste name={kontext.name} />
      <h1 className="text-center text-2xl font-semibold text-marke-grau md:text-left">Orte</h1>

      <form action={ortErstellen} className="mt-6 flex gap-2 rounded-xl border border-neutral-200 bg-white p-4">
        <input
          name="name"
          type="text"
          required
          placeholder="Neuer Ort"
          className="h-9 flex-1 rounded-lg border border-neutral-300 px-2 text-sm"
        />
        <button
          type="submit"
          className="h-9 shrink-0 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
        >
          Hinzufügen
        </button>
      </form>

      <ul className="mt-6 flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
        {orte.map((ort) => (
          <li key={ort.id} className="flex items-center gap-2 px-4 py-2.5">
            <form action={ortUmbenennen.bind(null, ort.id)} className="flex flex-1 items-center gap-2">
              <input
                name="name"
                type="text"
                defaultValue={ort.name}
                required
                className={
                  "h-9 flex-1 rounded-lg border border-neutral-300 px-2 text-sm " +
                  (ort.aktiv ? "" : "text-neutral-400")
                }
              />
              <button
                type="submit"
                className="h-9 shrink-0 rounded-lg px-2 text-xs font-medium text-neutral-500 transition hover:bg-neutral-100"
              >
                Speichern
              </button>
            </form>
            <form action={ortAktivSetzen.bind(null, ort.id, !ort.aktiv)}>
              <button
                type="submit"
                className={
                  "h-9 shrink-0 rounded-lg px-2.5 text-xs font-medium transition " +
                  (ort.aktiv
                    ? "text-neutral-500 hover:bg-neutral-100"
                    : "bg-marke-gruen/15 text-marke-gruen-dunkel hover:bg-marke-gruen/25")
                }
              >
                {ort.aktiv ? "Deaktivieren" : "Aktivieren"}
              </button>
            </form>
          </li>
        ))}
      </ul>

      <ZurueckButton />
    </main>
  )
}
