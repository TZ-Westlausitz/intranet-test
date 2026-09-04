-- CreateEnum
CREATE TYPE "AufgabePrioritaet" AS ENUM ('HOCH', 'MITTEL', 'NIEDRIG');

-- AlterTable
ALTER TABLE "Aufgabe" ADD COLUMN     "beschreibung" TEXT,
ADD COLUMN     "prioritaet" "AufgabePrioritaet" NOT NULL DEFAULT 'MITTEL';
