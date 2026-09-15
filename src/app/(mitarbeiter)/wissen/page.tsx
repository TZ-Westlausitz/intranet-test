import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import { OrdnerErstellenDialog } from "@/components/ordner-erstellen-dialog"
import { WissensOrdnerGrid } from "@/components/wissens-ordner-grid"
import { ArtikelListe } from "@/components/artikel-liste"
import type { ArtikelFormularOptionen } from "@/components/artikel-form-felder"
import { ordnerUebersicht, zuletztBearbeiteteArtikel } from "@/lib/wissen/abfragen"
import { darfWissenVerwalten } from "@/lib/wissen/sichtbarkeit"
import {
  ordnerErstellen,
  ordnerUmbenennen,
  ordnerAktivSetzen,
  artikelAktualisieren,
  artikelAnhangLoeschen,
  artikelLoeschen,
  artikelDetailLaden,
} from "@/lib/wissen/aktionen"

const ZULETZT_BEARBEITET_ANZAHL = 8

/**
 * Einstieg in den Wissensbereich — Ordner-Grid mit Suchfeld, darunter eine
 * flache "Zuletzt bearbeitet"-Liste über alle Ordner hinweg (Vorbild:
 * Altsystem "Überblick", Screenshot vom 2026-09-08). Ordner selbst sind
 * für jede angemeldete Person sichtbar; nur die Artikel darin werden nach
 * Empfänger gefiltert (siehe wissenSichtbarFuer). Anlegen/Verwalten von
 * Ordnern nur bei der Berechtigung "Wissensmanager" (darfVerwalten) —
 * inline hier statt in einer separaten /admin-Seite, siehe Kontext im Plan.
 */
export default async function WissenSeite() {
  const kontext = await berechtigung()
  const darfVerwalten = darfWissenVerwalten(kontext)

  const [ordnerRoh, zuletztBearbeitet, personen, gruppen, abteilungen] = await Promise.all([
    ordnerUebersicht(),
    zuletztBearbeiteteArtikel(kontext, ZULETZT_BEARBEITET_ANZAHL),
    prisma.person.findMany({
      where: { aktiv: true, benutzername: { not: kontext.personId } },
      orderBy: [{ nachname: "asc" }, { vorname: "asc" }],
      select: { benutzername: true, vorname: true, nachname: true },
    }),
    prisma.gruppe.findMany({ where: { aktiv: true }, orderBy: { name: "asc" } }),
    prisma.abteilung.findMany({ where: { aktiv: true }, orderBy: { name: "asc" } }),
  ])

  const optionen: ArtikelFormularOptionen = {
    personen: personen.map((p) => ({ id: p.benutzername, name: `${p.vorname} ${p.nachname}` })),
    gruppen: gruppen.map((g) => ({ id: g.id, name: g.name })),
    abteilungen: abteilungen.map((a) => ({ id: a.id, name: a.name })),
  }

  const ordner = ordnerRoh.map((o) => ({
    id: o.id,
    name: o.name,
    aktiv: o.aktiv,
    artikelAnzahl: o._count.artikel,
  }))

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Kopfleiste name={kontext.name} />
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-ueberschrift">Wissen</h1>
        {darfVerwalten && (
          <OrdnerErstellenDialog label="+ Ordner" titel="Neuer Ordner" erstellenAktion={ordnerErstellen} />
        )}
      </div>

      {ordner.length === 0 ? (
        <p className="mt-6 text-sm text-sekundaer">Noch keine Ordner angelegt.</p>
      ) : (
        <div className="mt-6">
          <WissensOrdnerGrid
            ordner={ordner}
            hrefPraefix="/wissen"
            darfVerwalten={darfVerwalten}
            umbenennenAktion={ordnerUmbenennen}
            aktivSetzenAktion={ordnerAktivSetzen}
          />
        </div>
      )}

      <div className="mt-8 rounded-xl border border-rand bg-flaeche p-4">
        <h2 className="text-sm font-semibold text-ueberschrift">Zuletzt bearbeitet</h2>
        <ArtikelListe
          artikel={zuletztBearbeitet}
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
