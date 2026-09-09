-- CreateTable
CREATE TABLE "WissensOrdner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WissensOrdner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WissensUnterordner" (
    "id" TEXT NOT NULL,
    "ordnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "WissensUnterordner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WissensArtikel" (
    "id" TEXT NOT NULL,
    "titel" TEXT NOT NULL,
    "inhalt" TEXT,
    "ordnerId" TEXT,
    "unterordnerId" TEXT,
    "erstelltVonId" TEXT NOT NULL,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WissensArtikel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WissensEmpfaengerPerson" (
    "id" TEXT NOT NULL,
    "artikelId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,

    CONSTRAINT "WissensEmpfaengerPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WissensEmpfaengerGruppe" (
    "id" TEXT NOT NULL,
    "artikelId" TEXT NOT NULL,
    "gruppeId" TEXT NOT NULL,

    CONSTRAINT "WissensEmpfaengerGruppe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WissensEmpfaengerAbteilung" (
    "id" TEXT NOT NULL,
    "artikelId" TEXT NOT NULL,
    "abteilungId" TEXT NOT NULL,

    CONSTRAINT "WissensEmpfaengerAbteilung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WissensAnhang" (
    "id" TEXT NOT NULL,
    "artikelId" TEXT NOT NULL,
    "dateiname" TEXT NOT NULL,
    "pfad" TEXT NOT NULL,
    "mimetyp" TEXT NOT NULL,
    "groesseBytes" INTEGER NOT NULL,
    "hochgeladenAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hochgeladenVonId" TEXT NOT NULL,

    CONSTRAINT "WissensAnhang_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WissensOrdner_name_key" ON "WissensOrdner"("name");

-- CreateIndex
CREATE UNIQUE INDEX "WissensUnterordner_ordnerId_name_key" ON "WissensUnterordner"("ordnerId", "name");

-- CreateIndex
CREATE INDEX "WissensArtikel_ordnerId_idx" ON "WissensArtikel"("ordnerId");

-- CreateIndex
CREATE INDEX "WissensArtikel_unterordnerId_idx" ON "WissensArtikel"("unterordnerId");

-- CreateIndex
CREATE INDEX "WissensArtikel_erstelltVonId_idx" ON "WissensArtikel"("erstelltVonId");

-- CreateIndex
CREATE INDEX "WissensArtikel_aktualisiertAm_idx" ON "WissensArtikel"("aktualisiertAm");

-- CreateIndex
CREATE INDEX "WissensEmpfaengerPerson_personId_idx" ON "WissensEmpfaengerPerson"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "WissensEmpfaengerPerson_artikelId_personId_key" ON "WissensEmpfaengerPerson"("artikelId", "personId");

-- CreateIndex
CREATE INDEX "WissensEmpfaengerGruppe_gruppeId_idx" ON "WissensEmpfaengerGruppe"("gruppeId");

-- CreateIndex
CREATE UNIQUE INDEX "WissensEmpfaengerGruppe_artikelId_gruppeId_key" ON "WissensEmpfaengerGruppe"("artikelId", "gruppeId");

-- CreateIndex
CREATE INDEX "WissensEmpfaengerAbteilung_abteilungId_idx" ON "WissensEmpfaengerAbteilung"("abteilungId");

-- CreateIndex
CREATE UNIQUE INDEX "WissensEmpfaengerAbteilung_artikelId_abteilungId_key" ON "WissensEmpfaengerAbteilung"("artikelId", "abteilungId");

-- CreateIndex
CREATE INDEX "WissensAnhang_artikelId_idx" ON "WissensAnhang"("artikelId");

-- AddForeignKey
ALTER TABLE "WissensUnterordner" ADD CONSTRAINT "WissensUnterordner_ordnerId_fkey" FOREIGN KEY ("ordnerId") REFERENCES "WissensOrdner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WissensArtikel" ADD CONSTRAINT "WissensArtikel_ordnerId_fkey" FOREIGN KEY ("ordnerId") REFERENCES "WissensOrdner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WissensArtikel" ADD CONSTRAINT "WissensArtikel_unterordnerId_fkey" FOREIGN KEY ("unterordnerId") REFERENCES "WissensUnterordner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WissensArtikel" ADD CONSTRAINT "WissensArtikel_erstelltVonId_fkey" FOREIGN KEY ("erstelltVonId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WissensEmpfaengerPerson" ADD CONSTRAINT "WissensEmpfaengerPerson_artikelId_fkey" FOREIGN KEY ("artikelId") REFERENCES "WissensArtikel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WissensEmpfaengerPerson" ADD CONSTRAINT "WissensEmpfaengerPerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WissensEmpfaengerGruppe" ADD CONSTRAINT "WissensEmpfaengerGruppe_artikelId_fkey" FOREIGN KEY ("artikelId") REFERENCES "WissensArtikel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WissensEmpfaengerGruppe" ADD CONSTRAINT "WissensEmpfaengerGruppe_gruppeId_fkey" FOREIGN KEY ("gruppeId") REFERENCES "Gruppe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WissensEmpfaengerAbteilung" ADD CONSTRAINT "WissensEmpfaengerAbteilung_artikelId_fkey" FOREIGN KEY ("artikelId") REFERENCES "WissensArtikel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WissensEmpfaengerAbteilung" ADD CONSTRAINT "WissensEmpfaengerAbteilung_abteilungId_fkey" FOREIGN KEY ("abteilungId") REFERENCES "Abteilung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WissensAnhang" ADD CONSTRAINT "WissensAnhang_artikelId_fkey" FOREIGN KEY ("artikelId") REFERENCES "WissensArtikel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WissensAnhang" ADD CONSTRAINT "WissensAnhang_hochgeladenVonId_fkey" FOREIGN KEY ("hochgeladenVonId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;
