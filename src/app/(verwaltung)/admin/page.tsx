import Image from "next/image"
import Link from "next/link"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { formatiereDatumAusDate, zeitAusDate } from "@/lib/datum"

type UpdateEintrag = { id: string; name: string; zeitpunkt: Date; art: "neu" | "abgang" }

/**
 * Adminbereich-Startseite — bewusst wie die normale Startseite aufgebaut
 * (Kacheln, gleiches Design, gleicher Hover-Effekt wie src/app/page.tsx),
 * nicht wie die übrigen Admin-Unterseiten (einfache Liste + ZurueckButton).
 * Nur die Desktop-Fassung: der Adminbereich ist ausdrücklich ein
 * Desktop-Werkzeug (genau wie im alten Intranet app.ueberblick.io) — der
 * "Admin"-Link im Benutzermenü erscheint ohnehin nur im festen
 * Desktop-Header, nicht in der mobilen Kopfleiste (siehe Memory
 * mobile-kopfleiste-fehlende-parity).
 *
 * Fünf Kacheln: links Benutzer-Übersicht und Gruppen/Abteilungen
 * (grün), mittig Berechtigungen und Orte/Kategorien (orange), rechts eine
 * große, über beide Zeilen reichende Kachel mit dem Mitarbeiterupdates-Feed
 * (grün). Gruppen/Abteilungen, Berechtigungen und Orte/Kategorien sind
 * bewusst nur Überschrift + Symbol ohne Zahlen — reine Einstiegspunkte in
 * die jeweilige Verwaltungsseite, keine Kennzahlen-Kacheln wie Benutzer.
 * Die drei Symbole liegen als PNG unter public/admin/ (von Jonas geliefert).
 */
