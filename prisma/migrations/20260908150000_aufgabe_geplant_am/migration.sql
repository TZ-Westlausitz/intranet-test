-- Optionaler späterer Sichtbarkeitstermin für persönliche To-dos, Pendant
-- zu Info.geplantAm im Newsfeed (siehe Kommentar am Feld).
ALTER TABLE "Aufgabe" ADD COLUMN "geplantAm" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Aufgabe_personId_geplantAm_idx" ON "Aufgabe"("personId", "geplantAm");
