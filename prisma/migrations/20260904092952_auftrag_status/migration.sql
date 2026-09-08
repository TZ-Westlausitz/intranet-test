-- Neuer Zwischenschritt ANGENOMMEN zwischen OFFEN und ERLEDIGT bei
-- Aufträgen, damit sichtbar wird, ob die zugewiesene Person schon Kenntnis
-- genommen hat.
CREATE TYPE "AuftragStatus" AS ENUM ('OFFEN', 'ANGENOMMEN', 'ERLEDIGT');

ALTER TABLE "Auftrag" ADD COLUMN "status" "AuftragStatus" NOT NULL DEFAULT 'OFFEN';

-- Bestehende, bereits erledigte Aufträge rückwirkend korrekt einsortieren
-- (sonst stünden sie durch den Default fälschlich als "Offen" da).
UPDATE "Auftrag" SET "status" = 'ERLEDIGT' WHERE "erledigtAm" IS NOT NULL;
