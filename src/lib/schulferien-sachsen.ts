/**
 * Schulferien Sachsen — anders als Feiertage NICHT berechenbar: Die Termine
 * werden vom Sächsischen Staatsministerium für Kultus per Verordnung
 * festgelegt und nur einige Jahre im Voraus veröffentlicht. Diese Liste ist
 * deshalb eine Datentabelle, keine Formel, und muss von Hand ergänzt
 * werden, sobald weitere Schuljahre veröffentlicht sind.
 *
 * Quelle: https://www.schule.sachsen.de/schuljahrestermine-4793.html
 * (Stand: Schuljahre 2025/2026 bis 2027/2028, abgerufen 2026-08-31).
 * Jeweils erster und letzter Ferientag, beide Enden eingeschlossen.
 */
export const SCHULFERIEN_SACHSEN: { von: string; bis: string; name: string }[] = [
  // Schuljahr 2025/2026 — auf der Quellseite nur noch die Sommerferien gelistet,
  // der Rest des Schuljahres liegt bereits in der Vergangenheit.
  { von: "2026-07-04", bis: "2026-08-14", name: "Sommerferien" },

  // Schuljahr 2026/2027
  { von: "2026-10-12", bis: "2026-10-24", name: "Herbstferien" },
  { von: "2026-12-23", bis: "2027-01-02", name: "Weihnachtsferien" },
  { von: "2027-02-08", bis: "2027-02-19", name: "Winterferien" },
  { von: "2027-03-26", bis: "2027-04-02", name: "Osterferien" },
  { von: "2027-05-15", bis: "2027-05-18", name: "Pfingstferien" },
  { von: "2027-07-10", bis: "2027-08-20", name: "Sommerferien" },

  // Schuljahr 2027/2028
  { von: "2027-10-11", bis: "2027-10-23", name: "Herbstferien" },
  { von: "2027-12-23", bis: "2028-01-01", name: "Weihnachtsferien" },
  { von: "2028-02-14", bis: "2028-02-26", name: "Winterferien" },
  { von: "2028-04-14", bis: "2028-04-22", name: "Osterferien" },
  { von: "2028-07-22", bis: "2028-09-01", name: "Sommerferien" },
]

function alsSchluessel(datum: Date): string {
  return `${datum.getFullYear()}-${String(datum.getMonth() + 1).padStart(2, "0")}-${String(
    datum.getDate(),
  ).padStart(2, "0")}`
}

/** Name des Ferienabschnitts für ein Datum, sofern es in einen fällt. */
export function schulferienFuer(datum: Date): string | null {
  const schluessel = alsSchluessel(datum)
  const treffer = SCHULFERIEN_SACHSEN.find((f) => schluessel >= f.von && schluessel <= f.bis)
  return treffer?.name ?? null
}
