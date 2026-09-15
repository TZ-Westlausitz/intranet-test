-- CreateEnum
CREATE TYPE "Farbschema" AS ENUM ('HELL', 'DUNKEL');

-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "farbschema" "Farbschema" NOT NULL DEFAULT 'HELL';
