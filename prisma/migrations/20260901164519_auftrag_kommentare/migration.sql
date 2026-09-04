-- AlterTable
ALTER TABLE "AuftragAnhang" ADD COLUMN     "kommentarId" TEXT;

-- CreateTable
CREATE TABLE "AuftragKommentar" (
    "id" TEXT NOT NULL,
    "auftragId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuftragKommentar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuftragKommentar_auftragId_erstelltAm_idx" ON "AuftragKommentar"("auftragId", "erstelltAm");

-- CreateIndex
CREATE INDEX "AuftragAnhang_kommentarId_idx" ON "AuftragAnhang"("kommentarId");

-- AddForeignKey
ALTER TABLE "AuftragAnhang" ADD CONSTRAINT "AuftragAnhang_kommentarId_fkey" FOREIGN KEY ("kommentarId") REFERENCES "AuftragKommentar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuftragKommentar" ADD CONSTRAINT "AuftragKommentar_auftragId_fkey" FOREIGN KEY ("auftragId") REFERENCES "Auftrag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuftragKommentar" ADD CONSTRAINT "AuftragKommentar_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
