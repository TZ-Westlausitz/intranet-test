-- CreateTable
CREATE TABLE "MeldungGelesen" (
    "meldungId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "zuletztGelesenAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeldungGelesen_pkey" PRIMARY KEY ("meldungId","personId")
);

-- AddForeignKey
ALTER TABLE "MeldungGelesen" ADD CONSTRAINT "MeldungGelesen_meldungId_fkey" FOREIGN KEY ("meldungId") REFERENCES "Meldung"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeldungGelesen" ADD CONSTRAINT "MeldungGelesen_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;

