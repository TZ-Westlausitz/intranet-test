-- CreateEnum
CREATE TYPE "Fahrzeugtyp" AS ENUM ('PKW', 'TRANSPORTER', 'BUS');

-- AlterTable
ALTER TABLE "Fahrzeug" ADD COLUMN     "fahrzeugtyp" "Fahrzeugtyp" NOT NULL DEFAULT 'TRANSPORTER';

