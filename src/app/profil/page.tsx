import { berechtigung } from "@/lib/auth/berechtigung"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"

/**
 * Eigenes Profil — nur Anzeige. Kein Rollenfilter in `berechtigung()`:
 * jede angemeldete Person darf ihre eigenen Daten sehen.
 */
export default async function ProfilSeite() {
  const kontext = await berechtigung()

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Kopfleiste name={kontext.name} />
      <h1 className="text-2xl font-semibold text-marke-grau">Profil</h1>

      <dl className="mt-6 flex flex-col gap-3 text-sm">
        <div className="flex justify-between border-b border-neutral-100 pb-2">
          <dt className="text-neutral-500">Name</dt>
          <dd className="font-medium">{kontext.name}</dd>
        </div>
        <div className="flex justify-between border-b border-neutral-100 pb-2">
          <dt className="text-neutral-500">Benutzername</dt>
          <dd className="font-medium">{kontext.benutzername}</dd>
        </div>
        <div className="flex justify-between border-b border-neutral-100 pb-2">
          <dt className="text-neutral-500">Rolle(n)</dt>
          <dd className="font-medium">
            {kontext.rollen.length > 0 ? kontext.rollen.join(", ") : "—"}
          </dd>
        </div>
      </dl>

      <ZurueckButton />
    </main>
  )
}
