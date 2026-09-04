-- "Erreicht" wird nicht mehr manuell gesetzt, sondern aus den zugeordneten
-- Aufgaben abgeleitet — erledigtAm entfällt. Reihenfolge/Nummerierung
-- richten sich jetzt immer nach der Frist statt einer eigenen manuellen
-- Reihenfolge — reihenfolge entfällt ebenfalls. Der DROP COLUMN auf
-- "reihenfolge" nimmt den darauf liegenden Index automatisch mit (Postgres
-- lässt keinen Index auf einer nicht mehr existierenden Spalte übrig), ein
-- zusätzliches DROP INDEX wäre deshalb ein Fehler ("existiert nicht mehr").
ALTER TABLE "Zwischenziel" DROP COLUMN "erledigtAm";
ALTER TABLE "Zwischenziel" DROP COLUMN "reihenfolge";

CREATE INDEX "Zwischenziel_projektId_idx" ON "Zwischenziel"("projektId");
