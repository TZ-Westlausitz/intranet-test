import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import { KontakteListe } from "@/components/kontakte-liste"
import { aktivePersonenUebersicht } from "@/lib/kontakte/abfragen"

/**
 * Übersicht aller aktiven Mitarbeitenden — Sprungziel für @Erwähnungen im
 * Newsfeed (siehe RichTextErwaehnung) und für sich selbst als
 * Kontaktverzeichnis. Angelehnt an die entsprechende Seite im Altsystem
 * "Überblick" (Screenshot vom 2026-09-07): Suche, Filter nach Abteilung/
 * Gruppe, Telefon/E-Mail-Spalten, farblich codierte "zuletzt aktiv"-Anzeige
 * (siehe Person.letzteAktivitaet, throttled aktualisiert in berechtigung()).
 */
export default async function KontakteSeite() {
  await berechtigung()

  const [personen, abteilungen, gruppen] = await Promise.all([
    aktivePersonenUebersicht(),
    prisma.abteilung.findMany({ where: { aktiv: true }, orderBy: { name: "asc" } }),
    prisma.gruppe.findMany({ where: { aktiv: true }, orderBy: { name: "asc" } }),
  ])

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Kopfleiste />
      <h1 className="text-center text-2xl font-semibold text-ueberschrift md:text-left">Kontakte</h1>

      <KontakteListe personen={personen} abteilungen={abteilungen} gruppen={gruppen} />

      <ZurueckButton />
    </main>
  )
}
