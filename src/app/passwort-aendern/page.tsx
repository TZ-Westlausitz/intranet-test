import { berechtigung } from "@/lib/auth/berechtigung"
import { eigenesPasswortFestlegen } from "@/lib/auth/aktionen"
import { Logoleiste } from "@/components/logoleiste"
import { Hinweis } from "@/components/hinweis"

const FEHLER_TEXTE: Record<string, string> = {
  kurz: "Das Passwort muss mindestens 8 Zeichen lang sein.",
  ungleich: "Die beiden Passwörter stimmen nicht überein.",
}

/**
 * Erzwungener Passwortwechsel nach dem ersten Login bzw. nach einem
 * Zurücksetzen durch die Admin (siehe personErstellen/
 * personPasswortZuruecksetzen — beide vergeben nur noch das gemeinsame
 * Startpasswort, siehe STANDARD_STARTPASSWORT).
 *
 * `berechtigung(undefined, { erlaubeVorPasswortwechsel: true })` statt der
 * normalen `berechtigung()`: sonst würde die zentrale Umleitung genau
 * hierher wieder hierher zurückführen, eine Endlosschleife.
 */
export default async function PasswortAendernSeite({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string }>
}) {
  const kontext = await berechtigung(undefined, { erlaubeVorPasswortwechsel: true })
  const { fehler } = await searchParams

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      <Logoleiste />
      <h1 className="text-2xl font-semibold text-marke-grau">Neues Passwort festlegen</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Hallo {kontext.name}, bitte leg jetzt dein eigenes Passwort fest, bevor es weitergeht.
      </p>

      <form action={eigenesPasswortFestlegen} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Neues Passwort</span>
          <input
            name="neuesPasswort"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="rounded-lg border border-neutral-300 px-3 py-2.5 text-base focus:border-marke-gruen focus:outline focus:outline-2 focus:outline-marke-gruen"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Passwort wiederholen</span>
          <input
            name="passwortWiederholung"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="rounded-lg border border-neutral-300 px-3 py-2.5 text-base focus:border-marke-gruen focus:outline focus:outline-2 focus:outline-marke-gruen"
          />
        </label>

        {fehler && <Hinweis>{FEHLER_TEXTE[fehler] ?? "Das hat nicht geklappt."}</Hinweis>}

        <button
          type="submit"
          className="mt-2 rounded-lg bg-marke-gruen px-4 py-2.5 font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen focus-visible:outline-offset-2"
        >
          Passwort speichern
        </button>
      </form>
    </main>
  )
}
