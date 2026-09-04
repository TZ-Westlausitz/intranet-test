-- CreateEnum
CREATE TYPE "TerminFarbe" AS ENUM ('GRUEN', 'ORANGE', 'BLAU', 'ROT', 'VIOLETT');

-- CreateTable
CREATE TABLE "Termin" (
    "id" TEXT NOT NULL,
    "titel" TEXT NOT NULL,
    "beschreibung" TEXT,
    "beginn" TIMESTAMP(3) NOT NULL,
    "ende" TIMESTAMP(3) NOT NULL,
    "farbe" "TerminFarbe" NOT NULL DEFAULT 'GRUEN',
    "erstelltVonId" TEXT NOT NULL,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Termin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TerminTeilnehmer" (
    "id" TEXT NOT NULL,
    "terminId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,

    CONSTRAINT "TerminTeilnehmer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TerminErinnerung" (
    "id" TEXT NOT NULL,
    "terminId" TEXT NOT NULL,
    "minutenVorher" INTEGER NOT NULL,

    CONSTRAINT "TerminErinnerung_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Termin_erstelltVonId_idx" ON "Termin"("erstelltVonId");

-- CreateIndex
CREATE INDEX "Termin_beginn_idx" ON "Termin"("beginn");

-- CreateIndex
CREATE INDEX "TerminTeilnehmer_personId_idx" ON "TerminTeilnehmer"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "TerminTeilnehmer_terminId_personId_key" ON "TerminTeilnehmer"("terminId", "personId");

-- AddForeignKey
ALTER TABLE "Termin" ADD CONSTRAINT "Termin_erstelltVonId_fkey" FOREIGN KEY ("erstelltVonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerminTeilnehmer" ADD CONSTRAINT "TerminTeilnehmer_terminId_fkey" FOREIGN KEY ("terminId") REFERENCES "Termin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerminTeilnehmer" ADD CONSTRAINT "TerminTeilnehmer_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerminErinnerung" ADD CONSTRAINT "TerminErinnerung_terminId_fkey" FOREIGN KEY ("terminId") REFERENCES "Termin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
