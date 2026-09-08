import { notFound } from "next/navigation"

import { berechtigung } from "@/lib/auth/berechtigung"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import { KontaktProfil } from "@/components/kontakt-profil"
import { personKontaktDetail } from "@/lib/kontakte/abfragen"

/**
 * Minimales Personenprofil — Sprungziel für @Erwähnungen im Newsfeed
 * (RichTextErwaehnung) und für Klicks aus /kontakte. `notFound()` nur, wenn
 * die `personId` gar nicht existiert; eine existierende, aber deaktivierte
 * Person (Regel 4: nie gelöscht) zeigt stattdessen "Nicht mehr aktiv" —
 * eine alte Erwähnung soll nicht ins Leere laufen, nur weil die Person
 * inzwischen ausgeschieden ist.
 */
export default async function KontaktDetailSeite({ params }: { params: Promise<{ personId: string }> }) {
  const kontext = await berechtigung()
  const { personId } = await params
  // Der Benutzername enthält ein "@" (vorname.nachname@kuerzel, siehe
  // nameNormalisieren) — anders als jede andere ID in diesem Projekt
  // (sonst immer cuid()), das erste Mal, dass eine Route ihn direkt als
  // URL-Segment führt. Next.js liefert das Segment hier noch
  // Prozent-kodiert (%40 statt @) statt schon dekodiert, deshalb explizit
  // decodeURIComponent.
  const echterPersonId = decodeURIComponent(personId)

  const person = await personKontaktDetail(echterPersonId)
  if (!person) notFound()

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Kopfleiste name={kontext.name} />

      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <KontaktProfil person={person} />
      </div>

      <ZurueckButton />
    </main>
  )
}
