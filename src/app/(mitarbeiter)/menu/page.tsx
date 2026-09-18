import Link from "next/link"

import { berechtigung } from "@/lib/auth/berechtigung"
import { abmelden } from "@/lib/auth/aktionen"
import { Kopfleiste } from "@/components/kopfleiste"
import { neuesteBenachrichtigungen, ungeleseneAnzahl } from "@/lib/benachrichtigungen/abfragen"
import { benachrichtigungenAlsGelesenMarkieren } from "@/lib/benachrichtigungen/aktionen"
import { formatiereDatumAusDate, zeitAusDate } from "@/lib/datum"

/**
 * Vollseiten-Menü für das Handy (Rückmeldung 2026-09-15, mobile
 * Fußleiste): fasst zusammen, was auf dem Desktop auf BenutzerMenu
 * (Profil/Einstellungen/Kontaktstelle/Ausloggen) und die
 * Benachrichtigungsglocke verteilt ist, ergänzt um Kontakte und
 * Wissensbereich — auf dem Handy gibt es dafür keinen Platz in einer
 * Kopfzeile, deshalb eine eigene Seite statt eines Ausklapp-Menüs, erreicht
 * über den "Menü"-Punkt der MobileTabBar. Auf Desktop-Breite ungenutzt
 * (dort bleiben BenutzerMenu + Glocke), aber unter derselben Route
 * trotzdem erreichbar, falls jemand den Link direkt öffnet.
 *
 * Der Adminbereich fehlt hier bewusst (Rückmeldung 2026-09-18): die
 * wenigen Berechtigten kommen über die Desktop-Variante des
 * BenutzerMenu dorthin, ein mobiler Einstieg ist nicht nötig.
 */
export default async function MenuSeite() {
  const kontext = await berechtigung()

  const [benachrichtigungenRoh, anzahlUngelesen] = await Promise.all([
    neuesteBenachrichtigungen(kontext.personId),
    ungeleseneAnzahl(kontext.personId),
  ])

  const benachrichtigungen = benachrichtigungenRoh.map((b) => ({
    id: b.id,
    text: b.text,
    link: b.link,
    zeitpunktAnzeige: `${formatiereDatumAusDate(b.erstelltAm)} · ${zeitAusDate(b.erstelltAm)}`,
    gelesen: b.gelesenAm !== null,
  }))

  return (
    <main className="mx-auto max-w-2xl px-5 py-10 pb-24">
      <Kopfleiste />
      <h1 className="text-center text-2xl font-semibold text-ueberschrift md:text-left">Menü</h1>

      <section className="mt-6 rounded-xl border border-rand bg-flaeche p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-ueberschrift">Benachrichtigungen</h2>
          {anzahlUngelesen > 0 && (
            <form action={benachrichtigungenAlsGelesenMarkieren}>
              <button type="submit" className="text-xs font-medium text-marke-gruen-dunkel hover:underline">
                Alle als gelesen markieren
              </button>
            </form>
          )}
        </div>

        {benachrichtigungen.length === 0 ? (
          <p className="mt-3 text-sm text-sekundaer">Noch keine Benachrichtigungen.</p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-flaeche-100">
            {benachrichtigungen.map((b) => {
              const inhalt = (
                <>
                  <p className={"text-sm " + (b.gelesen ? "text-primaer" : "font-medium text-ueberschrift")}>{b.text}</p>
                  <p className="mt-0.5 text-xs text-tertiaer">{b.zeitpunktAnzeige}</p>
                </>
              )
              return (
                <li key={b.id} className="py-2.5">
                  {b.link ? (
                    <Link href={b.link} className="block">
                      {inhalt}
                    </Link>
                  ) : (
                    inhalt
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <nav className="mt-4 flex flex-col overflow-hidden rounded-xl border border-rand bg-flaeche">
        <Link href="/profil" className="border-b border-rand px-4 py-3 text-sm text-primaer transition hover:bg-marke-gruen/5">
          Profil
        </Link>
        <Link href="/kontakte" className="border-b border-rand px-4 py-3 text-sm text-primaer transition hover:bg-marke-gruen/5">
          Kontakte
        </Link>
        <Link href="/wissen" className="border-b border-rand px-4 py-3 text-sm text-primaer transition hover:bg-marke-gruen/5">
          Wissen
        </Link>
        <Link
          href="/einstellungen"
          className="border-b border-rand px-4 py-3 text-sm text-primaer transition hover:bg-marke-gruen/5"
        >
          Einstellungen
        </Link>
        <span aria-disabled="true" title="Noch nicht verfügbar" className="border-b border-rand px-4 py-3 text-sm text-tertiaer">
          Kontaktstelle
        </span>
        <form action={abmelden}>
          <button type="submit" className="block w-full px-4 py-3 text-left text-sm text-primaer transition hover:bg-marke-gruen/5">
            Ausloggen
          </button>
        </form>
      </nav>
    </main>
  )
}
