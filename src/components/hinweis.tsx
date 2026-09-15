/**
 * Einheitlicher Hinweis-Kasten für Validierungsfehler und ähnliche Meldungen.
 *
 * Bewusst dunkler Text auf orangem Tönungshintergrund statt orangem Text:
 * Die Firmenfarbe Orange (#F6A841) hat auf Weiß als reiner Textfarbe zu
 * wenig Kontrast (WCAG-Kontrastverhältnis unter 2:1). Als Hintergrundtönung
 * mit dunklem Text bleibt sie erkennbar UND lesbar.
 */
export function Hinweis({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-marke-orange/40 bg-marke-orange/10 px-3 py-2 text-sm text-ueberschrift"
    >
      {children}
    </p>
  )
}
