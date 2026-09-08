import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import { BAUSTEINE } from "@/lib/bausteine"
import { nutzeroberflaecheAktualisieren } from "@/lib/einstellungen/aktionen"

/**
 * Einziger Einstellungspunkt bisher: welches Modul aus "Weiteres" (siehe
 * src/lib/bausteine.ts) auf der Startseite in Zeile 2, Spalte 4 erscheint
 * — die übrigen Module dieser Liste zeigen sich dort nicht (siehe
 * Kommentar an Person.startseiteWeiteresModul und src/app/page.tsx). Die
 * Auswahl selbst kommt bewusst dynamisch aus BAUSTEINE statt hart codiert,
 * damit ein später ergänztes "Weiteres"-Modul hier automatisch mit
 * auftaucht.
 */
export default async function NutzeroberflaecheSeite() {
  const kontext = await berechtigung()

  const person = await prisma.person.findUniqueOrThrow({
    where: { benutzername: kontext.personId },
    select: { startseiteWeiteresModul: true },
  })

  const weiteresEintrag = BAUSTEINE.find((baustein) => baustein.unterpunkte)
  const weiteresModule = weiteresEintrag?.unterpunkte ?? []
  const ausgewaehlt = person.startseiteWeiteresModul ?? weiteresModule[0]?.name ?? ""

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Kopfleiste name={kontext.name} />
      <h1 className="text-2xl font-semibold text-marke-grau">Nutzeroberfläche</h1>

      <form
        action={nutzeroberflaecheAktualisieren}
        className="mt-6 flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4"
      >
        <div>
          <label htmlFor="startseiteModul" className="block text-xs font-medium text-neutral-600">
            Anordnung Startseite
          </label>
          {/* key={ausgewaehlt}: erzwingt nach dem Speichern ein Neu-Mounten
              dieses Felds — ohne das würde React ein bereits gemountetes
              <select> bei einem neuen `defaultValue` NICHT automatisch
              nachziehen (defaultValue wirkt nur beim ersten Rendern), die
              Anzeige würde also auf dem vorherigen Wert hängen bleiben. */}
          <select
            key={ausgewaehlt}
            id="startseiteModul"
            name="startseiteModul"
            defaultValue={ausgewaehlt}
            className="mt-1 h-9 w-full rounded-lg border border-neutral-300 px-2 text-sm sm:w-auto"
          >
            {weiteresModule.map((punkt) => (
              <option key={punkt.name} value={punkt.name}>
                {punkt.name}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-neutral-500">
            Welches der Module aus &quot;Weiteres&quot; als Kachel auf der Startseite erscheint — die übrigen bleiben
            über &quot;Weiteres&quot; in der Kopfzeile erreichbar.
          </p>
        </div>

        <button
          type="submit"
          className="ml-auto h-9 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
        >
          Speichern
        </button>
      </form>

      <ZurueckButton />
    </main>
  )
}
