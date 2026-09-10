-- DropForeignKey
ALTER TABLE "Auftrag" DROP CONSTRAINT "Auftrag_zugewiesenAnId_fkey";

-- AlterTable
ALTER TABLE "Auftrag" ADD COLUMN     "istEntwurf" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "zugewiesenAnId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "FormularVorlage" ADD COLUMN     "istEntwurf" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Info" ADD COLUMN     "istEntwurf" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "Auftrag" ADD CONSTRAINT "Auftrag_zugewiesenAnId_fkey" FOREIGN KEY ("zugewiesenAnId") REFERENCES "Person"("benutzername") ON DELETE SET NULL ON UPDATE CASCADE;