export default async function AdminSeite() {
  await berechtigung({ benoetigteBerechtigung: "Adminbereich" })

  const [neuePersonen, deaktiviertePersonen, aktiveMitarbeiterAnzahl] = await Promise.all([
    prisma.person.findMany({
      orderBy: { erstelltAm: "desc" },
      take: 8,
      select: { benutzername: true, vorname: true, nachname: true, erstelltAm: true },
    }),
    prisma.person.findMany({
      where: { aktiv: false },
      orderBy: { deaktiviertAm: "desc" },
      take: 8,
      select: { benutzername: true, vorname: true, nachname: true, deaktiviertAm: true },
    }),
    prisma.person.count({ where: { aktiv: true } }),
  ])

  // Beide Ereignisarten in einen gemeinsamen, zeitlich sortierten Feed
  // gemischt — eine Person kann darin zweimal auftauchen (angelegt UND
  // später deaktiviert), das sind zwei echte, getrennte Ereignisse.
  const updates: UpdateEintrag[] = [
    ...neuePersonen.map((p) => ({
      id: `${p.benutzername}-neu`,
      name: `${p.vorname} ${p.nachname}`,
      zeitpunkt: p.erstelltAm,
      art: "neu" as const,
    })),
    ...deaktiviertePersonen
      .filter((p) => p.deaktiviertAm)
      .map((p) => ({
        id: `${p.benutzername}-abgang`,
        name: `${p.vorname} ${p.nachname}`,
        zeitpunkt: p.deaktiviertAm!,
        art: "abgang" as const,
      })),
  ]
    .sort((a, b) => b.zeitpunkt.getTime() - a.zeitpunkt.getTime())
    .slice(0, 12)

  return (
    <>
      {/* Handy: der Adminbereich ist ein Desktop-Werkzeug, siehe Kommentar
          oben — statt eines gequetschten Kachelrasters nur ein Hinweis. */}
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-5 text-center md:hidden">
        <p className="text-sm text-primaer">
          Der Adminbereich ist für die Desktop-Ansicht gedacht — bitte an einem größeren Bildschirm öffnen.
        </p>
        <Link href="/" className="text-sm font-semibold text-marke-gruen-dunkel hover:underline">
          Zur Startseite
        </Link>
      </main>

      <main className="hidden h-full flex-col md:flex">
        <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-auto bg-gradient-to-br from-marke-gruen/5 via-background to-marke-orange/5 p-6">
          <h1 className="text-2xl font-semibold text-ueberschrift">Adminbereich</h1>

          <div className="grid grid-cols-[repeat(3,min(24rem,34vh,27vw))] grid-rows-[repeat(2,min(24rem,34vh,27vw))] gap-[min(2.5rem,4vh)]">
            {/* Links oben — Benutzer */}
            <Link
              href="/admin/benutzer"
              className="col-start-1 row-start-1 flex flex-col rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-gruen bg-flaeche p-4 text-center shadow-sm transition hover:border-marke-gruen focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
            >
              <h2 className="text-lg font-semibold text-ueberschrift">Benutzer</h2>
              <div className="flex flex-1 flex-col items-center justify-center">
                <span className="text-5xl font-bold leading-none text-ueberschrift">{aktiveMitarbeiterAnzahl}</span>
                <span className="mt-1.5 text-sm font-medium text-sekundaer">aktiv</span>
              </div>
            </Link>

            {/* Links unten — Gruppen & Abteilungen: reiner Einstiegspunkt, siehe Kommentar oben. */}
            <Link
              href="/admin/gruppen"
              className="col-start-1 row-start-2 flex flex-col rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-gruen bg-flaeche p-4 text-center shadow-sm transition hover:border-marke-gruen focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
            >
              <h2 className="text-lg font-semibold text-ueberschrift">Gruppen &amp; Abteilungen</h2>
              <div className="flex flex-1 items-center justify-center">
                <Image src="/admin/icon_gruppen.png" alt="" width={72} height={72} />
              </div>
            </Link>

            {/* Mitte oben — Berechtigungen: reiner Einstiegspunkt. */}
            <Link
              href="/admin/berechtigungen"
              className="col-start-2 row-start-1 flex flex-col rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-orange bg-flaeche p-4 text-center shadow-sm transition hover:border-marke-orange focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
            >
              <h2 className="text-lg font-semibold text-ueberschrift">Berechtigungen</h2>
              <div className="flex flex-1 items-center justify-center">
                <Image src="/admin/icon_berechtigungen.png" alt="" width={72} height={72} />
              </div>
            </Link>

            {/* Mitte unten — Orte & Kategorien: reiner Einstiegspunkt (Kategorien
                gibt es noch nicht, siehe Memory adminbereich-rechteverwaltung —
                der Link führt deshalb schon auf Orte). */}
            <Link
              href="/admin/orte"
              className="col-start-2 row-start-2 flex flex-col rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-orange bg-flaeche p-4 text-center shadow-sm transition hover:border-marke-orange focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
            >
              <h2 className="text-lg font-semibold text-ueberschrift">Orte &amp; Kategorien</h2>
              <div className="flex flex-1 items-center justify-center">
                <Image src="/admin/icon_orte.png" alt="" width={72} height={72} />
              </div>
            </Link>

            {/* Rechts, über beide Zeilen — Mitarbeiterupdates: gemeinsamer
                Newsfeed aus Neuzugängen (grüner Name) und Abgängen (roter
                Name), jeweils mit Zeitstempel darunter. */}
            <Link
              href="/admin/benutzer"
              className="col-start-3 row-start-1 row-span-2 flex flex-col overflow-hidden rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-gruen bg-flaeche p-4 shadow-sm transition hover:border-marke-gruen focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
            >
              <h2 className="shrink-0 text-center text-lg font-semibold text-ueberschrift">Mitarbeiterupdates</h2>
              {updates.length === 0 ? (
                <p className="mt-2 text-xs text-sekundaer">Noch keine Änderungen.</p>
              ) : (
                <ul className="mt-2 flex flex-1 flex-col gap-2.5 overflow-y-auto">
                  {updates.map((eintrag) => (
                    <li key={eintrag.id} className="text-xs">
                      <span
                        className={
                          "block truncate font-medium " +
                          (eintrag.art === "neu" ? "text-marke-gruen-dunkel" : "text-red-600")
                        }
                      >
                        {eintrag.name}
                      </span>
                      <span className="text-tertiaer">
                        {formatiereDatumAusDate(eintrag.zeitpunkt)} · {zeitAusDate(eintrag.zeitpunkt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
