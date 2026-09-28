import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import { FarbschemaSchalter } from "@/components/farbschema-schalter"
import { StartseiteRasterEinstellung } from "@/components/einstellungen/startseite-raster-einstellung"
import { parseRaster } from "@/lib/startseite/raster"
import { rasterAufStandardZuruecksetzen } from "@/lib/startseite/aktionen"

/**
 * Alle persönlichen Einstellungen auf einer Seite (Rückmeldung 2026-09-11:
 * bei nur zwei Punkten lohnen sich keine eigenen Unterseiten mehr) — vorher
 * eine Übersicht mit zwei Kacheln zu /einstellungen/nutzeroberflaeche und
 * /einstellungen/farbschema, beide Unterseiten sind seitdem entfernt.
 */
export default async function EinstellungenSeite() {
  const kontext = await berechtigung()

  const person = await prisma.person.findUniqueOrThrow({
    where: { benutzername: kontext.personId },
    select: { startseiteRaster: true },
  })
  const raster = parseRaster(person.startseiteRaster)

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
          <StartseiteRasterEinstellung raster={raster} />
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
