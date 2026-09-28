import Link from "next/link"

type EinreichungVorschau = { id: string; vorlage: { titel: string } }
type VerfuegbareVorlage = { id: string; titel: string }

/**
 * Startseiten-Kachel "Formulare" — zeigt bewusst den STAND statt eines
 * Katalogs verfügbarer Vorlagen (die gibt es schon einen Klick entfernt
 * über die Kopfzeile): eigene noch nicht erledigte Einreichungen + an die
 * Person adressierte, noch offene Einreichungen. Eine Dashboard-Kachel
 * lohnt sich eher, wenn sie zeigt, was sich verändert hat, als als
 * zweiter Link zum selben Ziel.
 *
 * Bei der Form GROSS (Rückmeldung 2026-09-28) kommt eine zweite Hälfte
 * dazu: ein Schnellzugriff auf die für die Person verfügbaren Vorlagen
 * zum direkten Ausfüllen — dafür ist die Kachel dann kein einzelner
 * `<Link>` mehr (Muster: WissensbereichKachel mit Ordnern), sondern nur
 * die Kopfzeile verlinkt auf /formulare, jede Vorlage im Schnellzugriff
 * verlinkt für sich.
 */
export function FormulareKachel({
  className,
  gross,
  eigeneOffen,
  adressiertOffen,
  verfuegbar = [],
}: {
  className: string
  gross: boolean
  eigeneOffen: EinreichungVorschau[]
  adressiertOffen: EinreichungVorschau[]
  verfuegbar?: VerfuegbareVorlage[]
}) {
  const gesamtOffen = eigeneOffen.length + adressiertOffen.length

  const standInhalt =
    gesamtOffen === 0 ? (
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
    )

  if (!gross) {
    return (
      <Link
        href="/formulare"
        className={`${className} flex flex-col rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-gruen-dunkel bg-flaeche p-4 shadow-sm transition hover:border-marke-gruen-dunkel focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen`}
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
        {standInhalt}
      </Link>
    )
  }

  return (
    <div
      className={`${className} flex flex-col overflow-hidden rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-gruen-dunkel bg-flaeche p-4 shadow-sm transition hover:border-marke-gruen-dunkel`}
    >
      <Link
        href="/formulare"
        className="flex shrink-0 items-center justify-between gap-1.5 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
      >
        <h2 className="text-lg font-semibold text-ueberschrift hover:underline">Formulare</h2>
        {gesamtOffen > 0 && (
          <span
            aria-label={`${gesamtOffen} offene Formulare`}
            className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-marke-orange px-1 text-xs font-bold text-neutral-900"
          >
            {gesamtOffen}
          </span>
        )}
      </Link>

      <div className="grid min-h-0 flex-1 grid-rows-2 gap-3">
        <div className="min-h-0 overflow-hidden">{standInhalt}</div>

        <div className="min-h-0 border-t border-flaeche-100 pt-2">
          <h3 className="text-[11px] font-semibold tracking-wide text-sekundaer uppercase">Verfügbare Formulare</h3>
          {verfuegbar.length === 0 ? (
            <p className="mt-1 text-xs text-sekundaer">Keine Formulare für dich freigeschaltet.</p>
          ) : (
            <ul className="mt-1 flex min-h-0 flex-col gap-1 overflow-y-auto">
              {verfuegbar.map((vorlage) => (
                <li key={vorlage.id}>
                  <Link
                    href={`/formulare/${vorlage.id}`}
                    className="block truncate text-xs text-marke-gruen-dunkel hover:underline"
                  >
                    {vorlage.titel}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
