import { useSyncExternalStore } from "react"

const ABFRAGE = "(pointer: coarse)"

function abonnieren(beiAenderung: () => void) {
  const medien = window.matchMedia(ABFRAGE)
  medien.addEventListener("change", beiAenderung)
  return () => medien.removeEventListener("change", beiAenderung)
}

/**
 * Ist das Hauptbediengerät ein Finger (Handy, Tablet) statt Maus? Dort
 * nutzen Datumsfelder die Auswahl des Geräts. Auf dem Server und beim ersten
 * Rendern `false`; die Anzeige selbst schaltet CSS (`pointer-coarse:`), dieser
 * Wert steuert nur, welches der beiden Eingabefelder die Prüfmeldung trägt.
 */
export function useIstTouch(): boolean {
  return useSyncExternalStore(
    abonnieren,
    () => window.matchMedia(ABFRAGE).matches,
    () => false,
  )
}
