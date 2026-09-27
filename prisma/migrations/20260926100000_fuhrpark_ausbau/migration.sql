-- CreateEnum
CREATE TYPE "Reifenart" AS ENUM ('SOMMER', 'WINTER', 'GANZJAHR');

-- AlterTable
ALTER TABLE "Fahrzeug" ADD COLUMN     "halterId" TEXT,
ADD COLUMN     "huFaelligAm" TIMESTAMP(3),
ADD COLUMN     "reifenart" "Reifenart",
ADD COLUMN     "serviceFaelligAm" TIMESTAMP(3),
ADD COLUMN     "zuordnungHinweis" TEXT;

-- CreateTable
CREATE TABLE "Fahrzeugschaden" (
    "id" TEXT NOT NULL,
    "fahrzeugId" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "beschreibung" TEXT NOT NULL,
    "festgestelltAm" TIMESTAMP(3) NOT NULL,
    "gemeldetVonId" TEXT NOT NULL,
    "erfasstAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "behobenAm" TIMESTAMP(3),

    CONSTRAINT "Fahrzeugschaden_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Fahrzeugschaden_fahrzeugId_behobenAm_idx" ON "Fahrzeugschaden"("fahrzeugId", "behobenAm");

-- CreateIndex
CREATE INDEX "Fahrzeug_halterId_idx" ON "Fahrzeug"("halterId");

-- CreateIndex
CREATE INDEX "Fahrzeug_standortId_idx" ON "Fahrzeug"("standortId");

-- AddForeignKey
ALTER TABLE "Fahrzeug" ADD CONSTRAINT "Fahrzeug_halterId_fkey" FOREIGN KEY ("halterId") REFERENCES "Person"("benutzername") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fahrzeugschaden" ADD CONSTRAINT "Fahrzeugschaden_fahrzeugId_fkey" FOREIGN KEY ("fahrzeugId") REFERENCES "Fahrzeug"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fahrzeugschaden" ADD CONSTRAINT "Fahrzeugschaden_gemeldetVonId_fkey" FOREIGN KEY ("gemeldetVonId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;

