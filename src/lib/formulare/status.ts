import { FormularEinreichungStatus } from "@/generated/prisma/enums"

/** Reihenfolge für den Schieberegler (Muster: MELDUNG_STATUS_REIHENFOLGE) — von "neu" nach "erledigt". */
export const FORMULAR_STATUS_REIHENFOLGE = [
  FormularEinreichungStatus.OFFEN,
  FormularEinreichungStatus.IN_BEARBEITUNG,
  FormularEinreichungStatus.ERLEDIGT,
] as const

export const FORMULAR_STATUS_LABEL: Record<string, string> = {
  OFFEN: "Offen",
  IN_BEARBEITUNG: "In Bearbeitung",
  ERLEDIGT: "Erledigt",
}
