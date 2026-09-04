-- AlterTable
ALTER TABLE "Termin" ADD COLUMN     "ganztaegig" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "serieId" TEXT;

-- CreateIndex
CREATE INDEX "Termin_serieId_idx" ON "Termin"("serieId");
