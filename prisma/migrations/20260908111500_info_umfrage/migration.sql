-- CreateTable
CREATE TABLE "InfoUmfrage" (
    "id" TEXT NOT NULL,
    "infoId" TEXT NOT NULL,
    "mehrfachauswahl" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "InfoUmfrage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfoUmfrageOption" (
    "id" TEXT NOT NULL,
    "umfrageId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "reihenfolge" INTEGER NOT NULL,

    CONSTRAINT "InfoUmfrageOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfoUmfrageStimme" (
    "id" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "abgestimmtAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InfoUmfrageStimme_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InfoUmfrage_infoId_key" ON "InfoUmfrage"("infoId");

-- CreateIndex
CREATE INDEX "InfoUmfrageOption_umfrageId_idx" ON "InfoUmfrageOption"("umfrageId");

-- CreateIndex
CREATE UNIQUE INDEX "InfoUmfrageStimme_optionId_personId_key" ON "InfoUmfrageStimme"("optionId", "personId");

-- AddForeignKey
ALTER TABLE "InfoUmfrage" ADD CONSTRAINT "InfoUmfrage_infoId_fkey" FOREIGN KEY ("infoId") REFERENCES "Info"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfoUmfrageOption" ADD CONSTRAINT "InfoUmfrageOption_umfrageId_fkey" FOREIGN KEY ("umfrageId") REFERENCES "InfoUmfrage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfoUmfrageStimme" ADD CONSTRAINT "InfoUmfrageStimme_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "InfoUmfrageOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfoUmfrageStimme" ADD CONSTRAINT "InfoUmfrageStimme_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;
