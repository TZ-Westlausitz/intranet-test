import { datumIsoAusDate } from "@/lib/datum"

export type AuftragStandardwerte = {
  titel: string
  beschreibung: string
  zugewiesenAnIds: string[]
  faelligAm: string | null
  prioritaet: string
  geplantAm: string | null
  /** Checkliste: vorhandene Punkte (mit ID, damit ihr Abhak-Stand beim Speichern erhalten bleibt). */
  checkpunkte: { id: string; text: string }[]
}

export const LEERER_AUFTRAG_STANDARDWERTE: AuftragStandardwerte = {
  titel: "",
  beschreibung: "",
  zugewiesenAnIds: [],
  faelligAm: null,
  prioritaet: "MITTEL",
  geplantAm: null,
  checkpunkte: [],
}

/** Wandelt einen geladenen Entwurf (siehe eigeneAuftragEntwuerfe) in AuftragStandardwerte — Muster infoZuStandardwerte. */
export function auftragZuStandardwerte(entwurf: {
  titel: string
  beschreibung: string | null
  empfaenger?: { personId: string }[]
  faelligAm: Date | null
  prioritaet: string
  geplantAm: Date | null
  checkpunkte?: { id: string; text: string }[]
}): AuftragStandardwerte {
  return {
    titel: entwurf.titel,
    beschreibung: entwurf.beschreibung ?? "",
    zugewiesenAnIds: entwurf.empfaenger?.map((e) => e.personId) ?? [],
    faelligAm: entwurf.faelligAm ? datumIsoAusDate(entwurf.faelligAm) : null,
    prioritaet: entwurf.prioritaet,
    geplantAm: entwurf.geplantAm ? datumIsoAusDate(entwurf.geplantAm) : null,
    checkpunkte: entwurf.checkpunkte?.map((punkt) => ({ id: punkt.id, text: punkt.text })) ?? [],
  }
}
