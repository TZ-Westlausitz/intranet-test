-- AlterTable
ALTER TABLE "ChatKonversationGelesen" ADD COLUMN     "archiviertAm" TIMESTAMP(3),
ADD COLUMN     "stumm" BOOLEAN NOT NULL DEFAULT false;

