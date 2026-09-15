import { notFound } from "next/navigation"
import Link from "next/link"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import { ArtikelErstellenDialog } from "@/components/artikel-erstellen-dialog"
import { ArtikelListe } from "@/components/artikel-liste"
import type { ArtikelFormularOptionen } from "@/components/artikel-form-felder"
import { unterordnerDetail } from "@/lib/wissen/abfragen"
import { darfWissenVerwalten } from "@/lib/wissen/sichtbarkeit"
import {
  artikelErstellen,
  artikelAktualisieren,
  artikelAnhangLoeschen,
  artikelLoeschen,
  artikelDetailLaden,
} from "@/lib/wissen/aktionen"

/** Ein Unterordner: nur noch die Artikel-Liste — tiefer geht die Ordnerstruktur nicht (siehe Kommentar am Model WissensUnterordner). */
export default async function WissensUnterordnerSeite({
  params,
}: {
  params: Promise<{ ordnerId: string; unterordnerId: string }>
}) {
  const kontext = await berechtigung()
  const { ordnerId, unterordnerId } = await params
  const darfVerwalten = darfWissenVerwalten(kontext)

  const [detail, personen, gruppen, abteilungen] = await Promise.all([
    unterordnerDetail(unterordnerId, kontext),
    prisma.person.findMany({
      where: { aktiv: true, benutzername: { not: kontext.personId } },
      orderBy: [{ nachname: "asc" }, { vorname: "asc" }],
      select: { benutzername: true, vorname: true, nachname: true },
    }),
    prisma.gruppe.findMany({ where: { aktiv: true }, orderBy: { name: "asc" } }),
    prisma.abteilung.findMany({ where: { aktiv: true }, orderBy: { name: "asc" } }),
  ])

  if (!detail || detail.unterordner.ordnerId !== ordnerId) notFound()
  const { unterordner, artikel } = detail

  const optionen: ArtikelFormularOptionen = {
    personen: personen.map((p) => ({ id: p.benutzername, name: `${p.vorname} ${p.nachname}` })),
    gruppen: gruppen.map((g) => ({ id: g.id, name: g.name })),
    abteilungen: abteilungen.map((a) => ({ id: a.id, name: a.name })),
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Kopfleiste name={kontext.name} />
      <p className="text-sm text-sekundaer">
        <Link href={`/wissen/${ordnerId}`} className="hover:underline">
          {unterordner.ordner.name}
        </Link>
      </p>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-ueberschrift">{unterordner.name}</h1>
        {darfVerwalten && (
          <ArtikelErstellenDialog
            ordnerId={ordnerId}
            unterordnerId={unterordnerId}
            optionen={optionen}
            erstellenAktion={artikelErstellen}
          />
        )}
      </div>

      <div className="mt-6 rounded-xl border border-rand bg-flaeche p-4">
        <h2 className="text-sm font-semibold text-ueberschrift">Artikel</h2>
        <ArtikelListe
          artikel={artikel}
          darfVerwalten={darfVerwalten}
          optionen={optionen}
          aktualisierenAktion={artikelAktualisieren}
          anhangLoeschenAktion={artikelAnhangLoeschen}
          loeschenAktion={artikelLoeschen}
          artikelDetailLadenAktion={artikelDetailLaden}
        />
      </div>

      <ZurueckButton />
    </main>
  )
}
