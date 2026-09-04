-- CreateTable
CREATE TABLE "Auftrag" (
    "id" TEXT NOT NULL,
    "titel" TEXT NOT NULL,
    "beschreibung" TEXT,
    "prioritaet" "AufgabePrioritaet" NOT NULL DEFAULT 'MITTEL',
    "faelligAm" TIMESTAMP(3),
    "erledigtAm" TIMESTAMP(3),
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "erstelltVonId" TEXT NOT NULL,
    "zugewiesenAnId" TEXT NOT NULL,

    CONSTRAINT "Auftrag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuftragAnhang" (
    "id" TEXT NOT NULL,
    "auftragId" TEXT NOT NULL,
    "dateiname" TEXT NOT NULL,
    "pfad" TEXT NOT NULL,
    "mimetyp" TEXT NOT NULL,
    "groesseBytes" INTEGER NOT NULL,
    "hochgeladenAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuftragAnhang_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Auftrag_zugewiesenAnId_erledigtAm_idx" ON "Auftrag"("zugewiesenAnId", "erledigtAm");

-- CreateIndex
CREATE INDEX "Auftrag_erstelltVonId_idx" ON "Auftrag"("erstelltVonId");

-- CreateIndex
CREATE INDEX "AuftragAnhang_auftragId_idx" ON "AuftragAnhang"("auftragId");

-- AddForeignKey
ALTER TABLE "Auftrag" ADD CONSTRAINT "Auftrag_erstelltVonId_fkey" FOREIGN KEY ("erstelltVonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auftrag" ADD CONSTRAINT "Auftrag_zugewiesenAnId_fkey" FOREIGN KEY ("zugewiesenAnId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuftragAnhang" ADD CONSTRAINT "AuftragAnhang_auftragId_fkey" FOREIGN KEY ("auftragId") REFERENCES "Auftrag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
