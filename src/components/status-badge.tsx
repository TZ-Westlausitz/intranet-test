import { STATUS_TEXT } from "@/lib/ausleihe-status"

/** Dezente Farbtönung passend zum Status — kein grelles Ampelsystem,
 * nur genug Unterschied, um den Zustand auf einen Blick zu erkennen. */
const FARBEN: Record<string, string> = {
  ANGEFRAGT: "bg-marke-orange/15 text-ueberschrift",
  ZUGESAGT: "bg-marke-gruen/15 text-ueberschrift",
  ABGELEHNT: "bg-red-100 text-red-700",
  STORNIERT: "bg-flaeche-200 text-primaer",
}

export function StatusBadge({ status }: { status: string }) {
  const farbe = FARBEN[status] ?? "bg-flaeche-200 text-primaer"

  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${farbe}`}>
      {STATUS_TEXT[status] ?? status}
    </span>
  )
}
