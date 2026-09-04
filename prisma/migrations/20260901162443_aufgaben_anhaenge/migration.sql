-- CreateTable
CREATE TABLE "AufgabeAnhang" (
    "id" TEXT NOT NULL,
    "aufgabeId" TEXT NOT NULL,
    "dateiname" TEXT NOT NULL,
    "pfad" TEXT NOT NULL,
    "mimetyp" TEXT NOT NULL,
    "groesseBytes" INTEGER NOT NULL,
    "hochgeladenAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AufgabeAnhang_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AufgabeAnhang_aufgabeId_idx" ON "AufgabeAnhang"("aufgabeId");

-- AddForeignKey
ALTER TABLE "AufgabeAnhang" ADD CONSTRAINT "AufgabeAnhang_aufgabeId_fkey" FOREIGN KEY ("aufgabeId") REFERENCES "Aufgabe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
