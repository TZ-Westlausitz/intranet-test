-- CreateTable
CREATE TABLE "MeldungStatusEintrag" (
    "id" TEXT NOT NULL,
    "meldungId" TEXT NOT NULL,
    "status" "MeldungStatus" NOT NULL,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeldungStatusEintrag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MeldungStatusEintrag_meldungId_erstelltAm_idx" ON "MeldungStatusEintrag"("meldungId", "erstelltAm");

-- AddForeignKey
ALTER TABLE "MeldungStatusEintrag" ADD CONSTRAINT "MeldungStatusEintrag_meldungId_fkey" FOREIGN KEY ("meldungId") REFERENCES "Meldung"("id") ON DELETE CASCADE ON UPDATE CASCADE;

