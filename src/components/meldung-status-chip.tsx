import { MELDUNG_STATUS_LABEL, MELDUNG_STATUS_FARBE } from "@/lib/kontaktstelle/status"

/** Reine Anzeige, kein Bedienelement — für Listen und die Melder-Sicht (Regel: nur die Kontaktstelle ändert den Status). */
export function MeldungStatusChip({ status }: { status: string }) {
  return (
    <span className={"shrink-0 rounded-full px-2 py-0.5 text-xs font-medium " + (MELDUNG_STATUS_FARBE[status] ?? "")}>
      {MELDUNG_STATUS_LABEL[status] ?? status}
    </span>
  )
}
