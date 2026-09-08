-- Dritte Empfänger-Art für Infos: Abteilung, neben Person und Gruppe.

-- CreateTable
CREATE TABLE "InfoEmpfaengerAbteilung" (
    "id" TEXT NOT NULL,
    "infoId" TEXT NOT NULL,
    "abteilungId" TEXT NOT NULL,

    CONSTRAINT "InfoEmpfaengerAbteilung_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InfoEmpfaengerAbteilung_abteilungId_idx" ON "InfoEmpfaengerAbteilung"("abteilungId");

-- CreateIndex
CREATE UNIQUE INDEX "InfoEmpfaengerAbteilung_infoId_abteilungId_key" ON "InfoEmpfaengerAbteilung"("infoId", "abteilungId");

-- AddForeignKey
ALTER TABLE "InfoEmpfaengerAbteilung" ADD CONSTRAINT "InfoEmpfaengerAbteilung_infoId_fkey" FOREIGN KEY ("infoId") REFERENCES "Info"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfoEmpfaengerAbteilung" ADD CONSTRAINT "InfoEmpfaengerAbteilung_abteilungId_fkey" FOREIGN KEY ("abteilungId") REFERENCES "Abteilung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
