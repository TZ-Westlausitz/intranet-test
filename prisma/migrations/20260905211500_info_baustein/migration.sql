-- Newsfeed-Baustein: Firmenmitteilungen ("Info"), siehe Kommentare am
-- Model Info in prisma/schema.prisma.

-- CreateTable
CREATE TABLE "InfoKategorie" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "InfoKategorie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Info" (
    "id" TEXT NOT NULL,
    "titel" TEXT NOT NULL,
    "inhalt" TEXT,
    "kategorieId" TEXT,
    "alsUnternehmen" BOOLEAN NOT NULL DEFAULT false,
    "mitBestaetigung" BOOLEAN NOT NULL DEFAULT false,
    "kommentareErlaubt" BOOLEAN NOT NULL DEFAULT true,
    "erstelltVonId" TEXT NOT NULL,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfoEmpfaengerPerson" (
    "id" TEXT NOT NULL,
    "infoId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,

    CONSTRAINT "InfoEmpfaengerPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfoEmpfaengerGruppe" (
    "id" TEXT NOT NULL,
    "infoId" TEXT NOT NULL,
    "gruppeId" TEXT NOT NULL,

    CONSTRAINT "InfoEmpfaengerGruppe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfoBestaetigung" (
    "id" TEXT NOT NULL,
    "infoId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "bestaetigtAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InfoBestaetigung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfoKommentar" (
    "id" TEXT NOT NULL,
    "infoId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InfoKommentar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfoAnhang" (
    "id" TEXT NOT NULL,
    "infoId" TEXT NOT NULL,
    "kommentarId" TEXT,
    "dateiname" TEXT NOT NULL,
    "pfad" TEXT NOT NULL,
    "mimetyp" TEXT NOT NULL,
    "groesseBytes" INTEGER NOT NULL,
    "hochgeladenAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hochgeladenVonId" TEXT NOT NULL,

    CONSTRAINT "InfoAnhang_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InfoKategorie_name_key" ON "InfoKategorie"("name");

-- CreateIndex
CREATE INDEX "Info_erstelltVonId_idx" ON "Info"("erstelltVonId");

-- CreateIndex
CREATE INDEX "Info_kategorieId_idx" ON "Info"("kategorieId");

-- CreateIndex
CREATE INDEX "Info_erstelltAm_idx" ON "Info"("erstelltAm");

-- CreateIndex
CREATE INDEX "InfoEmpfaengerPerson_personId_idx" ON "InfoEmpfaengerPerson"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "InfoEmpfaengerPerson_infoId_personId_key" ON "InfoEmpfaengerPerson"("infoId", "personId");

-- CreateIndex
CREATE INDEX "InfoEmpfaengerGruppe_gruppeId_idx" ON "InfoEmpfaengerGruppe"("gruppeId");

-- CreateIndex
CREATE UNIQUE INDEX "InfoEmpfaengerGruppe_infoId_gruppeId_key" ON "InfoEmpfaengerGruppe"("infoId", "gruppeId");

-- CreateIndex
CREATE UNIQUE INDEX "InfoBestaetigung_infoId_personId_key" ON "InfoBestaetigung"("infoId", "personId");

-- CreateIndex
CREATE INDEX "InfoKommentar_infoId_erstelltAm_idx" ON "InfoKommentar"("infoId", "erstelltAm");

-- CreateIndex
CREATE INDEX "InfoAnhang_infoId_idx" ON "InfoAnhang"("infoId");

-- CreateIndex
CREATE INDEX "InfoAnhang_kommentarId_idx" ON "InfoAnhang"("kommentarId");

-- AddForeignKey
ALTER TABLE "Info" ADD CONSTRAINT "Info_kategorieId_fkey" FOREIGN KEY ("kategorieId") REFERENCES "InfoKategorie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Info" ADD CONSTRAINT "Info_erstelltVonId_fkey" FOREIGN KEY ("erstelltVonId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfoEmpfaengerPerson" ADD CONSTRAINT "InfoEmpfaengerPerson_infoId_fkey" FOREIGN KEY ("infoId") REFERENCES "Info"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfoEmpfaengerPerson" ADD CONSTRAINT "InfoEmpfaengerPerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfoEmpfaengerGruppe" ADD CONSTRAINT "InfoEmpfaengerGruppe_infoId_fkey" FOREIGN KEY ("infoId") REFERENCES "Info"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfoEmpfaengerGruppe" ADD CONSTRAINT "InfoEmpfaengerGruppe_gruppeId_fkey" FOREIGN KEY ("gruppeId") REFERENCES "Gruppe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfoBestaetigung" ADD CONSTRAINT "InfoBestaetigung_infoId_fkey" FOREIGN KEY ("infoId") REFERENCES "Info"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfoBestaetigung" ADD CONSTRAINT "InfoBestaetigung_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfoKommentar" ADD CONSTRAINT "InfoKommentar_infoId_fkey" FOREIGN KEY ("infoId") REFERENCES "Info"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfoKommentar" ADD CONSTRAINT "InfoKommentar_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfoAnhang" ADD CONSTRAINT "InfoAnhang_infoId_fkey" FOREIGN KEY ("infoId") REFERENCES "Info"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfoAnhang" ADD CONSTRAINT "InfoAnhang_kommentarId_fkey" FOREIGN KEY ("kommentarId") REFERENCES "InfoKommentar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfoAnhang" ADD CONSTRAINT "InfoAnhang_hochgeladenVonId_fkey" FOREIGN KEY ("hochgeladenVonId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;
