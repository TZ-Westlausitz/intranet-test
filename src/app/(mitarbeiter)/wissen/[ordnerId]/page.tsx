import { notFound } from "next/navigation"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import { OrdnerErstellenDialog } from "@/components/ordner-erstellen-dialog"
import { WissensOrdnerGrid } from "@/components/wissens-ordner-grid"
import { ArtikelErstellenDialog } from "@/components/artikel-erstellen-dialog"
import { ArtikelListe } from "@/components/artikel-liste"
import type { ArtikelFormularOptionen } from "@/components/artikel-form-felder"
import { ordnerDetail } from "@/lib/wissen/abfragen"
import { darfWissenVerwalten } from "@/lib/wissen/sichtbarkeit"
import {
  unterordnerErstellen,
  unterordnerUmbenennen,
  unterordnerAktivSetzen,
  artikelErstellen,
  artikelAktualisieren,
  artikelAnhangLoeschen,
  artikelLoeschen,
  artikelDetailLaden,
} from "@/lib/wissen/aktionen"

/** Ein Ordner: Unterordner-Grid (falls vorhanden) + Artikel direkt im Ordner — nur die für die anzeigende Person sichtbaren. */
export default async function WissensOrdnerSeite({ params }: { params: Promise<{ ordnerId: string }> }) {
  const kontext = await berechtigung()
  const { ordnerId } = await params
  const darfVerwalten = darfWissenVerwalten(kontext)

  const [detail, personen, gruppen, abteilungen] = await Promise.all([
    ordnerDetail(ordnerId, kontext),
    prisma.person.findMany({
      where: { aktiv: true, benutzername: { not: kontext.personId } },
      orderBy: [{ nachname: "asc" }, { vorname: "asc" }],
      select: { benutzername: true, vorname: true, nachname: true },
    }),
    prisma.gruppe.findMany({ where: { aktiv: true }, orderBy: { name: "asc" } }),
    prisma.abteilung.findMany({ where: { aktiv: true }, orderBy: { name: "asc" } }),
  ])

  if (!detail) notFound()
  const { ordner, unterordner, artikel } = detail

  const optionen: ArtikelFormularOptionen = {
    personen: personen.map((p) => ({ id: p.benutzername, name: `${p.vorname} ${p.nachname}` })),
    gruppen: gruppen.map((g) => ({ id: g.id, name: g.name })),
    abteilungen: abteilungen.map((a) => ({ id: a.id, name: a.name })),
  }

  const unterordnerEintraege = unterordner.map((u) => ({
    id: u.id,
    name: u.name,
    aktiv: u.aktiv,
    artikelAnzahl: u._count.artikel,
  }))

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Kopfleiste name={kontext.name} />
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-ueberschrift">{ordner.name}</h1>
        {darfVerwalten && (
          <div className="flex shrink-0 gap-2">
            <OrdnerErstellenDialog
              label="+ Unterordner"
              titel="Neuer Unterordner"
              erstellenAktion={unterordnerErstellen.bind(null, ordnerId)}
            />
            <ArtikelErstellenDialog ordnerId={ordnerId} unterordnerId={null} optionen={optionen} erstellenAktion={artikelErstellen} />
          </div>
        )}
      </div>

      {unterordnerEintraege.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-primaer">Unterordner</h2>
          <div className="mt-2">
            <WissensOrdnerGrid
              ordner={unterordnerEintraege}
              hrefPraefix={`/wissen/${ordnerId}`}
              darfVerwalten={darfVerwalten}
              umbenennenAktion={unterordnerUmbenennen}
              aktivSetzenAktion={unterordnerAktivSetzen}
            />
          </div>
        </div>
      )}

      <div className="mt-8 rounded-xl border border-rand bg-flaeche p-4">
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
