import { STATUS_TEXT } from "@/lib/ausleihe-status"

/** Dezente Farbtönung passend zum Status — kein grelles Ampelsystem,
 * nur genug Unterschied, um den Zustand auf einen Blick zu erkennen. */
const FARBEN: Record<string, string> = {
  ANGEFRAGT: "bg-marke-orange/15 text-marke-grau",
  ZUGESAGT: "bg-marke-gruen/15 text-marke-grau",
  ABGELEHNT: "bg-red-100 text-red-700",
  STORNIERT: "bg-neutral-200 text-neutral-600",
}

export function StatusBadge({ status }: { status: string }) {
  const farbe = FARBEN[status] ?? "bg-neutral-200 text-neutral-600"

  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${farbe}`}>
      {STATUS_TEXT[status] ?? status}
    </span>
  )
}
