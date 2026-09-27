import { berechtigung } from "@/lib/auth/berechtigung"
import { fuhrparkFormularOptionen } from "@/lib/fuhrpark/abfragen"
import { fahrzeugAnlegen } from "@/lib/fuhrpark/aktionen"
import { FahrzeugFormularFelder } from "@/components/fuhrpark/fahrzeug-formular"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"

const FEHLER_TEXTE: Record<string, string> = {
  pflichtfeld: "Kennzeichen und Bezeichnung sind Pflichtfelder.",
  kennzeichenVergeben: "Dieses Kennzeichen gibt es bereits im Fuhrpark.",
  standortUngueltig: "Der gewählte Standort existiert nicht (mehr).",
  halterUngueltig: "Der gewählte Halter ist nicht (mehr) aktiv.",
}

/** Neues Fahrzeug im Fuhrpark erfassen — nur Werkstattleitung. */
export default async function NeuesFahrzeugSeite({ searchParams }: { searchParams: Promise<{ fehler?: string }> }) {
  await berechtigung({ benoetigteBerechtigung: ["Werkstattleiter", "Adminbereich"] })
  const { fehler } = await searchParams
  const optionen = await fuhrparkFormularOptionen()

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Kopfleiste />
      <h1 className="text-2xl font-semibold text-ueberschrift">Neues Fahrzeug</h1>

      {fehler && (
        <p role="alert" className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
          {FEHLER_TEXTE[fehler] ?? "Das hat nicht geklappt."}
        </p>
      )}

      <form action={fahrzeugAnlegen} className="mt-6 flex flex-col gap-6">
        <FahrzeugFormularFelder optionen={optionen} mitAktiv={false} />
        <button
          type="submit"
          className="h-10 w-fit rounded-lg bg-marke-gruen px-5 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
        >
          Fahrzeug anlegen
        </button>
      </form>

      <ZurueckButton />
    </main>
  )
}
