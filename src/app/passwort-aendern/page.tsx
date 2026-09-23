import { berechtigung } from "@/lib/auth/berechtigung"
import { eigenesPasswortFestlegen } from "@/lib/auth/aktionen"
import { Logoleiste } from "@/components/logoleiste"
import { PasswortAendernFormular } from "@/components/passwort-aendern-formular"

const FEHLER_TEXTE: Record<string, string> = {
  kurz: "Das Passwort muss mindestens 10 Zeichen lang sein.",
  ungleich: "Die beiden Passwörter stimmen nicht überein.",
}

/**
 * Erzwungener Passwortwechsel nach dem ersten Login bzw. nach einem
 * Zurücksetzen durch die Admin (siehe personErstellen/
 * personPasswortZuruecksetzen — beide vergeben nur noch das gemeinsame
 * Startpasswort, siehe STANDARD_STARTPASSWORT).
 *
 * `berechtigung({ erlaubeVorPasswortwechsel: true })` statt der
 * normalen `berechtigung()`: sonst würde die zentrale Umleitung genau
 * hierher wieder hierher zurückführen, eine Endlosschleife.
 */
export default async function PasswortAendernSeite({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string }>
}) {
  const kontext = await berechtigung({ erlaubeVorPasswortwechsel: true })
  const { fehler } = await searchParams

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      <Logoleiste />
      <h1 className="text-2xl font-semibold text-ueberschrift">Neues Passwort festlegen</h1>
      <p className="mt-1 text-sm text-primaer">
        Hallo {kontext.name}, bitte leg jetzt dein eigenes Passwort fest, bevor es weitergeht.
      </p>

      <PasswortAendernFormular
        aktion={eigenesPasswortFestlegen}
        fehlerText={fehler ? (FEHLER_TEXTE[fehler] ?? "Das hat nicht geklappt.") : undefined}
      />
    </main>
  )
}
