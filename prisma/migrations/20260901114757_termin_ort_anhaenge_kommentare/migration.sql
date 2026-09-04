-- AlterTable
ALTER TABLE "Termin" ADD COLUMN     "kommentareErlaubt" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "ort" TEXT;

-- CreateTable
CREATE TABLE "TerminAnhang" (
    "id" TEXT NOT NULL,
    "terminId" TEXT NOT NULL,
    "dateiname" TEXT NOT NULL,
    "pfad" TEXT NOT NULL,
    "mimetyp" TEXT NOT NULL,
    "groesseBytes" INTEGER NOT NULL,
    "hochgeladenAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hochgeladenVonId" TEXT NOT NULL,

    CONSTRAINT "TerminAnhang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TerminKommentar" (
    "id" TEXT NOT NULL,
    "terminId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TerminKommentar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TerminAnhang_terminId_idx" ON "TerminAnhang"("terminId");

-- CreateIndex
CREATE INDEX "TerminKommentar_terminId_erstelltAm_idx" ON "TerminKommentar"("terminId", "erstelltAm");

-- AddForeignKey
ALTER TABLE "TerminAnhang" ADD CONSTRAINT "TerminAnhang_terminId_fkey" FOREIGN KEY ("terminId") REFERENCES "Termin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerminAnhang" ADD CONSTRAINT "TerminAnhang_hochgeladenVonId_fkey" FOREIGN KEY ("hochgeladenVonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerminKommentar" ADD CONSTRAINT "TerminKommentar_terminId_fkey" FOREIGN KEY ("terminId") REFERENCES "Termin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerminKommentar" ADD CONSTRAINT "TerminKommentar_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
