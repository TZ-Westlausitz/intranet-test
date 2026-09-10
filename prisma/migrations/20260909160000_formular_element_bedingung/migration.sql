-- AlterTable
ALTER TABLE "FormularElement" ADD COLUMN     "bedingungElementId" TEXT,
ADD COLUMN     "bedingungWert" TEXT;

-- CreateIndex
CREATE INDEX "FormularElement_bedingungElementId_idx" ON "FormularElement"("bedingungElementId");

-- AddForeignKey
ALTER TABLE "FormularElement" ADD CONSTRAINT "FormularElement_bedingungElementId_fkey" FOREIGN KEY ("bedingungElementId") REFERENCES "FormularElement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
