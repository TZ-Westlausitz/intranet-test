-- Optionaler späterer Sichtbarkeitstermin für Aufträge (an eine andere
-- Person zugewiesene Aufgaben), Pendant zu Info.geplantAm/Aufgabe.geplantAm
-- (siehe Kommentar am Feld).
ALTER TABLE "Auftrag" ADD COLUMN "geplantAm" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Auftrag_erstelltVonId_geplantAm_idx" ON "Auftrag"("erstelltVonId", "geplantAm");
