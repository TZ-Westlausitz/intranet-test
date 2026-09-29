-- DropForeignKey
ALTER TABLE "Fahrzeug" DROP CONSTRAINT "Fahrzeug_standortId_fkey";

-- DropIndex
DROP INDEX "Fahrzeug_standortId_idx";

-- AlterTable
ALTER TABLE "Fahrzeug" DROP COLUMN "standortId",
ADD COLUMN     "ortId" TEXT;

-- CreateIndex
CREATE INDEX "Fahrzeug_ortId_idx" ON "Fahrzeug"("ortId");

-- AddForeignKey
ALTER TABLE "Fahrzeug" ADD CONSTRAINT "Fahrzeug_ortId_fkey" FOREIGN KEY ("ortId") REFERENCES "Ort"("id") ON DELETE SET NULL ON UPDATE CASCADE;

