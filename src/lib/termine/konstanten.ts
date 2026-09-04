/**
 * Reine Konstanten ohne jede Server- oder Datenbank-Abhängigkeit — anders
 * als abfragen.ts (importiert `prisma`, zieht damit `pg`/Node-Module mit)
 * auch aus Client-Komponenten importierbar, z. B. um denselben Wert in
 * einer Anzeige-Meldung zu nennen.
 */

/** Höchstzahl Treffer einer Terminsuche — siehe termineSuchen in abfragen.ts. */
export const MAX_SUCHTREFFER = 50
