-- DropIndex
DROP INDEX "Zugehoerigkeit_personId_standortId_abteilungId_rolle_key";

-- AlterTable
ALTER TABLE "Zugehoerigkeit" DROP COLUMN "rolle";

-- DropEnum
DROP TYPE "Rolle";

-- CreateIndex
CREATE UNIQUE INDEX "Zugehoerigkeit_personId_standortId_abteilungId_key" ON "Zugehoerigkeit"("personId", "standortId", "abteilungId");

