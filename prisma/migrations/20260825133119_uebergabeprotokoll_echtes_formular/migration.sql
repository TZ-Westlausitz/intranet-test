/*
  Warnings:

  - You are about to drop the column `sauberkeit` on the `Uebergabeprotokoll` table. All the data in the column will be lost.
  - You are about to drop the column `tankfuellungAchtel` on the `Uebergabeprotokoll` table. All the data in the column will be lost.
  - You are about to drop the column `zubehoerBemerkung` on the `Uebergabeprotokoll` table. All the data in the column will be lost.
  - You are about to drop the column `zubehoerVollstaendig` on the `Uebergabeprotokoll` table. All the data in the column will be lost.
  - Added the required column `ort` to the `Uebergabeprotokoll` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tankfuellung` to the `Uebergabeprotokoll` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Tankfuellung" AS ENUM ('VOLL', 'DREI_VIERTEL', 'HALB', 'VIERTEL', 'LEER');

-- AlterTable
ALTER TABLE "Uebergabeprotokoll" DROP COLUMN "sauberkeit",
DROP COLUMN "tankfuellungAchtel",
DROP COLUMN "zubehoerBemerkung",
DROP COLUMN "zubehoerVollstaendig",
ADD COLUMN     "bordwerkzeugInOrdnung" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "fahrzeugpapiereInOrdnung" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "innenraumInOrdnung" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "karosserieInOrdnung" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "ladekabelInOrdnung" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "ort" TEXT NOT NULL,
ADD COLUMN     "reifenInOrdnung" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "scheibenInOrdnung" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "tankfuellung" "Tankfuellung" NOT NULL;

-- DropEnum
DROP TYPE "Sauberkeit";
