/**
 * Fortschrittsbalken "x von y bestätigt" für Newsfeed-Beiträge mit
 * Bestätigung (Rückmeldung 2026-10-05: statt nur Text). Reine Anzeige, daher
 * ohne "use client" in Server- und Client-Komponenten nutzbar. Der Text steht
 * zusätzlich zum Balken da, damit der Stand nicht nur an der Farbe hängt;
 * voll = alle haben bestätigt (dann kräftiges Grün mit Haken-Text).
 */
export function BestaetigungsLeiste({
  bestaetigt,
  gesamt,
  className = "",
}: {
  bestaetigt: number
  gesamt: number
  className?: string
}) {
  if (gesamt <= 0) return null
  const anteil = Math.min(100, Math.round((bestaetigt / gesamt) * 100))
  const vollstaendig = bestaetigt >= gesamt

  return (
    <div className={`min-w-0 ${className}`}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={gesamt}
        aria-valuenow={bestaetigt}
        aria-label={`${bestaetigt} von ${gesamt} bestätigt`}
        className="h-1.5 w-full overflow-hidden rounded-full bg-flaeche-200"
      >
        <div
          className={"h-full rounded-full transition-[width] " + (vollstaendig ? "bg-marke-gruen-dunkel" : "bg-marke-gruen")}
          style={{ width: `${anteil}%` }}
        />
      </div>
      <p className="mt-0.5 text-[11px] text-tertiaer">
        {bestaetigt} von {gesamt} bestätigt
      </p>
    </div>
  )
}
