/** Cent-Betrag menschenlesbar formatiert, z. B. 18000 → "180,00 €". Regel: Geldbeträge immer als Int in Cent, nur bei der Anzeige umgerechnet. */
export function formatiereCentAlsEuro(cent: number): string {
  return `${(cent / 100).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}
