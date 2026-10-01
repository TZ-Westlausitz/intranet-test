import Link from "next/link"

import { berechtigung } from "@/lib/auth/berechtigung"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import { darfFormulareVerwalten } from "@/lib/formulare/sichtbarkeit"
import { verfuegbareFormulare, offeneUndErledigteEinreichungen } from "@/lib/formulare/abfragen"

const ANSICHTEN = [
  { key: "formulare", label: "Formulare" },
  { key: "offen", label: "Offen" },
  { key: "erledigt", label: "Erledigt" },
] as const
type Ansicht = (typeof ANSICHTEN)[number]["key"]

const STATUS_LABEL: Record<string, string> = { OFFEN: "Offen", IN_BEARBEITUNG: "In Bearbeitung", ERLEDIGT: "Erledigt" }
const STATUS_FARBE: Record<string, string> = {
  OFFEN: "bg-marke-orange/15 text-ueberschrift",
  IN_BEARBEITUNG: "bg-marke-gruen/15 text-ueberschrift",
  ERLEDIGT: "bg-flaeche-200 text-primaer",
}

function StatusChip({ status }: { status: string }) {
  return (
    <span className={"shrink-0 rounded-full px-2 py-0.5 text-xs font-medium " + STATUS_FARBE[status]}>
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

/**
 * Einstieg in den Formulare-Baustein — drei Spalten: links die für die
 * Person freigeschalteten Vorlagen, in der Mitte alle noch offenen
 * Einreichungen (eigene wie an die Person adressierte zusammen, Status
 * entscheidet die Spalte statt der Richtung), rechts alle erledigten
 * (Rückmeldung 2026-10-01). Im Admin-Modus zeigen "Offen"/"Erledigt" alle
 * Einreichungen der Firma statt nur der eigenen/adressierten
 * (Rückmeldung 2026-10-01, Muster: alleOffenenAuftraege in
 * aufgaben/page.tsx). Verwaltung (Vorlagen anlegen/bearbeiten) ist ein
 * eigener Bereich, nicht hier inline — bei potenziell vielen Formularen
 * passt eine Tabelle besser als ein Kachel-"+"-Muster (siehe
 * /formulare/verwalten).
 *
 * Ab Tablet/Desktop (`md:` aufwärts) dasselbe Kachel-Design wie die
 * Startseite (src/app/page.tsx) — weiße Karten mit farbigem oberen Rand
 * auf einem sanften Verlaufshintergrund, die Seite füllt genau die
 * verfügbare Höhe ohne eigenes Scrollen; nur die drei Listen scrollen für
 * sich (Muster: NewsfeedHomeKachel), damit auch ältere Einträge erreichbar
 * bleiben, wenn mehr reinkommen als auf einen Blick passen.
 *
 * Auf dem Handy (Rückmeldung 2026-10-01, Vorbild app.ueberblick.io)
 * untereinander statt nebeneinander wird bei vielen Einträgen schnell
 * unübersichtlich — deshalb dort ein Tab-Umschalter über `?ansicht=`
 * (Server Component, kein eigener Client-State nötig: der Link ändert
 * nur den Suchparameter derselben Route) statt dreier gestapelter Karten.
 */
export default async function FormulareSeite({ searchParams }: { searchParams: Promise<{ ansicht?: string }> }) {
  const kontext = await berechtigung()
  const darfVerwalten = darfFormulareVerwalten(kontext)
  const { ansicht: ansichtParam } = await searchParams
  const ansicht: Ansicht = ansichtParam === "formulare" || ansichtParam === "erledigt" ? ansichtParam : "offen"

  const [verfuegbar, { offen, erledigt }] = await Promise.all([
    verfuegbareFormulare(kontext),
    offeneUndErledigteEinreichungen(kontext, kontext.adminModusAktiv),
  ])

  const firmenzusatz = kontext.adminModusAktiv ? " (Firma)" : ""

  const kopfzeile = (
    <div className="flex shrink-0 items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold text-ueberschrift">Formulare</h1>
      {darfVerwalten && (
        <Link
          href="/formulare/verwalten"
          className="flex h-9 items-center justify-center rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
        >
          Formulare verwalten
        </Link>
      )}
    </div>
  )

  const ansichtAkzent: Record<Ansicht, string> = {
    formulare: "border-t-marke-gruen",
    offen: "border-t-marke-orange",
    erledigt: "border-t-marke-gruen",
  }

  const ansichtInhalt = (
    <div className={"rounded-xl border border-x-rand border-b-rand border-t-4 bg-flaeche p-4 " + ansichtAkzent[ansicht]}>
      {ansicht === "formulare" && (
        <>
          <h2 className="text-sm font-semibold text-ueberschrift">Verfügbare Formulare</h2>
          {verfuegbar.length === 0 ? (
            <p className="mt-3 text-sm text-sekundaer">Keine Formulare für dich freigeschaltet.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {verfuegbar.map((vorlage) => (
                <li key={vorlage.id}>
                  <Link
                    href={`/formulare/${vorlage.id}`}
                    className="block rounded-lg border border-rand px-3 py-2 text-sm text-primaer transition hover:border-marke-gruen hover:text-ueberschrift"
                  >
                    {vorlage.titel}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {ansicht === "offen" && (
        <>
          <h2 className="text-sm font-semibold text-ueberschrift">Offene Formulare{firmenzusatz}</h2>
          {offen.length === 0 ? (
            <p className="mt-3 text-sm text-sekundaer">Nichts offen.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {offen.map((einreichung) => (
                <li key={einreichung.id}>
                  <Link
                    href={`/formulare/einreichungen/${einreichung.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-rand px-3 py-2 text-sm text-primaer transition hover:border-marke-orange hover:text-ueberschrift"
                  >
                    <span>
                      {einreichung.vorlage.titel}
                      <span className="block text-xs text-tertiaer">
                        {einreichung.vonMir ? "Von dir" : `${einreichung.eingereichtVon.vorname} ${einreichung.eingereichtVon.nachname}`}
                      </span>
                    </span>
                    <StatusChip status={einreichung.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {ansicht === "erledigt" && (
        <>
          <h2 className="text-sm font-semibold text-ueberschrift">Erledigt{firmenzusatz}</h2>
          {erledigt.length === 0 ? (
            <p className="mt-3 text-sm text-sekundaer">Noch nichts erledigt.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {erledigt.map((einreichung) => (
                <li key={einreichung.id}>
                  <Link
                    href={`/formulare/einreichungen/${einreichung.id}`}
                    className="block rounded-lg border border-rand px-3 py-2 text-sm text-primaer transition hover:border-marke-gruen hover:text-ueberschrift"
                  >
                    {einreichung.vorlage.titel}
                    <span className="block text-xs text-tertiaer">
                      {einreichung.vonMir ? "Von dir" : `${einreichung.eingereichtVon.vorname} ${einreichung.eingereichtVon.nachname}`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )

  return (
    <>
      {/* Handy: Tab-Umschalter + eine seitenweit scrollende Liste je Ansicht. */}
      <main className="mx-auto max-w-2xl px-5 py-10 md:hidden">
        <Kopfleiste />
        {kopfzeile}

        <nav aria-label="Ansicht wählen" className="mt-6 flex border-b border-rand text-sm font-medium">
          {ANSICHTEN.map((tab) => (
            <Link
              key={tab.key}
              href={`/formulare?ansicht=${tab.key}`}
              aria-current={ansicht === tab.key ? "page" : undefined}
              className={
                "flex-1 border-b-2 px-2 py-3 text-center transition " +
                (ansicht === tab.key ? "border-marke-gruen-dunkel text-ueberschrift" : "border-transparent text-tertiaer hover:text-primaer")
              }
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        <div className="mt-4">{ansichtInhalt}</div>

        <ZurueckButton />
      </main>

      {/* Tablet/Desktop: Kachel-Design wie die Startseite, volle Höhe. */}
      <main className="hidden h-full flex-col md:flex">
        <div className="flex flex-1 flex-col overflow-auto bg-gradient-to-br from-marke-gruen/5 via-background to-marke-orange/5 p-6">
          <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col">
            {kopfzeile}

            <div className="mt-6 grid min-h-0 flex-1 grid-cols-3 gap-6">
              <section className="flex min-h-0 flex-col rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-gruen bg-flaeche p-4 shadow-sm">
                <h2 className="shrink-0 text-lg font-semibold text-ueberschrift">Verfügbare Formulare</h2>
                {verfuegbar.length === 0 ? (
                  <p className="mt-2 text-sm text-sekundaer">Keine Formulare für dich freigeschaltet.</p>
                ) : (
                  <ul className="mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
                    {verfuegbar.map((vorlage) => (
                      <li key={vorlage.id}>
                        <Link
                          href={`/formulare/${vorlage.id}`}
                          className="block rounded-xl border border-rand px-3 py-2.5 text-sm text-primaer transition hover:border-marke-gruen hover:text-ueberschrift"
                        >
                          {vorlage.titel}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="flex min-h-0 flex-col rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-orange bg-flaeche p-4 shadow-sm">
                <h2 className="shrink-0 text-lg font-semibold text-ueberschrift">Offene Formulare{firmenzusatz}</h2>
                {offen.length === 0 ? (
                  <p className="mt-2 text-sm text-sekundaer">Nichts offen.</p>
                ) : (
                  <ul className="mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
                    {offen.map((einreichung) => (
                      <li key={einreichung.id}>
                        <Link
                          href={`/formulare/einreichungen/${einreichung.id}`}
                          className="flex items-center justify-between gap-2 rounded-xl border border-rand px-3 py-2.5 text-sm text-primaer transition hover:border-marke-orange hover:text-ueberschrift"
                        >
                          <span className="min-w-0">
                            <span className="block truncate">{einreichung.vorlage.titel}</span>
                            <span className="block truncate text-xs text-tertiaer">
                              {einreichung.vonMir ? "Von dir" : `${einreichung.eingereichtVon.vorname} ${einreichung.eingereichtVon.nachname}`}
                            </span>
                          </span>
                          <StatusChip status={einreichung.status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="flex min-h-0 flex-col rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-gruen bg-flaeche p-4 shadow-sm">
                <h2 className="shrink-0 text-lg font-semibold text-ueberschrift">Erledigt{firmenzusatz}</h2>
                {erledigt.length === 0 ? (
                  <p className="mt-2 text-sm text-sekundaer">Noch nichts erledigt.</p>
                ) : (
                  <ul className="mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
                    {erledigt.map((einreichung) => (
                      <li key={einreichung.id}>
                        <Link
                          href={`/formulare/einreichungen/${einreichung.id}`}
                          className="flex items-center justify-between gap-2 rounded-xl border border-rand px-3 py-2.5 text-sm text-primaer transition hover:border-marke-gruen hover:text-ueberschrift"
                        >
                          <span className="min-w-0">
                            <span className="block truncate">{einreichung.vorlage.titel}</span>
                            <span className="block truncate text-xs text-tertiaer">
                              {einreichung.vonMir ? "Von dir" : `${einreichung.eingereichtVon.vorname} ${einreichung.eingereichtVon.nachname}`}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
