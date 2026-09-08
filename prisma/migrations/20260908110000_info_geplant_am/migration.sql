-- Zeitversetzte Veröffentlichung ("Geplant am") — veroeffentlichtAm ist der
-- Zeitpunkt, ab dem eine Info sichtbar ist UND wonach sortiert wird
-- (bei sofortiger Veröffentlichung gleich erstelltAm, sonst geplantAm).
ALTER TABLE "Info" ADD COLUMN "geplantAm" TIMESTAMP(3);
ALTER TABLE "Info" ADD COLUMN "veroeffentlichtAm" TIMESTAMP(3);

-- Bestehende Infos: veroeffentlichtAm = erstelltAm, damit sich weder
-- Sortierung noch Anzeige für sie ändert.
UPDATE "Info" SET "veroeffentlichtAm" = "erstelltAm";

ALTER TABLE "Info" ALTER COLUMN "veroeffentlichtAm" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Info_veroeffentlichtAm_idx" ON "Info"("veroeffentlichtAm");
