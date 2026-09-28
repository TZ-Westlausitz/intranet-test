import Link from "next/link"

/**
 * Startseiten-Kachel "Wissensbereich" — aus src/app/page.tsx herausgelöst,
 * siehe KalenderKachel. Vorerst nur der einfache Link auf /wissen, wie
 * bisher; ein wählbarer Ordner-Schnellzugriff kommt erst in Schritt 2 des
 * Bausteins "Modulare Startseite" (siehe Memory
 * `modulare-startseite-baustein`).
 */
export function WissensbereichKachel({ className }: { className: string }) {
  return (
    <Link
      href="/wissen"
      className={`${className} flex flex-col justify-between rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-orange bg-flaeche p-4 shadow-sm transition hover:border-marke-orange focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen`}
    >
      <div>
        <h2 className="text-lg font-semibold text-ueberschrift">Wissensbereich</h2>
        <p className="mt-2 text-sm text-sekundaer">Wichtige Dokumente, abgestimmt auf die jeweilige Abteilung.</p>
      </div>
      <span className="text-sm font-semibold text-marke-gruen-dunkel">Zum Wissensbereich →</span>
    </Link>
  )
}
