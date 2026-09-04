-- CreateEnum
CREATE TYPE "AufgabeStatus" AS ENUM ('OFFEN', 'ANGENOMMEN', 'ERLEDIGT');

-- CreateEnum
CREATE TYPE "ProjektStatus" AS ENUM ('PLANUNG', 'AKTIV', 'ABGESCHLOSSEN', 'ABGEBROCHEN');

-- CreateEnum
CREATE TYPE "ProjektmitgliedRolle" AS ENUM ('LEITUNG', 'MITGLIED');

-- DropForeignKey
ALTER TABLE "Aufgabe" DROP CONSTRAINT "Aufgabe_personId_fkey";

-- DropForeignKey
ALTER TABLE "Zugehoerigkeit" DROP CONSTRAINT "Zugehoerigkeit_standortId_fkey";

-- AlterTable
ALTER TABLE "Aufgabe" ADD COLUMN     "erstelltVonId" TEXT,
ADD COLUMN     "meilensteinId" TEXT,
ADD COLUMN     "projektId" TEXT,
ADD COLUMN     "status" "AufgabeStatus",
ADD COLUMN     "zugewiesenAnId" TEXT,
ALTER COLUMN "personId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Projekt" (
    "id" TEXT NOT NULL,
    "titel" TEXT NOT NULL,
    "ziel" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "ende" TIMESTAMP(3) NOT NULL,
    "status" "ProjektStatus" NOT NULL DEFAULT 'PLANUNG',
    "erstelltVonId" TEXT NOT NULL,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Projekt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Projektmitglied" (
    "id" TEXT NOT NULL,
    "projektId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "rolle" "ProjektmitgliedRolle" NOT NULL DEFAULT 'MITGLIED',
    "beigetretenAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ausgeschiedenAm" TIMESTAMP(3),

    CONSTRAINT "Projektmitglied_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meilenstein" (
    "id" TEXT NOT NULL,
    "projektId" TEXT NOT NULL,
    "titel" TEXT NOT NULL,
    "frist" TIMESTAMP(3) NOT NULL,
    "reihenfolge" INTEGER NOT NULL,
    "erledigtAm" TIMESTAMP(3),

    CONSTRAINT "Meilenstein_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjektDokument" (
    "id" TEXT NOT NULL,
    "projektId" TEXT NOT NULL,
    "dateiname" TEXT NOT NULL,
    "pfad" TEXT NOT NULL,
    "mimetyp" TEXT NOT NULL,
    "groesseBytes" INTEGER NOT NULL,
    "hochgeladenAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hochgeladenVonId" TEXT NOT NULL,

    CONSTRAINT "ProjektDokument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Projektnachricht" (
    "id" TEXT NOT NULL,
    "projektId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Projektnachricht_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Projekt_status_idx" ON "Projekt"("status");

-- CreateIndex
CREATE INDEX "Projekt_ende_idx" ON "Projekt"("ende");

-- CreateIndex
CREATE INDEX "Projektmitglied_personId_idx" ON "Projektmitglied"("personId");

-- CreateIndex
CREATE INDEX "Projektmitglied_projektId_ausgeschiedenAm_idx" ON "Projektmitglied"("projektId", "ausgeschiedenAm");

-- CreateIndex
CREATE UNIQUE INDEX "Projektmitglied_projektId_personId_key" ON "Projektmitglied"("projektId", "personId");

-- CreateIndex
CREATE INDEX "Meilenstein_projektId_reihenfolge_idx" ON "Meilenstein"("projektId", "reihenfolge");

-- CreateIndex
CREATE INDEX "ProjektDokument_projektId_idx" ON "ProjektDokument"("projektId");

-- CreateIndex
CREATE INDEX "Projektnachricht_projektId_erstelltAm_idx" ON "Projektnachricht"("projektId", "erstelltAm");

-- CreateIndex
CREATE INDEX "Aufgabe_projektId_meilensteinId_idx" ON "Aufgabe"("projektId", "meilensteinId");

-- CreateIndex
CREATE INDEX "Aufgabe_projektId_status_idx" ON "Aufgabe"("projektId", "status");

-- CreateIndex
CREATE INDEX "Aufgabe_zugewiesenAnId_idx" ON "Aufgabe"("zugewiesenAnId");

-- AddForeignKey
ALTER TABLE "Zugehoerigkeit" ADD CONSTRAINT "Zugehoerigkeit_standortId_fkey" FOREIGN KEY ("standortId") REFERENCES "Standort"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aufgabe" ADD CONSTRAINT "Aufgabe_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("benutzername") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aufgabe" ADD CONSTRAINT "Aufgabe_projektId_fkey" FOREIGN KEY ("projektId") REFERENCES "Projekt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aufgabe" ADD CONSTRAINT "Aufgabe_meilensteinId_fkey" FOREIGN KEY ("meilensteinId") REFERENCES "Meilenstein"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aufgabe" ADD CONSTRAINT "Aufgabe_erstelltVonId_fkey" FOREIGN KEY ("erstelltVonId") REFERENCES "Person"("benutzername") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aufgabe" ADD CONSTRAINT "Aufgabe_zugewiesenAnId_fkey" FOREIGN KEY ("zugewiesenAnId") REFERENCES "Person"("benutzername") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Projekt" ADD CONSTRAINT "Projekt_erstelltVonId_fkey" FOREIGN KEY ("erstelltVonId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Projektmitglied" ADD CONSTRAINT "Projektmitglied_projektId_fkey" FOREIGN KEY ("projektId") REFERENCES "Projekt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Projektmitglied" ADD CONSTRAINT "Projektmitglied_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meilenstein" ADD CONSTRAINT "Meilenstein_projektId_fkey" FOREIGN KEY ("projektId") REFERENCES "Projekt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjektDokument" ADD CONSTRAINT "ProjektDokument_projektId_fkey" FOREIGN KEY ("projektId") REFERENCES "Projekt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjektDokument" ADD CONSTRAINT "ProjektDokument_hochgeladenVonId_fkey" FOREIGN KEY ("hochgeladenVonId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Projektnachricht" ADD CONSTRAINT "Projektnachricht_projektId_fkey" FOREIGN KEY ("projektId") REFERENCES "Projekt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Projektnachricht" ADD CONSTRAINT "Projektnachricht_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;
