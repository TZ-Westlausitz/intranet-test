import { formatiereDatumAusDate } from "@/lib/datum"
import { fristStatus, fristText, type FristStufe } from "@/lib/fuhrpark/fristen"

const STUFEN_KLASSE: Record<FristStufe, string> = {
  ueberfaellig: "bg-red-500/15 text-red-700 dark:text-red-400",
  bald: "bg-marke-orange/20 text-ueberschrift",
  ok: "bg-marke-gruen/15 text-marke-gruen-dunkel",
  offen: "bg-flaeche-100 text-tertiaer",
}

/**
 * Eine Frist (TÜV/Service) als kleines Etikett: Bezeichnung, Datum und wie
 * weit der Termin weg ist. Die Farbe ergänzt nur — der Text nennt Stufe und
 * Abstand immer auch in Worten (nicht nur als Farbe).
 */
export function FristAnzeige({ label, faelligAm, heute }: { label: string; faelligAm: Date | null; heute: Date }) {
  const status = fristStatus(faelligAm, heute)

  return (
    <span className={"inline-flex flex-wrap items-center gap-x-1.5 rounded-full px-2.5 py-1 text-xs font-medium " + STUFEN_KLASSE[status.stufe]}>
      <span className="font-semibold">{label}</span>
      {faelligAm && <span>{formatiereDatumAusDate(faelligAm)}</span>}
      <span className="opacity-80">· {fristText(status)}</span>
    </span>
  )
}
