-- Von Hand geschrieben statt von `prisma migrate dev` generiert: eine
-- automatisch generierte Migration hätte "personalnummer" gelöscht und
-- "benutzername" neu angelegt (Datenverlust für alle bestehenden Logins).
-- RENAME COLUMN erhält die Werte und den bestehenden Unique-Index.
ALTER TABLE "Person" RENAME COLUMN "personalnummer" TO "benutzername";

-- AlterTable
ALTER TABLE "Abteilung" ADD COLUMN "kuerzel" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Abteilung_kuerzel_key" ON "Abteilung"("kuerzel");
