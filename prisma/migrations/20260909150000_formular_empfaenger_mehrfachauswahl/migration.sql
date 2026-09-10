-- DropForeignKey
ALTER TABLE "FormularVorlage" DROP CONSTRAINT "FormularVorlage_empfaengerGruppeId_fkey";

-- DropForeignKey
ALTER TABLE "FormularVorlage" DROP CONSTRAINT "FormularVorlage_empfaengerPersonId_fkey";

-- AlterTable
ALTER TABLE "FormularVorlage" DROP COLUMN "empfaengerGruppeId",
DROP COLUMN "empfaengerPersonId";

-- CreateTable
CREATE TABLE "FormularEmpfaengerPerson" (
    "id" TEXT NOT NULL,
    "vorlageId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,

    CONSTRAINT "FormularEmpfaengerPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormularEmpfaengerGruppe" (
    "id" TEXT NOT NULL,
    "vorlageId" TEXT NOT NULL,
    "gruppeId" TEXT NOT NULL,

    CONSTRAINT "FormularEmpfaengerGruppe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormularEmpfaengerAbteilung" (
    "id" TEXT NOT NULL,
    "vorlageId" TEXT NOT NULL,
    "abteilungId" TEXT NOT NULL,

    CONSTRAINT "FormularEmpfaengerAbteilung_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FormularEmpfaengerPerson_personId_idx" ON "FormularEmpfaengerPerson"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "FormularEmpfaengerPerson_vorlageId_personId_key" ON "FormularEmpfaengerPerson"("vorlageId", "personId");

-- CreateIndex
CREATE INDEX "FormularEmpfaengerGruppe_gruppeId_idx" ON "FormularEmpfaengerGruppe"("gruppeId");

-- CreateIndex
CREATE UNIQUE INDEX "FormularEmpfaengerGruppe_vorlageId_gruppeId_key" ON "FormularEmpfaengerGruppe"("vorlageId", "gruppeId");

-- CreateIndex
CREATE INDEX "FormularEmpfaengerAbteilung_abteilungId_idx" ON "FormularEmpfaengerAbteilung"("abteilungId");

-- CreateIndex
CREATE UNIQUE INDEX "FormularEmpfaengerAbteilung_vorlageId_abteilungId_key" ON "FormularEmpfaengerAbteilung"("vorlageId", "abteilungId");

-- AddForeignKey
ALTER TABLE "FormularEmpfaengerPerson" ADD CONSTRAINT "FormularEmpfaengerPerson_vorlageId_fkey" FOREIGN KEY ("vorlageId") REFERENCES "FormularVorlage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormularEmpfaengerPerson" ADD CONSTRAINT "FormularEmpfaengerPerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormularEmpfaengerGruppe" ADD CONSTRAINT "FormularEmpfaengerGruppe_vorlageId_fkey" FOREIGN KEY ("vorlageId") REFERENCES "FormularVorlage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormularEmpfaengerGruppe" ADD CONSTRAINT "FormularEmpfaengerGruppe_gruppeId_fkey" FOREIGN KEY ("gruppeId") REFERENCES "Gruppe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormularEmpfaengerAbteilung" ADD CONSTRAINT "FormularEmpfaengerAbteilung_vorlageId_fkey" FOREIGN KEY ("vorlageId") REFERENCES "FormularVorlage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormularEmpfaengerAbteilung" ADD CONSTRAINT "FormularEmpfaengerAbteilung_abteilungId_fkey" FOREIGN KEY ("abteilungId") REFERENCES "Abteilung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
