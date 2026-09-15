import Link from "next/link"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { Rolle } from "@/generated/prisma/enums"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import {
  infoKategorieErstellen,
  infoKategorieUmbenennen,
  infoKategorieAktivSetzen,
} from "@/lib/admin/info-kategorien-aktionen"

/**
 * Kategorien für den Newsfeed-Baustein (Model InfoKategorie) — feste,
 * hier gepflegte Liste statt Freitext beim Erstellen einer Info. Kein
 * Löschen, nur Umbenennen und Deaktivieren: bestehende Infos müssen ihre
 * Kategorie behalten. Dieselbe Struktur wie /admin/berechtigungen.
 *
 * Erreichbar über die Kachel "Orte & Kategorien" auf der Admin-
 * Übersichtsseite (die bisher direkt auf /admin/orte führte, weil es
 * diese Seite noch nicht gab) — deshalb der kleine Querverweis zu Orte
 * oben, damit beide Seiten von der einen Kachel aus auffindbar bleiben.
 */
export default async function InfoKategorienSeite() {
  const kontext = await berechtigung([Rolle.ADMINISTRATION])
  const kategorien = await prisma.infoKategorie.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { infos: true } } },
  })

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Kopfleiste name={kontext.name} />
      <div className="flex items-center justify-center gap-3 md:justify-start">
        <h1 className="text-2xl font-semibold text-ueberschrift">Info-Kategorien</h1>
        <Link href="/admin/orte" className="text-sm font-medium text-marke-gruen-dunkel hover:underline">
          Orte →
        </Link>
      </div>

      <form action={infoKategorieErstellen} className="mt-6 flex gap-2 rounded-xl border border-rand bg-flaeche p-4">
        <input
          name="name"
          type="text"
          required
          placeholder="Neue Kategorie"
          className="h-9 flex-1 rounded-lg border border-flaeche-300 px-2 text-sm"
        />
        <button
          type="submit"
          className="h-9 shrink-0 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
        >
          Hinzufügen
        </button>
      </form>

      <ul className="mt-6 flex flex-col divide-y divide-flaeche-100 rounded-xl border border-rand bg-flaeche">
        {kategorien.map((kategorie) => (
          <li key={kategorie.id} className="flex items-center gap-2 px-4 py-2.5">
            <form
              action={infoKategorieUmbenennen.bind(null, kategorie.id)}
              className="flex flex-1 items-center gap-2"
            >
              <input
                name="name"
                type="text"
                defaultValue={kategorie.name}
                required
                className={
                  "h-9 flex-1 rounded-lg border border-flaeche-300 px-2 text-sm " +
                  (kategorie.aktiv ? "" : "text-tertiaer")
                }
              />
              <button
                type="submit"
                className="h-9 shrink-0 rounded-lg px-2 text-xs font-medium text-sekundaer transition hover:bg-flaeche-100"
              >
                Speichern
              </button>
            </form>
            <span
              title="Infos mit dieser Kategorie"
              className="h-9 shrink-0 rounded-full bg-flaeche-100 px-2.5 text-xs font-medium leading-9 text-sekundaer"
            >
              {kategorie._count.infos}
            </span>
            <form action={infoKategorieAktivSetzen.bind(null, kategorie.id, !kategorie.aktiv)}>
              <button
                type="submit"
                className={
                  "h-9 shrink-0 rounded-lg px-2.5 text-xs font-medium transition " +
                  (kategorie.aktiv
                    ? "text-sekundaer hover:bg-flaeche-100"
                    : "bg-marke-gruen/15 text-marke-gruen-dunkel hover:bg-marke-gruen/25")
                }
              >
                {kategorie.aktiv ? "Deaktivieren" : "Aktivieren"}
              </button>
            </form>
          </li>
        ))}
      </ul>

      <ZurueckButton />
    </main>
  )
}
