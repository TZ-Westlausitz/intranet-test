import Link from "next/link"

import { modulAkzentKlassen } from "@/lib/startseite/raster"

type EinreichungVorschau = { id: string; vorlage: { titel: string } }
type VorlagenShortcut = { id: string; titel: string }

/**
 * Startseiten-Kachel "Formulare" — zeigt bewusst den STAND statt eines
 * Katalogs verfügbarer Vorlagen (die gibt es schon einen Klick entfernt
 * über die Kopfzeile): eigene noch nicht erledigte Einreichungen + an die
 * Person adressierte, noch offene Einreichungen. Eine Dashboard-Kachel
 * lohnt sich eher, wenn sie zeigt, was sich verändert hat, als als
 * zweiter Link zum selben Ziel.
 *
 * Bei der Form BREIT (Rückmeldung 2026-09-28) teilt sich die Kachel
 * INNERHALB eines einzigen, durchgehenden Rahmens (Rückmeldung danach:
 * "optisch als EIN breites Kästchen") in zwei Hälften: links wie gehabt
 * der Stand (verlinkt auf /formulare), rechts ein Schnellzugriff auf bis
 * zu 5 selbst gewählte Vorlagen als kleine Buttons — jede für sich
 * verlinkt direkt zum Ausfüllen. Nur eine dünne Trennlinie zwischen
 * beiden, keine zwei eigenständigen Karten. Bei KLEIN bleibt es beim
 * reinen Stand ohne Aufteilung.
 */
export function FormulareKachel({
  className,
  breit,
  eigeneOffen,
  adressiertOffen,
  shortcuts,
}: {
  className: string
  breit: boolean
  eigeneOffen: EinreichungVorschau[]
  adressiertOffen: EinreichungVorschau[]
  shortcuts?: VorlagenShortcut[]
}) {
  const gesamtOffen = eigeneOffen.length + adressiertOffen.length

  if (!breit) {
    return (
      <div
        className={`${className} flex flex-col rounded-2xl border border-x-rand border-b-rand border-t-4 ${modulAkzentKlassen("FORMULARE")} bg-flaeche p-4 shadow-sm transition`}
      >
        <Link
          href="/formulare"
          className="flex flex-1 flex-col rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
        >
          <div className="flex items-center justify-between gap-1.5">
            <h2 className="text-lg font-semibold text-ueberschrift hover:underline">Formulare</h2>
            {gesamtOffen > 0 && (
              <span
                aria-label={`${gesamtOffen} offene Formulare`}
                className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-marke-orange px-1 text-xs font-bold text-neutral-900"
              >
                {gesamtOffen}
              </span>
            )}
          </div>
          {gesamtOffen === 0 ? (
            <p className="mt-2 text-xs text-sekundaer">Alles erledigt</p>
          ) : (
            <div className="mt-2 flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
              {eigeneOffen.length > 0 && (
                <div className="flex items-center justify-between text-xs text-primaer">
                  <span>Eigene offen</span>
                  <span className="font-medium">{eigeneOffen.length}</span>
                </div>
              )}
              {adressiertOffen.length > 0 && (
                <div className="flex items-center justify-between text-xs text-primaer">
                  <span>An mich adressiert</span>
                  <span className="font-medium">{adressiertOffen.length}</span>
                </div>
              )}
              <ul className="mt-1 flex flex-col gap-1">
                {[...adressiertOffen, ...eigeneOffen].slice(0, 3).map((einreichung) => (
                  <li key={einreichung.id} className="truncate text-xs text-sekundaer">
                    {einreichung.vorlage.titel}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Link>
      </div>
    )
  }

  return (
    <div
      className={`${className} flex flex-col rounded-2xl border border-x-rand border-b-rand border-t-4 ${modulAkzentKlassen("FORMULARE")} bg-flaeche p-4 shadow-sm transition`}
    >
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-4">
        {/* Linke Hälfte: der Stand, verlinkt auf /formulare. Keine eigene
            Karte (kein Rahmen/Schatten) — nur eine Trennlinie zur rechten
            Hälfte, damit die ganze Kachel optisch EIN breites Kästchen
            bleibt (Rückmeldung 2026-09-28). */}
        <Link
          href="/formulare"
          className="flex min-h-0 flex-col rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
        >
          <div className="flex items-center justify-between gap-1.5">
            <h2 className="text-lg font-semibold text-ueberschrift hover:underline">Formulare</h2>
            {gesamtOffen > 0 && (
              <span
                aria-label={`${gesamtOffen} offene Formulare`}
                className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-marke-orange px-1 text-xs font-bold text-neutral-900"
              >
                {gesamtOffen}
              </span>
            )}
          </div>

          {gesamtOffen === 0 ? (
            <p className="mt-2 text-xs text-sekundaer">Alles erledigt</p>
          ) : (
            <div className="mt-2 flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
              {eigeneOffen.length > 0 && (
                <div className="flex items-center justify-between text-xs text-primaer">
                  <span>Eigene offen</span>
                  <span className="font-medium">{eigeneOffen.length}</span>
                </div>
              )}
              {adressiertOffen.length > 0 && (
                <div className="flex items-center justify-between text-xs text-primaer">
                  <span>An mich adressiert</span>
                  <span className="font-medium">{adressiertOffen.length}</span>
                </div>
              )}
            </div>
          )}
        </Link>

        {/* Rechte Hälfte: Schnellzugriff, nur per border-l abgetrennt. */}
        <div className="flex min-h-0 flex-col border-l border-flaeche-100 pl-4">
          <h3 className="text-sm font-semibold text-ueberschrift">Schnellzugriff</h3>
          {!shortcuts || shortcuts.length === 0 ? (
            <p className="mt-2 text-xs text-sekundaer">Keine Formulare ausgewählt.</p>
          ) : (
            <div className="mt-2 flex min-h-0 flex-1 flex-row flex-wrap content-start gap-1.5 overflow-y-auto">
              {shortcuts.map((vorlage) => (
                <Link
                  key={vorlage.id}
                  href={`/formulare/${vorlage.id}`}
                  className="max-w-full truncate rounded-full border border-rand px-2.5 py-1 text-xs font-medium text-primaer transition hover:border-marke-gruen-dunkel hover:text-marke-gruen-dunkel"
                >
                  {vorlage.titel}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
