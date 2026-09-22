-- CreateEnum
CREATE TYPE "MeldungStatus" AS ENUM ('EINGEGANGEN', 'IN_BEARBEITUNG', 'ABGESCHLOSSEN');

-- DropForeignKey
ALTER TABLE "Aufgabe" DROP CONSTRAINT "Aufgabe_personId_fkey";

-- DropForeignKey
ALTER TABLE "Info" DROP CONSTRAINT "Info_kategorieId_fkey";

-- CreateTable
CREATE TABLE "Meldung" (
    "id" TEXT NOT NULL,
    "titel" TEXT NOT NULL,
    "beschreibung" TEXT NOT NULL,
    "istAnonym" BOOLEAN NOT NULL DEFAULT false,
    "status" "MeldungStatus" NOT NULL DEFAULT 'EINGEGANGEN',
    "erstelltVonId" TEXT NOT NULL,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Meldung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeldungKommentar" (
    "id" TEXT NOT NULL,
    "meldungId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeldungKommentar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeldungAnhang" (
    "id" TEXT NOT NULL,
    "meldungId" TEXT NOT NULL,
    "kommentarId" TEXT,
    "dateiname" TEXT NOT NULL,
    "pfad" TEXT NOT NULL,
    "mimetyp" TEXT NOT NULL,
    "groesseBytes" INTEGER NOT NULL,
    "hochgeladenAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeldungAnhang_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Meldung_erstelltVonId_idx" ON "Meldung"("erstelltVonId");

-- CreateIndex
CREATE INDEX "Meldung_status_idx" ON "Meldung"("status");

-- CreateIndex
CREATE INDEX "MeldungKommentar_meldungId_erstelltAm_idx" ON "MeldungKommentar"("meldungId", "erstelltAm");

-- CreateIndex
CREATE INDEX "MeldungAnhang_meldungId_idx" ON "MeldungAnhang"("meldungId");

-- CreateIndex
CREATE INDEX "MeldungAnhang_kommentarId_idx" ON "MeldungAnhang"("kommentarId");

-- AddForeignKey
ALTER TABLE "Aufgabe" ADD CONSTRAINT "Aufgabe_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("benutzername") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Info" ADD CONSTRAINT "Info_kategorieId_fkey" FOREIGN KEY ("kategorieId") REFERENCES "InfoKategorie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meldung" ADD CONSTRAINT "Meldung_erstelltVonId_fkey" FOREIGN KEY ("erstelltVonId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeldungKommentar" ADD CONSTRAINT "MeldungKommentar_meldungId_fkey" FOREIGN KEY ("meldungId") REFERENCES "Meldung"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeldungKommentar" ADD CONSTRAINT "MeldungKommentar_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeldungAnhang" ADD CONSTRAINT "MeldungAnhang_meldungId_fkey" FOREIGN KEY ("meldungId") REFERENCES "Meldung"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeldungAnhang" ADD CONSTRAINT "MeldungAnhang_kommentarId_fkey" FOREIGN KEY ("kommentarId") REFERENCES "MeldungKommentar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

