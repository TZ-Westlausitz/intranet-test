-- CreateEnum
CREATE TYPE "TerminTeilnahmeStatus" AS ENUM ('OFFEN', 'ZUGESAGT', 'ABGESAGT');

-- AlterTable
ALTER TABLE "TerminTeilnehmer" ADD COLUMN     "status" "TerminTeilnahmeStatus" NOT NULL DEFAULT 'OFFEN';

-- CreateTable
CREATE TABLE "Benachrichtigung" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "link" TEXT,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gelesenAm" TIMESTAMP(3),

    CONSTRAINT "Benachrichtigung_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Benachrichtigung_personId_gelesenAm_idx" ON "Benachrichtigung"("personId", "gelesenAm");

-- CreateIndex
CREATE INDEX "Benachrichtigung_personId_erstelltAm_idx" ON "Benachrichtigung"("personId", "erstelltAm");

-- AddForeignKey
ALTER TABLE "Benachrichtigung" ADD CONSTRAINT "Benachrichtigung_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
