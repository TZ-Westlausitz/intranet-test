-- AlterTable
ALTER TABLE "TerminAnhang" ADD COLUMN     "kommentarId" TEXT;

-- CreateIndex
CREATE INDEX "TerminAnhang_kommentarId_idx" ON "TerminAnhang"("kommentarId");

-- AddForeignKey
ALTER TABLE "TerminAnhang" ADD CONSTRAINT "TerminAnhang_kommentarId_fkey" FOREIGN KEY ("kommentarId") REFERENCES "TerminKommentar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
