-- CreateTable
CREATE TABLE "AuftragCheckpunkt" (
    "id" TEXT NOT NULL,
    "auftragId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "reihenfolge" INTEGER NOT NULL,
    "erledigtAm" TIMESTAMP(3),

    CONSTRAINT "AuftragCheckpunkt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuftragCheckpunkt_auftragId_reihenfolge_idx" ON "AuftragCheckpunkt"("auftragId", "reihenfolge");

-- AddForeignKey
ALTER TABLE "AuftragCheckpunkt" ADD CONSTRAINT "AuftragCheckpunkt_auftragId_fkey" FOREIGN KEY ("auftragId") REFERENCES "Auftrag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
