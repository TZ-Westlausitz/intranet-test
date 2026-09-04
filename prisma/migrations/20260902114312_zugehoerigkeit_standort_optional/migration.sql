-- Standort wird beim Anlegen neuer Personen nicht mehr abgefragt (manche
-- Personen bekommen ihren Einsatzort nur über mehrere Gruppen verschiedener
-- Standorte, keinen festen Standort in der Zugehoerigkeit).
ALTER TABLE "Zugehoerigkeit" ALTER COLUMN "standortId" DROP NOT NULL;
