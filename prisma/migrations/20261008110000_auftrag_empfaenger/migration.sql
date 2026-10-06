-- CreateTable
CREATE TABLE "AuftragEmpfaenger" (
    "auftragId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,

    CONSTRAINT "AuftragEmpfaenger_pkey" PRIMARY KEY ("auftragId","personId")
);

-- CreateIndex
CREATE INDEX "AuftragEmpfaenger_personId_idx" ON "AuftragEmpfaenger"("personId");

-- AddForeignKey
ALTER TABLE "AuftragEmpfaenger" ADD CONSTRAINT "AuftragEmpfaenger_auftragId_fkey" FOREIGN KEY ("auftragId") REFERENCES "Auftrag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuftragEmpfaenger" ADD CONSTRAINT "AuftragEmpfaenger_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Bestehende Zuweisungen übernehmen, bevor die alte Spalte entfällt
INSERT INTO "AuftragEmpfaenger" ("auftragId", "personId")
SELECT "id", "zugewiesenAnId" FROM "Auftrag" WHERE "zugewiesenAnId" IS NOT NULL;

-- DropIndex
DROP INDEX "Auftrag_zugewiesenAnId_erledigtAm_idx";

-- AlterTable
ALTER TABLE "Auftrag" DROP CONSTRAINT "Auftrag_zugewiesenAnId_fkey";
ALTER TABLE "Auftrag" DROP COLUMN "zugewiesenAnId";
