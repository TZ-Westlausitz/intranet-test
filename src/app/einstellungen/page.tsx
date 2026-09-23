import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import { FarbschemaSchalter } from "@/components/farbschema-schalter"
import { STARTSEITE_WEITERES_MODULE } from "@/lib/bausteine"
import { nutzeroberflaecheAktualisieren } from "@/lib/einstellungen/aktionen"

/**
 * Alle persönlichen Einstellungen auf einer Seite (Rückmeldung 2026-09-11:
 * bei nur zwei Punkten lohnen sich keine eigenen Unterseiten mehr) — vorher
 * eine Übersicht mit zwei Kacheln zu /einstellungen/nutzeroberflaeche und
 * /einstellungen/farbschema, beide Unterseiten sind seitdem entfernt.
 */
export default async function EinstellungenSeite() {
  const kontext = await berechtigung()

  const person = await prisma.person.findUniqueOrThrow({
    where: { benutzername: kontext.personId },
    select: { startseiteWeiteresModul: true },
  })
  const weiteresModule = STARTSEITE_WEITERES_MODULE
  const ausgewaehlt = person.startseiteWeiteresModul ?? weiteresModule[0]?.name ?? ""

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Kopfleiste />
      <h1 className="text-center text-2xl font-semibold text-ueberschrift md:text-left">Einstellungen</h1>

      <section className="mt-6 rounded-xl border border-rand bg-flaeche p-4">
        <h2 className="text-base font-semibold text-ueberschrift">Nutzeroberfläche – Startseite</h2>
        <p className="mt-1 text-sm text-sekundaer">
          Welches der Module aus &quot;Weiteres&quot; als eigene Kachel auf der Startseite erscheint — die übrigen
          bleiben über &quot;Weiteres&quot; in der Kopfzeile erreichbar.
        </p>

        <form action={nutzeroberflaecheAktualisieren} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* key={ausgewaehlt}: erzwingt nach dem Speichern ein Neu-Mounten
              dieses Felds — ohne das würde React ein bereits gemountetes
              <select> bei einem neuen `defaultValue` NICHT automatisch
              nachziehen (defaultValue wirkt nur beim ersten Rendern), die
              Anzeige würde also auf dem vorherigen Wert hängen bleiben. */}
          <select
            key={ausgewaehlt}
            name="startseiteModul"
            defaultValue={ausgewaehlt}
            className="h-9 rounded-lg border border-rand bg-flaeche px-2 text-sm text-primaer sm:w-auto"
          >
            {weiteresModule.map((punkt) => (
              <option key={punkt.name} value={punkt.name}>
                {punkt.name}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="h-9 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel sm:ml-auto"
          >
            Speichern
          </button>
        </form>
      </section>

      <section className="mt-4 rounded-xl border border-rand bg-flaeche p-4">
        <h2 className="text-base font-semibold text-ueberschrift">Farbschema</h2>
        <p className="mt-1 text-sm text-sekundaer">Heller oder dunkler Hintergrund, geräteübergreifend.</p>

        <div className="mt-3">
          <FarbschemaSchalter aktivDunkel={kontext.farbschema === "DUNKEL"} />
        </div>
      </section>

      <ZurueckButton />
    </main>
  )
}
