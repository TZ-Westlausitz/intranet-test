import Link from "next/link"

import { berechtigung } from "@/lib/auth/berechtigung"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import { darfFormulareVerwalten } from "@/lib/formulare/sichtbarkeit"
import { verfuegbareFormulare, meineEinreichungen, anMichAdressierteEinreichungen } from "@/lib/formulare/abfragen"

const STATUS_LABEL: Record<string, string> = { OFFEN: "Offen", IN_BEARBEITUNG: "In Bearbeitung", ERLEDIGT: "Erledigt" }
const STATUS_FARBE: Record<string, string> = {
  OFFEN: "bg-marke-orange/15 text-marke-grau",
  IN_BEARBEITUNG: "bg-marke-gruen/15 text-marke-grau",
  ERLEDIGT: "bg-neutral-200 text-neutral-600",
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
 * Person freigeschalteten Vorlagen, in der Mitte die eigenen
 * Einreichungen, rechts die an sie adressierten. Verwaltung (Vorlagen
 * anlegen/bearbeiten) ist ein eigener Bereich, nicht hier inline — bei
 * potenziell vielen Formularen passt eine Tabelle besser als ein
 * Kachel-"+"-Muster (siehe /formulare/verwalten).
 *
 * Ab Tablet/Desktop (`md:` aufwärts) dasselbe Kachel-Design wie die
 * Startseite (src/app/page.tsx) — weiße Karten mit farbigem oberen Rand
 * auf einem sanften Verlaufshintergrund, die Seite füllt genau die
 * verfügbare Höhe ohne eigenes Scrollen; nur die drei Listen scrollen für
 * sich (Muster: NewsfeedHomeKachel), damit auch ältere Einträge erreichbar
 * bleiben, wenn mehr reinkommen als auf einen Blick passen. Auf dem Handy
 * bleibt die einfache, seitenweit scrollende Liste von vorher.
 */
export default async function FormulareSeite() {
  const kontext = await berechtigung()
  const darfVerwalten = darfFormulareVerwalten(kontext)

  const [verfuegbar, meine, adressiert] = await Promise.all([
    verfuegbareFormulare(kontext),
    meineEinreichungen(kontext),
    anMichAdressierteEinreichungen(kontext),
  ])

  const kopfzeile = (
    <div className="flex shrink-0 items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold text-marke-grau">Formulare</h1>
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

  return (
    <>
      {/* Handy: einfache, seitenweit scrollende Liste. */}
      <main className="mx-auto max-w-2xl px-5 py-10 md:hidden">
        <Kopfleiste name={kontext.name} />
        {kopfzeile}

        <div className="mt-6 flex flex-col gap-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-marke-grau">Verfügbare Formulare</h2>
            {verfuegbar.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-500">Keine Formulare für dich freigeschaltet.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {verfuegbar.map((vorlage) => (
                  <li key={vorlage.id}>
                    <Link
                      href={`/formulare/${vorlage.id}`}
                      className="block rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700 transition hover:border-marke-gruen hover:text-marke-grau"
                    >
                      {vorlage.titel}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-marke-grau">Von mir ausgefüllt</h2>
            {meine.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-500">Noch nichts eingereicht.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {meine.map((einreichung) => (
                  <li key={einreichung.id}>
                    <Link
                      href={`/formulare/einreichungen/${einreichung.id}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700 transition hover:border-marke-gruen hover:text-marke-grau"
                    >
                      {einreichung.vorlage.titel}
                      <StatusChip status={einreichung.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-marke-grau">An mich adressiert</h2>
            {adressiert.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-500">Nichts an dich adressiert.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {adressiert.map((einreichung) => (
                  <li key={einreichung.id}>
                    <Link
                      href={`/formulare/einreichungen/${einreichung.id}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700 transition hover:border-marke-gruen hover:text-marke-grau"
                    >
                      <span>
                        {einreichung.vorlage.titel}
                        <span className="block text-xs text-neutral-400">
                          {einreichung.eingereichtVon.vorname} {einreichung.eingereichtVon.nachname}
                        </span>
                      </span>
                      <StatusChip status={einreichung.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <ZurueckButton />
      </main>

      {/* Tablet/Desktop: Kachel-Design wie die Startseite, volle Höhe. */}
      <main className="hidden h-full flex-col md:flex">
        <div className="flex flex-1 flex-col overflow-auto bg-gradient-to-br from-marke-gruen/5 via-white to-marke-orange/5 p-6">
          <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col">
            {kopfzeile}

            <div className="mt-6 grid min-h-0 flex-1 grid-cols-3 gap-6">
              <section className="flex min-h-0 flex-col rounded-2xl border border-x-neutral-200 border-b-neutral-200 border-t-4 border-t-marke-gruen bg-white p-4 shadow-sm">
                <h2 className="shrink-0 text-lg font-semibold text-marke-grau">Verfügbare Formulare</h2>
                {verfuegbar.length === 0 ? (
                  <p className="mt-2 text-sm text-neutral-500">Keine Formulare für dich freigeschaltet.</p>
                ) : (
                  <ul className="mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
                    {verfuegbar.map((vorlage) => (
                      <li key={vorlage.id}>
                        <Link
                          href={`/formulare/${vorlage.id}`}
                          className="block rounded-xl border border-neutral-200 px-3 py-2.5 text-sm text-neutral-700 transition hover:border-marke-gruen hover:text-marke-grau"
                        >
                          {vorlage.titel}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="flex min-h-0 flex-col rounded-2xl border border-x-neutral-200 border-b-neutral-200 border-t-4 border-t-marke-gruen-dunkel bg-white p-4 shadow-sm">
                <h2 className="shrink-0 text-lg font-semibold text-marke-grau">Von mir ausgefüllt</h2>
                {meine.length === 0 ? (
                  <p className="mt-2 text-sm text-neutral-500">Noch nichts eingereicht.</p>
                ) : (
                  <ul className="mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
                    {meine.map((einreichung) => (
                      <li key={einreichung.id}>
                        <Link
                          href={`/formulare/einreichungen/${einreichung.id}`}
                          className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 px-3 py-2.5 text-sm text-neutral-700 transition hover:border-marke-gruen-dunkel hover:text-marke-grau"
                        >
                          <span className="truncate">{einreichung.vorlage.titel}</span>
                          <StatusChip status={einreichung.status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="flex min-h-0 flex-col rounded-2xl border border-x-neutral-200 border-b-neutral-200 border-t-4 border-t-marke-orange bg-white p-4 shadow-sm">
                <h2 className="shrink-0 text-lg font-semibold text-marke-grau">An mich adressiert</h2>
                {adressiert.length === 0 ? (
                  <p className="mt-2 text-sm text-neutral-500">Nichts an dich adressiert.</p>
                ) : (
                  <ul className="mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
                    {adressiert.map((einreichung) => (
                      <li key={einreichung.id}>
                        <Link
                          href={`/formulare/einreichungen/${einreichung.id}`}
                          className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 px-3 py-2.5 text-sm text-neutral-700 transition hover:border-marke-orange hover:text-marke-grau"
                        >
                          <span className="min-w-0">
                            <span className="block truncate">{einreichung.vorlage.titel}</span>
                            <span className="block truncate text-xs text-neutral-400">
                              {einreichung.eingereichtVon.vorname} {einreichung.eingereichtVon.nachname}
                            </span>
                          </span>
                          <StatusChip status={einreichung.status} />
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
