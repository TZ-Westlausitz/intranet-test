import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import { FarbschemaSchalter } from "@/components/farbschema-schalter"
import { StartseiteRasterEinstellung } from "@/components/einstellungen/startseite-raster-einstellung"
import { parseRaster } from "@/lib/startseite/raster"
import { rasterAufStandardZuruecksetzen } from "@/lib/startseite/aktionen"
import { personenAuswahlListe } from "@/lib/kontakte/abfragen"
import { ordnerUebersicht } from "@/lib/wissen/abfragen"

/**
 * Alle persönlichen Einstellungen auf einer Seite (Rückmeldung 2026-09-11:
 * bei nur zwei Punkten lohnen sich keine eigenen Unterseiten mehr) — vorher
 * eine Übersicht mit zwei Kacheln zu /einstellungen/nutzeroberflaeche und
 * /einstellungen/farbschema, beide Unterseiten sind seitdem entfernt.
 */
export default async function EinstellungenSeite() {
  const kontext = await berechtigung()

  const [person, personenListe, ordnerListe] = await Promise.all([
    prisma.person.findUniqueOrThrow({
      where: { benutzername: kontext.personId },
      select: { startseiteRaster: true },
    }),
    personenAuswahlListe(),
    ordnerUebersicht(),
  ])
  const raster = parseRaster(person.startseiteRaster)
  // Für PersonenAuswahl (Kontakte-Kachel) und den Ordner-Picker
  // (Wissensbereich-Kachel) — beide Baustein-Auswahlen brauchen nur Name
  // bzw. Name + Artikelzahl, nicht die volle Datensatzform.
  const personenFuerAuswahl = personenListe.map((p) => ({ id: p.benutzername, name: `${p.vorname} ${p.nachname}` }))
  const ordnerFuerAuswahl = ordnerListe.map((o) => ({ id: o.id, name: o.name, artikelAnzahl: o._count.artikel }))

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Kopfleiste />
      <h1 className="text-center text-2xl font-semibold text-ueberschrift md:text-left">Einstellungen</h1>

      <section className="mt-6 rounded-xl border border-rand bg-flaeche p-4">
        <h2 className="text-base font-semibold text-ueberschrift">Farbschema</h2>
        <p className="mt-1 text-sm text-sekundaer">Heller oder dunkler Hintergrund, geräteübergreifend.</p>

        <div className="mt-3">
          <FarbschemaSchalter aktivDunkel={kontext.farbschema === "DUNKEL"} />
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-rand bg-flaeche p-4">
        <h2 className="text-base font-semibold text-ueberschrift">Startseite</h2>
        <p className="mt-1 text-sm text-sekundaer">
          Baue dir deine Startseite um. Entscheide selbst, welche Felder du sehen möchtest und was für Inhalte für
          deinen Arbeitsalltag wichtig sind.
        </p>

        {/* Volle Kartenbreite statt einer schmalen Box (Rückmeldung
            2026-09-28: "skaliere das Modell...wie das Original") — bei
            max-w-xs war das Raster winzig und kaum als Abbild der echten,
            deutlich größeren Startseiten-Kacheln erkennbar. */}
        <div className="mt-3">
          <StartseiteRasterEinstellung raster={raster} personen={personenFuerAuswahl} ordnerListe={ordnerFuerAuswahl} />
        </div>

        <form action={rasterAufStandardZuruecksetzen} className="mt-3">
          <button
            type="submit"
            className="h-8 rounded-lg border border-rand px-2.5 text-xs font-medium text-primaer transition hover:bg-flaeche-100"
          >
            Auf Standard zurücksetzen
          </button>
        </form>
      </section>

      <ZurueckButton />
    </main>
  )
}
