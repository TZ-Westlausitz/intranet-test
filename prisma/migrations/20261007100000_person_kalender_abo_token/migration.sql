-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "kalenderAboToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Person_kalenderAboToken_key" ON "Person"("kalenderAboToken");
