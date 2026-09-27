-- CreateEnum
CREATE TYPE "FahrzeugterminArt" AS ENUM ('TUEV', 'SERVICE', 'REIFENWECHSEL');

-- CreateEnum
CREATE TYPE "FahrzeugterminStatus" AS ENUM ('VORGESCHLAGEN', 'ABGELEHNT', 'ANGENOMMEN', 'ERLEDIGT');

-- CreateTable
CREATE TABLE "Fahrzeugterminvorschlag" (
    "id" TEXT NOT NULL,
    "fahrzeugId" TEXT NOT NULL,
    "art" "FahrzeugterminArt" NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL,
    "status" "FahrzeugterminStatus" NOT NULL DEFAULT 'VORGESCHLAGEN',
    "vorgeschlagenVonId" TEXT NOT NULL,
    "empfaengerId" TEXT NOT NULL,
    "terminId" TEXT,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entschiedenAm" TIMESTAMP(3),
    "erledigtAm" TIMESTAMP(3),

    CONSTRAINT "Fahrzeugterminvorschlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Fahrzeugterminvorschlag_terminId_key" ON "Fahrzeugterminvorschlag"("terminId");

-- CreateIndex
CREATE INDEX "Fahrzeugterminvorschlag_fahrzeugId_art_status_idx" ON "Fahrzeugterminvorschlag"("fahrzeugId", "art", "status");

-- CreateIndex
CREATE INDEX "Fahrzeugterminvorschlag_empfaengerId_status_idx" ON "Fahrzeugterminvorschlag"("empfaengerId", "status");

-- AddForeignKey
ALTER TABLE "Fahrzeugterminvorschlag" ADD CONSTRAINT "Fahrzeugterminvorschlag_fahrzeugId_fkey" FOREIGN KEY ("fahrzeugId") REFERENCES "Fahrzeug"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fahrzeugterminvorschlag" ADD CONSTRAINT "Fahrzeugterminvorschlag_vorgeschlagenVonId_fkey" FOREIGN KEY ("vorgeschlagenVonId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fahrzeugterminvorschlag" ADD CONSTRAINT "Fahrzeugterminvorschlag_empfaengerId_fkey" FOREIGN KEY ("empfaengerId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fahrzeugterminvorschlag" ADD CONSTRAINT "Fahrzeugterminvorschlag_terminId_fkey" FOREIGN KEY ("terminId") REFERENCES "Termin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

