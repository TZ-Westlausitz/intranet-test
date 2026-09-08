-- Persönliche Startseiten-Einstellung: welches Modul aus "Weiteres" in der
-- Kachel Zeile 3, Spalte 4 erscheint. NULL = noch nicht eingestellt, dann
-- greift ein Default auf der Startseite selbst.
ALTER TABLE "Person" ADD COLUMN "startseiteWeiteresModul" TEXT;
