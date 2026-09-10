-- AlterEnum
ALTER TYPE "FormularElementTyp" ADD VALUE 'TRENNZEICHEN';

-- CreateTable
CREATE TABLE "FormularVorlageBild" (
    "id" TEXT NOT NULL,
    "vorlageId" TEXT NOT NULL,
    "dateiname" TEXT NOT NULL,
    "pfad" TEXT NOT NULL,
    "mimetyp" TEXT NOT NULL,
    "groesseBytes" INTEGER NOT NULL,
    "hochgeladenAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormularVorlageBild_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FormularVorlageBild_vorlageId_idx" ON "FormularVorlageBild"("vorlageId");

-- AddForeignKey
ALTER TABLE "FormularVorlageBild" ADD CONSTRAINT "FormularVorlageBild_vorlageId_fkey" FOREIGN KEY ("vorlageId") REFERENCES "FormularVorlage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
