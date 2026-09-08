import Link from "next/link"

import { berechtigung } from "@/lib/auth/berechtigung"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"

/**
 * Einstiegsseite für persönliche Einstellungen — bisher nur ein Bereich
 * ("Nutzeroberfläche"), als Kachel statt direkt als Link im Benutzermenü,
 * damit hier mit der Zeit weitere Bereiche danebenstehen können, ohne das
 * Benutzermenü selbst mit Unterpunkten zu füllen.
 */
export default async function EinstellungenSeite() {
  const kontext = await berechtigung()

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Kopfleiste name={kontext.name} />
      <h1 className="text-center text-2xl font-semibold text-marke-grau md:text-left">Einstellungen</h1>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          href="/einstellungen/nutzeroberflaeche"
          className="flex flex-col rounded-2xl border border-x-neutral-200 border-b-neutral-200 border-t-4 border-t-marke-gruen bg-white p-4 shadow-sm transition hover:border-marke-gruen focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
        >
          <h2 className="text-lg font-semibold text-marke-grau">Nutzeroberfläche</h2>
          <p className="mt-2 text-sm text-neutral-500">Anordnung der Startseite und Ähnliches.</p>
        </Link>
      </div>

      <ZurueckButton />
    </main>
  )
}
