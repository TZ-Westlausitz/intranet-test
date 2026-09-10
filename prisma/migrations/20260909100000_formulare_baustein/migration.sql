-- CreateEnum
CREATE TYPE "FormularElementTyp" AS ENUM ('TEXT_EINZEILIG', 'TEXT_MEHRZEILIG', 'ZAHL', 'DATUM', 'AUSWAHL_EINZEL', 'AUSWAHL_MEHRFACH', 'CHECKBOX', 'DATEI', 'ORT', 'TEXTBLOCK');

-- CreateEnum
CREATE TYPE "FormularEinreichungStatus" AS ENUM ('OFFEN', 'IN_BEARBEITUNG', 'ERLEDIGT');

-- CreateTable
CREATE TABLE "FormularVorlage" (
    "id" TEXT NOT NULL,
    "titel" TEXT NOT NULL,
    "beschreibung" TEXT,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "pdfExport" BOOLEAN NOT NULL DEFAULT false,
    "empfaengerPersonId" TEXT,
    "empfaengerGruppeId" TEXT,
    "erstelltVonId" TEXT NOT NULL,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormularVorlage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormularElement" (
    "id" TEXT NOT NULL,
    "vorlageId" TEXT NOT NULL,
    "typ" "FormularElementTyp" NOT NULL,
    "reihenfolge" INTEGER NOT NULL,
    "label" TEXT,
    "pflicht" BOOLEAN NOT NULL DEFAULT false,
    "inhalt" TEXT,

    CONSTRAINT "FormularElement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormularElementOption" (
    "id" TEXT NOT NULL,
    "elementId" TEXT NOT NULL,
    "wert" TEXT NOT NULL,
    "reihenfolge" INTEGER NOT NULL,

    CONSTRAINT "FormularElementOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormularBenutzbarPerson" (
    "id" TEXT NOT NULL,
    "vorlageId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,

    CONSTRAINT "FormularBenutzbarPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormularBenutzbarGruppe" (
    "id" TEXT NOT NULL,
    "vorlageId" TEXT NOT NULL,
    "gruppeId" TEXT NOT NULL,

    CONSTRAINT "FormularBenutzbarGruppe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormularBenutzbarAbteilung" (
    "id" TEXT NOT NULL,
    "vorlageId" TEXT NOT NULL,
    "abteilungId" TEXT NOT NULL,

    CONSTRAINT "FormularBenutzbarAbteilung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormularEinreichung" (
    "id" TEXT NOT NULL,
    "vorlageId" TEXT NOT NULL,
    "eingereichtVonId" TEXT NOT NULL,
    "eingereichtAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "FormularEinreichungStatus" NOT NULL DEFAULT 'OFFEN',
    "pdfPfad" TEXT,

    CONSTRAINT "FormularEinreichung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormularAntwort" (
    "id" TEXT NOT NULL,
    "einreichungId" TEXT NOT NULL,
    "elementId" TEXT NOT NULL,
    "wertText" TEXT,
    "wertMehrfach" TEXT[],
    "wertJa" BOOLEAN,

    CONSTRAINT "FormularAntwort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormularEinreichungAnhang" (
    "id" TEXT NOT NULL,
    "einreichungId" TEXT NOT NULL,
    "elementId" TEXT,
    "dateiname" TEXT NOT NULL,
    "pfad" TEXT NOT NULL,
    "mimetyp" TEXT NOT NULL,
    "groesseBytes" INTEGER NOT NULL,
    "hochgeladenAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormularEinreichungAnhang_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FormularVorlage_aktiv_idx" ON "FormularVorlage"("aktiv");

-- CreateIndex
CREATE INDEX "FormularElement_vorlageId_idx" ON "FormularElement"("vorlageId");

-- CreateIndex
CREATE INDEX "FormularElementOption_elementId_idx" ON "FormularElementOption"("elementId");

-- CreateIndex
CREATE INDEX "FormularBenutzbarPerson_personId_idx" ON "FormularBenutzbarPerson"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "FormularBenutzbarPerson_vorlageId_personId_key" ON "FormularBenutzbarPerson"("vorlageId", "personId");

-- CreateIndex
CREATE INDEX "FormularBenutzbarGruppe_gruppeId_idx" ON "FormularBenutzbarGruppe"("gruppeId");

-- CreateIndex
CREATE UNIQUE INDEX "FormularBenutzbarGruppe_vorlageId_gruppeId_key" ON "FormularBenutzbarGruppe"("vorlageId", "gruppeId");

-- CreateIndex
CREATE INDEX "FormularBenutzbarAbteilung_abteilungId_idx" ON "FormularBenutzbarAbteilung"("abteilungId");

-- CreateIndex
CREATE UNIQUE INDEX "FormularBenutzbarAbteilung_vorlageId_abteilungId_key" ON "FormularBenutzbarAbteilung"("vorlageId", "abteilungId");

-- CreateIndex
CREATE INDEX "FormularEinreichung_vorlageId_idx" ON "FormularEinreichung"("vorlageId");

-- CreateIndex
CREATE INDEX "FormularEinreichung_eingereichtVonId_idx" ON "FormularEinreichung"("eingereichtVonId");

-- CreateIndex
CREATE INDEX "FormularAntwort_elementId_idx" ON "FormularAntwort"("elementId");

-- CreateIndex
CREATE UNIQUE INDEX "FormularAntwort_einreichungId_elementId_key" ON "FormularAntwort"("einreichungId", "elementId");

-- CreateIndex
CREATE INDEX "FormularEinreichungAnhang_einreichungId_idx" ON "FormularEinreichungAnhang"("einreichungId");

-- AddForeignKey
ALTER TABLE "FormularVorlage" ADD CONSTRAINT "FormularVorlage_erstelltVonId_fkey" FOREIGN KEY ("erstelltVonId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormularVorlage" ADD CONSTRAINT "FormularVorlage_empfaengerPersonId_fkey" FOREIGN KEY ("empfaengerPersonId") REFERENCES "Person"("benutzername") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormularVorlage" ADD CONSTRAINT "FormularVorlage_empfaengerGruppeId_fkey" FOREIGN KEY ("empfaengerGruppeId") REFERENCES "Gruppe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormularElement" ADD CONSTRAINT "FormularElement_vorlageId_fkey" FOREIGN KEY ("vorlageId") REFERENCES "FormularVorlage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormularElementOption" ADD CONSTRAINT "FormularElementOption_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "FormularElement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormularBenutzbarPerson" ADD CONSTRAINT "FormularBenutzbarPerson_vorlageId_fkey" FOREIGN KEY ("vorlageId") REFERENCES "FormularVorlage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormularBenutzbarPerson" ADD CONSTRAINT "FormularBenutzbarPerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormularBenutzbarGruppe" ADD CONSTRAINT "FormularBenutzbarGruppe_vorlageId_fkey" FOREIGN KEY ("vorlageId") REFERENCES "FormularVorlage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormularBenutzbarGruppe" ADD CONSTRAINT "FormularBenutzbarGruppe_gruppeId_fkey" FOREIGN KEY ("gruppeId") REFERENCES "Gruppe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormularBenutzbarAbteilung" ADD CONSTRAINT "FormularBenutzbarAbteilung_vorlageId_fkey" FOREIGN KEY ("vorlageId") REFERENCES "FormularVorlage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormularBenutzbarAbteilung" ADD CONSTRAINT "FormularBenutzbarAbteilung_abteilungId_fkey" FOREIGN KEY ("abteilungId") REFERENCES "Abteilung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormularEinreichung" ADD CONSTRAINT "FormularEinreichung_vorlageId_fkey" FOREIGN KEY ("vorlageId") REFERENCES "FormularVorlage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormularEinreichung" ADD CONSTRAINT "FormularEinreichung_eingereichtVonId_fkey" FOREIGN KEY ("eingereichtVonId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormularAntwort" ADD CONSTRAINT "FormularAntwort_einreichungId_fkey" FOREIGN KEY ("einreichungId") REFERENCES "FormularEinreichung"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormularAntwort" ADD CONSTRAINT "FormularAntwort_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "FormularElement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormularEinreichungAnhang" ADD CONSTRAINT "FormularEinreichungAnhang_einreichungId_fkey" FOREIGN KEY ("einreichungId") REFERENCES "FormularEinreichung"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormularEinreichungAnhang" ADD CONSTRAINT "FormularEinreichungAnhang_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "FormularElement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
