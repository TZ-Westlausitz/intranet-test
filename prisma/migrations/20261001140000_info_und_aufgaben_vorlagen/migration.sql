-- CreateTable
CREATE TABLE "AufgabenVorlage" (
    "id" TEXT NOT NULL,
    "titel" TEXT NOT NULL,
    "beschreibung" TEXT,
    "prioritaet" "AufgabePrioritaet" NOT NULL DEFAULT 'MITTEL',
    "faelligInTagen" INTEGER,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "erstelltVonId" TEXT NOT NULL,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AufgabenVorlage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AufgabenVorlageBenutzbarPerson" (
    "id" TEXT NOT NULL,
    "vorlageId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,

    CONSTRAINT "AufgabenVorlageBenutzbarPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AufgabenVorlageBenutzbarGruppe" (
    "id" TEXT NOT NULL,
    "vorlageId" TEXT NOT NULL,
    "gruppeId" TEXT NOT NULL,

    CONSTRAINT "AufgabenVorlageBenutzbarGruppe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AufgabenVorlageBenutzbarAbteilung" (
    "id" TEXT NOT NULL,
    "vorlageId" TEXT NOT NULL,
    "abteilungId" TEXT NOT NULL,

    CONSTRAINT "AufgabenVorlageBenutzbarAbteilung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfoVorlage" (
    "id" TEXT NOT NULL,
    "titel" TEXT NOT NULL,
    "inhalt" TEXT,
    "kategorieId" TEXT,
    "mitBestaetigung" BOOLEAN NOT NULL DEFAULT false,
    "kommentareErlaubt" BOOLEAN NOT NULL DEFAULT true,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "erstelltVonId" TEXT NOT NULL,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InfoVorlage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfoVorlageBenutzbarPerson" (
    "id" TEXT NOT NULL,
    "vorlageId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,

    CONSTRAINT "InfoVorlageBenutzbarPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfoVorlageBenutzbarGruppe" (
    "id" TEXT NOT NULL,
    "vorlageId" TEXT NOT NULL,
    "gruppeId" TEXT NOT NULL,

    CONSTRAINT "InfoVorlageBenutzbarGruppe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfoVorlageBenutzbarAbteilung" (
    "id" TEXT NOT NULL,
    "vorlageId" TEXT NOT NULL,
    "abteilungId" TEXT NOT NULL,

    CONSTRAINT "InfoVorlageBenutzbarAbteilung_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AufgabenVorlage_aktiv_idx" ON "AufgabenVorlage"("aktiv");

-- CreateIndex
CREATE INDEX "AufgabenVorlageBenutzbarPerson_personId_idx" ON "AufgabenVorlageBenutzbarPerson"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "AufgabenVorlageBenutzbarPerson_vorlageId_personId_key" ON "AufgabenVorlageBenutzbarPerson"("vorlageId", "personId");

-- CreateIndex
CREATE INDEX "AufgabenVorlageBenutzbarGruppe_gruppeId_idx" ON "AufgabenVorlageBenutzbarGruppe"("gruppeId");

-- CreateIndex
CREATE UNIQUE INDEX "AufgabenVorlageBenutzbarGruppe_vorlageId_gruppeId_key" ON "AufgabenVorlageBenutzbarGruppe"("vorlageId", "gruppeId");

-- CreateIndex
CREATE INDEX "AufgabenVorlageBenutzbarAbteilung_abteilungId_idx" ON "AufgabenVorlageBenutzbarAbteilung"("abteilungId");

-- CreateIndex
CREATE UNIQUE INDEX "AufgabenVorlageBenutzbarAbteilung_vorlageId_abteilungId_key" ON "AufgabenVorlageBenutzbarAbteilung"("vorlageId", "abteilungId");

-- CreateIndex
CREATE INDEX "InfoVorlage_aktiv_idx" ON "InfoVorlage"("aktiv");

-- CreateIndex
CREATE INDEX "InfoVorlage_kategorieId_idx" ON "InfoVorlage"("kategorieId");

-- CreateIndex
CREATE INDEX "InfoVorlageBenutzbarPerson_personId_idx" ON "InfoVorlageBenutzbarPerson"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "InfoVorlageBenutzbarPerson_vorlageId_personId_key" ON "InfoVorlageBenutzbarPerson"("vorlageId", "personId");

-- CreateIndex
CREATE INDEX "InfoVorlageBenutzbarGruppe_gruppeId_idx" ON "InfoVorlageBenutzbarGruppe"("gruppeId");

-- CreateIndex
CREATE UNIQUE INDEX "InfoVorlageBenutzbarGruppe_vorlageId_gruppeId_key" ON "InfoVorlageBenutzbarGruppe"("vorlageId", "gruppeId");

-- CreateIndex
CREATE INDEX "InfoVorlageBenutzbarAbteilung_abteilungId_idx" ON "InfoVorlageBenutzbarAbteilung"("abteilungId");

-- CreateIndex
CREATE UNIQUE INDEX "InfoVorlageBenutzbarAbteilung_vorlageId_abteilungId_key" ON "InfoVorlageBenutzbarAbteilung"("vorlageId", "abteilungId");

-- AddForeignKey
ALTER TABLE "AufgabenVorlage" ADD CONSTRAINT "AufgabenVorlage_erstelltVonId_fkey" FOREIGN KEY ("erstelltVonId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AufgabenVorlageBenutzbarPerson" ADD CONSTRAINT "AufgabenVorlageBenutzbarPerson_vorlageId_fkey" FOREIGN KEY ("vorlageId") REFERENCES "AufgabenVorlage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AufgabenVorlageBenutzbarPerson" ADD CONSTRAINT "AufgabenVorlageBenutzbarPerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AufgabenVorlageBenutzbarGruppe" ADD CONSTRAINT "AufgabenVorlageBenutzbarGruppe_vorlageId_fkey" FOREIGN KEY ("vorlageId") REFERENCES "AufgabenVorlage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AufgabenVorlageBenutzbarGruppe" ADD CONSTRAINT "AufgabenVorlageBenutzbarGruppe_gruppeId_fkey" FOREIGN KEY ("gruppeId") REFERENCES "Gruppe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AufgabenVorlageBenutzbarAbteilung" ADD CONSTRAINT "AufgabenVorlageBenutzbarAbteilung_vorlageId_fkey" FOREIGN KEY ("vorlageId") REFERENCES "AufgabenVorlage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AufgabenVorlageBenutzbarAbteilung" ADD CONSTRAINT "AufgabenVorlageBenutzbarAbteilung_abteilungId_fkey" FOREIGN KEY ("abteilungId") REFERENCES "Abteilung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfoVorlage" ADD CONSTRAINT "InfoVorlage_erstelltVonId_fkey" FOREIGN KEY ("erstelltVonId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfoVorlage" ADD CONSTRAINT "InfoVorlage_kategorieId_fkey" FOREIGN KEY ("kategorieId") REFERENCES "InfoKategorie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfoVorlageBenutzbarPerson" ADD CONSTRAINT "InfoVorlageBenutzbarPerson_vorlageId_fkey" FOREIGN KEY ("vorlageId") REFERENCES "InfoVorlage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfoVorlageBenutzbarPerson" ADD CONSTRAINT "InfoVorlageBenutzbarPerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfoVorlageBenutzbarGruppe" ADD CONSTRAINT "InfoVorlageBenutzbarGruppe_vorlageId_fkey" FOREIGN KEY ("vorlageId") REFERENCES "InfoVorlage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfoVorlageBenutzbarGruppe" ADD CONSTRAINT "InfoVorlageBenutzbarGruppe_gruppeId_fkey" FOREIGN KEY ("gruppeId") REFERENCES "Gruppe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfoVorlageBenutzbarAbteilung" ADD CONSTRAINT "InfoVorlageBenutzbarAbteilung_vorlageId_fkey" FOREIGN KEY ("vorlageId") REFERENCES "InfoVorlage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfoVorlageBenutzbarAbteilung" ADD CONSTRAINT "InfoVorlageBenutzbarAbteilung_abteilungId_fkey" FOREIGN KEY ("abteilungId") REFERENCES "Abteilung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

