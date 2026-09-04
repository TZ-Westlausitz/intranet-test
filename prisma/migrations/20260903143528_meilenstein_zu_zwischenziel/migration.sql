-- "Meilenstein" heißt jetzt überall "Zwischenziel" (Modell, Spalte,
-- Indizes, Constraints) — reines Umbenennen statt Drop+Create, damit
-- bestehende Zeilen erhalten bleiben.
ALTER TABLE "Meilenstein" RENAME TO "Zwischenziel";
ALTER TABLE "Zwischenziel" RENAME CONSTRAINT "Meilenstein_pkey" TO "Zwischenziel_pkey";
ALTER TABLE "Zwischenziel" RENAME CONSTRAINT "Meilenstein_projektId_fkey" TO "Zwischenziel_projektId_fkey";
ALTER INDEX "Meilenstein_projektId_reihenfolge_idx" RENAME TO "Zwischenziel_projektId_reihenfolge_idx";

ALTER TABLE "Aufgabe" RENAME COLUMN "meilensteinId" TO "zwischenzielId";
ALTER TABLE "Aufgabe" RENAME CONSTRAINT "Aufgabe_meilensteinId_fkey" TO "Aufgabe_zwischenzielId_fkey";
ALTER INDEX "Aufgabe_projektId_meilensteinId_idx" RENAME TO "Aufgabe_projektId_zwischenzielId_idx";
