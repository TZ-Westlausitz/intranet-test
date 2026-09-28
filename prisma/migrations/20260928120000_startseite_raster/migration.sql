-- AlterTable
ALTER TABLE "Person" ADD COLUMN "startseiteRaster" TEXT;

-- Datenmigration: bisherige Einzelauswahl (startseiteWeiteresModul) in das
-- neue Raster-Format übertragen, damit persönliche Einstellungen nicht
-- verloren gehen. Positionen entsprechen exakt der bisherigen festen
-- Anordnung (Newsfeed 0, Kalender 2, Aufgaben 3, Wissensbereich 6,
-- gewähltes Modul 7), siehe src/lib/startseite/raster.ts.
-- "To-Do-Liste" entspricht dem neuen Standard (NULL) und braucht keine
-- eigene Zeile.
UPDATE "Person"
SET "startseiteRaster" = '[{"position":0,"modul":"NEWSFEED"},{"position":2,"modul":"KALENDER"},{"position":3,"modul":"AUFGABEN"},{"position":6,"modul":"WISSENSBEREICH"},{"position":7,"modul":"FAHRZEUGE"}]'
WHERE "startseiteWeiteresModul" = 'Fahrzeuge';

UPDATE "Person"
SET "startseiteRaster" = '[{"position":0,"modul":"NEWSFEED"},{"position":2,"modul":"KALENDER"},{"position":3,"modul":"AUFGABEN"},{"position":6,"modul":"WISSENSBEREICH"},{"position":7,"modul":"GEPLANTE_AKTIONEN"}]'
WHERE "startseiteWeiteresModul" = 'Geplante Aktionen';

-- AlterTable
ALTER TABLE "Person" DROP COLUMN "startseiteWeiteresModul";
