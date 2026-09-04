-- CreateEnum
CREATE TYPE "Rolle" AS ENUM ('MITARBEITENDE', 'FUEHRUNGSKRAFT', 'WERKSTATTLEITER', 'REDAKTION', 'QM', 'ADMINISTRATION');

-- CreateEnum
CREATE TYPE "DokumentArt" AS ENUM ('NUTZUNGSVEREINBARUNG', 'UEBERGABEPROTOKOLL', 'DIENSTANWEISUNG', 'QM_DOKUMENT', 'SONSTIGES');

-- CreateEnum
CREATE TYPE "AusleiheStatus" AS ENUM ('ANGEFRAGT', 'ZUGESAGT', 'ABGELEHNT', 'VEREINBART', 'UEBERGEBEN', 'ZURUECKGEGEBEN', 'ABGESCHLOSSEN', 'STORNIERT');

-- CreateEnum
CREATE TYPE "Protokollrichtung" AS ENUM ('AUSGABE', 'RUECKNAHME');

-- CreateEnum
CREATE TYPE "Sauberkeit" AS ENUM ('SAUBER', 'NORMAL', 'VERSCHMUTZT');

-- CreateEnum
CREATE TYPE "Abrechnungsart" AS ENUM ('TANKDIFFERENZ', 'SELBSTBETEILIGUNG', 'SONSTIGES');

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "personalnummer" TEXT NOT NULL,
    "vorname" TEXT NOT NULL,
    "nachname" TEXT NOT NULL,
    "email" TEXT,
    "passwortHash" TEXT,
    "passwortWechselErforderlich" BOOLEAN NOT NULL DEFAULT true,
    "zweiFaktorAktiv" BOOLEAN NOT NULL DEFAULT false,
    "zweiFaktorSecret" TEXT,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "eintrittAm" TIMESTAMP(3),
    "austrittAm" TIMESTAMP(3),
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Standort" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kuerzel" TEXT NOT NULL,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Standort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Abteilung" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Abteilung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Zugehoerigkeit" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "standortId" TEXT NOT NULL,
    "abteilungId" TEXT NOT NULL,
    "rolle" "Rolle" NOT NULL DEFAULT 'MITARBEITENDE',
    "vonDatum" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bisDatum" TIMESTAMP(3),

    CONSTRAINT "Zugehoerigkeit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Protokoll" (
    "id" TEXT NOT NULL,
    "zeitpunkt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "akteurId" TEXT,
    "aktion" TEXT NOT NULL,
    "objektTyp" TEXT NOT NULL,
    "objektId" TEXT NOT NULL,
    "detail" JSONB,
    "ipAdresse" TEXT,

    CONSTRAINT "Protokoll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dokument" (
    "id" TEXT NOT NULL,
    "titel" TEXT NOT NULL,
    "art" "DokumentArt" NOT NULL,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dokument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dokumentversion" (
    "id" TEXT NOT NULL,
    "dokumentId" TEXT NOT NULL,
    "versionsnummer" INTEGER NOT NULL,
    "inhaltHtml" TEXT NOT NULL,
    "inhaltHash" TEXT NOT NULL,
    "selbstbeteiligungCent" INTEGER,
    "gueltigAb" TIMESTAMP(3) NOT NULL,
    "freigegebenAm" TIMESTAMP(3),
    "freigegebenVonId" TEXT,
    "aenderungshinweis" TEXT,

    CONSTRAINT "Dokumentversion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fahrzeug" (
    "id" TEXT NOT NULL,
    "kennzeichen" TEXT NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "sitzplaetze" INTEGER,
    "merkmale" TEXT,
    "bruttolistenpreisCent" INTEGER,
    "kraftstoffart" TEXT,
    "tankgroesseLiter" INTEGER,
    "fuerPrivatausleiheFreigegeben" BOOLEAN NOT NULL DEFAULT false,
    "standortId" TEXT,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Fahrzeug_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ausleihe" (
    "id" TEXT NOT NULL,
    "vorgangsnummer" TEXT NOT NULL,
    "fahrzeugId" TEXT NOT NULL,
    "entleiherId" TEXT NOT NULL,
    "zweck" TEXT NOT NULL,
    "geplantVon" TIMESTAMP(3) NOT NULL,
    "geplantBis" TIMESTAMP(3) NOT NULL,
    "status" "AusleiheStatus" NOT NULL DEFAULT 'ZUGESAGT',
    "angefragtAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entschiedenAm" TIMESTAMP(3),
    "entschiedenVonId" TEXT,
    "ablehnungsgrund" TEXT,
    "bemerkung" TEXT,
    "gefahreneKilometer" INTEGER,
    "bruttolistenpreisCentBeiAusleihe" INTEGER,
    "geldwerterVorteilCent" INTEGER,
    "kalendertage" INTEGER,
    "anLohnbuchhaltungGemeldetAm" TIMESTAMP(3),

    CONSTRAINT "Ausleihe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vereinbarung" (
    "id" TEXT NOT NULL,
    "ausleiheId" TEXT NOT NULL,
    "dokumentversionId" TEXT NOT NULL,
    "unterschriebenAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unterschriftEntleiherPfad" TEXT NOT NULL,
    "unterschriftFirmaPfad" TEXT NOT NULL,
    "unterschriebenVonFirmaId" TEXT NOT NULL,
    "selbstbeteiligungCent" INTEGER,
    "pdfPfad" TEXT NOT NULL,
    "pdfHash" TEXT NOT NULL,
    "versionHash" TEXT NOT NULL,
    "ipAdresse" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,

    CONSTRAINT "Vereinbarung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Uebergabeprotokoll" (
    "id" TEXT NOT NULL,
    "ausleiheId" TEXT NOT NULL,
    "richtung" "Protokollrichtung" NOT NULL,
    "dokumentversionId" TEXT NOT NULL,
    "zeitpunkt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kilometerstand" INTEGER NOT NULL,
    "tankfuellungAchtel" INTEGER NOT NULL,
    "sauberkeit" "Sauberkeit" NOT NULL DEFAULT 'NORMAL',
    "zubehoerVollstaendig" BOOLEAN NOT NULL DEFAULT true,
    "zubehoerBemerkung" TEXT,
    "bemerkung" TEXT,
    "durchgefuehrtVonId" TEXT NOT NULL,
    "unterschriftEntleiherPfad" TEXT NOT NULL,
    "unterschriftFirmaPfad" TEXT NOT NULL,
    "pdfPfad" TEXT NOT NULL,
    "pdfHash" TEXT NOT NULL,

    CONSTRAINT "Uebergabeprotokoll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Schaden" (
    "id" TEXT NOT NULL,
    "protokollId" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "beschreibung" TEXT NOT NULL,
    "neuAufgefallen" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Schaden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Schadensfoto" (
    "id" TEXT NOT NULL,
    "schadenId" TEXT NOT NULL,
    "pfad" TEXT NOT NULL,
    "aufgenommenAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Schadensfoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fuehrerscheinkontrolle" (
    "id" TEXT NOT NULL,
    "ausleiheId" TEXT NOT NULL,
    "geprueftAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geprueftVonId" TEXT NOT NULL,
    "klassen" TEXT NOT NULL,
    "gueltigBis" TIMESTAMP(3),
    "inOrdnung" BOOLEAN NOT NULL,
    "bemerkung" TEXT,

    CONSTRAINT "Fuehrerscheinkontrolle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Abrechnungsposten" (
    "id" TEXT NOT NULL,
    "ausleiheId" TEXT NOT NULL,
    "art" "Abrechnungsart" NOT NULL,
    "beschreibung" TEXT NOT NULL,
    "betragCent" INTEGER NOT NULL,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "erstelltVonId" TEXT NOT NULL,
    "erledigtAm" TIMESTAMP(3),
    "erledigtBemerkung" TEXT,

    CONSTRAINT "Abrechnungsposten_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Person_personalnummer_key" ON "Person"("personalnummer");

-- CreateIndex
CREATE UNIQUE INDEX "Person_email_key" ON "Person"("email");

-- CreateIndex
CREATE INDEX "Person_aktiv_idx" ON "Person"("aktiv");

-- CreateIndex
CREATE INDEX "Person_nachname_vorname_idx" ON "Person"("nachname", "vorname");

-- CreateIndex
CREATE UNIQUE INDEX "Standort_name_key" ON "Standort"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Standort_kuerzel_key" ON "Standort"("kuerzel");

-- CreateIndex
CREATE UNIQUE INDEX "Abteilung_name_key" ON "Abteilung"("name");

-- CreateIndex
CREATE INDEX "Zugehoerigkeit_personId_idx" ON "Zugehoerigkeit"("personId");

-- CreateIndex
CREATE INDEX "Zugehoerigkeit_standortId_idx" ON "Zugehoerigkeit"("standortId");

-- CreateIndex
CREATE INDEX "Zugehoerigkeit_abteilungId_idx" ON "Zugehoerigkeit"("abteilungId");

-- CreateIndex
CREATE UNIQUE INDEX "Zugehoerigkeit_personId_standortId_abteilungId_rolle_key" ON "Zugehoerigkeit"("personId", "standortId", "abteilungId", "rolle");

-- CreateIndex
CREATE INDEX "Protokoll_objektTyp_objektId_idx" ON "Protokoll"("objektTyp", "objektId");

-- CreateIndex
CREATE INDEX "Protokoll_zeitpunkt_idx" ON "Protokoll"("zeitpunkt");

-- CreateIndex
CREATE INDEX "Protokoll_akteurId_idx" ON "Protokoll"("akteurId");

-- CreateIndex
CREATE INDEX "Dokumentversion_dokumentId_gueltigAb_idx" ON "Dokumentversion"("dokumentId", "gueltigAb");

-- CreateIndex
CREATE UNIQUE INDEX "Dokumentversion_dokumentId_versionsnummer_key" ON "Dokumentversion"("dokumentId", "versionsnummer");

-- CreateIndex
CREATE UNIQUE INDEX "Fahrzeug_kennzeichen_key" ON "Fahrzeug"("kennzeichen");

-- CreateIndex
CREATE INDEX "Fahrzeug_fuerPrivatausleiheFreigegeben_aktiv_idx" ON "Fahrzeug"("fuerPrivatausleiheFreigegeben", "aktiv");

-- CreateIndex
CREATE UNIQUE INDEX "Ausleihe_vorgangsnummer_key" ON "Ausleihe"("vorgangsnummer");

-- CreateIndex
CREATE INDEX "Ausleihe_fahrzeugId_geplantVon_geplantBis_idx" ON "Ausleihe"("fahrzeugId", "geplantVon", "geplantBis");

-- CreateIndex
CREATE INDEX "Ausleihe_entleiherId_geplantVon_idx" ON "Ausleihe"("entleiherId", "geplantVon");

-- CreateIndex
CREATE INDEX "Ausleihe_status_idx" ON "Ausleihe"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Vereinbarung_ausleiheId_key" ON "Vereinbarung"("ausleiheId");

-- CreateIndex
CREATE INDEX "Vereinbarung_unterschriebenAm_idx" ON "Vereinbarung"("unterschriebenAm");

-- CreateIndex
CREATE INDEX "Uebergabeprotokoll_zeitpunkt_idx" ON "Uebergabeprotokoll"("zeitpunkt");

-- CreateIndex
CREATE UNIQUE INDEX "Uebergabeprotokoll_ausleiheId_richtung_key" ON "Uebergabeprotokoll"("ausleiheId", "richtung");

-- CreateIndex
CREATE UNIQUE INDEX "Fuehrerscheinkontrolle_ausleiheId_key" ON "Fuehrerscheinkontrolle"("ausleiheId");

-- CreateIndex
CREATE INDEX "Abrechnungsposten_ausleiheId_idx" ON "Abrechnungsposten"("ausleiheId");

-- CreateIndex
CREATE INDEX "Abrechnungsposten_erledigtAm_idx" ON "Abrechnungsposten"("erledigtAm");

-- AddForeignKey
ALTER TABLE "Zugehoerigkeit" ADD CONSTRAINT "Zugehoerigkeit_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zugehoerigkeit" ADD CONSTRAINT "Zugehoerigkeit_standortId_fkey" FOREIGN KEY ("standortId") REFERENCES "Standort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zugehoerigkeit" ADD CONSTRAINT "Zugehoerigkeit_abteilungId_fkey" FOREIGN KEY ("abteilungId") REFERENCES "Abteilung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Protokoll" ADD CONSTRAINT "Protokoll_akteurId_fkey" FOREIGN KEY ("akteurId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dokumentversion" ADD CONSTRAINT "Dokumentversion_dokumentId_fkey" FOREIGN KEY ("dokumentId") REFERENCES "Dokument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dokumentversion" ADD CONSTRAINT "Dokumentversion_freigegebenVonId_fkey" FOREIGN KEY ("freigegebenVonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fahrzeug" ADD CONSTRAINT "Fahrzeug_standortId_fkey" FOREIGN KEY ("standortId") REFERENCES "Standort"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ausleihe" ADD CONSTRAINT "Ausleihe_fahrzeugId_fkey" FOREIGN KEY ("fahrzeugId") REFERENCES "Fahrzeug"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ausleihe" ADD CONSTRAINT "Ausleihe_entleiherId_fkey" FOREIGN KEY ("entleiherId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ausleihe" ADD CONSTRAINT "Ausleihe_entschiedenVonId_fkey" FOREIGN KEY ("entschiedenVonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vereinbarung" ADD CONSTRAINT "Vereinbarung_ausleiheId_fkey" FOREIGN KEY ("ausleiheId") REFERENCES "Ausleihe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vereinbarung" ADD CONSTRAINT "Vereinbarung_dokumentversionId_fkey" FOREIGN KEY ("dokumentversionId") REFERENCES "Dokumentversion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vereinbarung" ADD CONSTRAINT "Vereinbarung_unterschriebenVonFirmaId_fkey" FOREIGN KEY ("unterschriebenVonFirmaId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Uebergabeprotokoll" ADD CONSTRAINT "Uebergabeprotokoll_ausleiheId_fkey" FOREIGN KEY ("ausleiheId") REFERENCES "Ausleihe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Uebergabeprotokoll" ADD CONSTRAINT "Uebergabeprotokoll_dokumentversionId_fkey" FOREIGN KEY ("dokumentversionId") REFERENCES "Dokumentversion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Uebergabeprotokoll" ADD CONSTRAINT "Uebergabeprotokoll_durchgefuehrtVonId_fkey" FOREIGN KEY ("durchgefuehrtVonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schaden" ADD CONSTRAINT "Schaden_protokollId_fkey" FOREIGN KEY ("protokollId") REFERENCES "Uebergabeprotokoll"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schadensfoto" ADD CONSTRAINT "Schadensfoto_schadenId_fkey" FOREIGN KEY ("schadenId") REFERENCES "Schaden"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fuehrerscheinkontrolle" ADD CONSTRAINT "Fuehrerscheinkontrolle_ausleiheId_fkey" FOREIGN KEY ("ausleiheId") REFERENCES "Ausleihe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fuehrerscheinkontrolle" ADD CONSTRAINT "Fuehrerscheinkontrolle_geprueftVonId_fkey" FOREIGN KEY ("geprueftVonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Abrechnungsposten" ADD CONSTRAINT "Abrechnungsposten_ausleiheId_fkey" FOREIGN KEY ("ausleiheId") REFERENCES "Ausleihe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Abrechnungsposten" ADD CONSTRAINT "Abrechnungsposten_erstelltVonId_fkey" FOREIGN KEY ("erstelltVonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
