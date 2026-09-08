-- Neue Kontakt-Zusatzfelder an Person (Kontakte-Übersicht) — beide optional.
ALTER TABLE "Person" ADD COLUMN "telefon" TEXT;
ALTER TABLE "Person" ADD COLUMN "letzteAktivitaet" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "InfoLike" (
    "id" TEXT NOT NULL,
    "infoId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "geliktAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InfoLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InfoLike_infoId_personId_key" ON "InfoLike"("infoId", "personId");

-- AddForeignKey
ALTER TABLE "InfoLike" ADD CONSTRAINT "InfoLike_infoId_fkey" FOREIGN KEY ("infoId") REFERENCES "Info"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfoLike" ADD CONSTRAINT "InfoLike_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;
