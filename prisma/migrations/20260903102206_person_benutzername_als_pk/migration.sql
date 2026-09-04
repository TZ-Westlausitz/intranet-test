-- Person.benutzername wird der Primärschlüssel, die bisherige separate
-- cuid-Spalte "id" entfällt. Alle Fremdschlüssel, die bisher auf Person.id
-- zeigten, zeigen künftig auf Person.benutzername — Werte werden dafür
-- umgeschrieben, keine Zeile geht verloren.
--
-- Reihenfolge zwingend: erst alle Fremdschlüssel-Constraints lösen (sonst
-- verletzt das Umschreiben der Spaltenwerte im nächsten Schritt die
-- bestehenden Constraints), dann die Werte umschreiben, dann den
-- Primärschlüssel selbst tauschen, zuletzt die Fremdschlüssel neu anlegen —
-- jetzt mit ON UPDATE CASCADE, damit eine spätere Umbenennung des
-- Benutzernamens (siehe personBenutzernameAktualisieren) automatisch in
-- jede referenzierende Tabelle durchschlägt, statt die Aktion mit einer
-- Fremdschlüssel-Verletzung abzubrechen.

-- 1. Bestehende Fremdschlüssel-Constraints auf Person(id) lösen.
ALTER TABLE "Abrechnungsposten" DROP CONSTRAINT "Abrechnungsposten_erstelltVonId_fkey";
ALTER TABLE "Aufgabe" DROP CONSTRAINT "Aufgabe_personId_fkey";
ALTER TABLE "Auftrag" DROP CONSTRAINT "Auftrag_erstelltVonId_fkey";
ALTER TABLE "Auftrag" DROP CONSTRAINT "Auftrag_zugewiesenAnId_fkey";
ALTER TABLE "AuftragKommentar" DROP CONSTRAINT "AuftragKommentar_personId_fkey";
ALTER TABLE "Ausleihe" DROP CONSTRAINT "Ausleihe_entleiherId_fkey";
ALTER TABLE "Ausleihe" DROP CONSTRAINT "Ausleihe_entschiedenVonId_fkey";
ALTER TABLE "Benachrichtigung" DROP CONSTRAINT "Benachrichtigung_personId_fkey";
ALTER TABLE "Dokumentversion" DROP CONSTRAINT "Dokumentversion_freigegebenVonId_fkey";
ALTER TABLE "Fuehrerscheinkontrolle" DROP CONSTRAINT "Fuehrerscheinkontrolle_geprueftVonId_fkey";
ALTER TABLE "PersonBerechtigung" DROP CONSTRAINT "PersonBerechtigung_personId_fkey";
ALTER TABLE "PersonGruppe" DROP CONSTRAINT "PersonGruppe_personId_fkey";
ALTER TABLE "Protokoll" DROP CONSTRAINT "Protokoll_akteurId_fkey";
ALTER TABLE "Termin" DROP CONSTRAINT "Termin_erstelltVonId_fkey";
ALTER TABLE "TerminAnhang" DROP CONSTRAINT "TerminAnhang_hochgeladenVonId_fkey";
ALTER TABLE "TerminKommentar" DROP CONSTRAINT "TerminKommentar_personId_fkey";
ALTER TABLE "TerminTeilnehmer" DROP CONSTRAINT "TerminTeilnehmer_personId_fkey";
ALTER TABLE "Uebergabeprotokoll" DROP CONSTRAINT "Uebergabeprotokoll_durchgefuehrtVonId_fkey";
ALTER TABLE "Vereinbarung" DROP CONSTRAINT "Vereinbarung_unterschriebenVonFirmaId_fkey";
ALTER TABLE "Zugehoerigkeit" DROP CONSTRAINT "Zugehoerigkeit_personId_fkey";

-- 2. Spaltenwerte umschreiben: alte cuid -> benutzername derselben Person.
UPDATE "Abrechnungsposten" t SET "erstelltVonId" = p."benutzername" FROM "Person" p WHERE p."id" = t."erstelltVonId";
UPDATE "Aufgabe" t SET "personId" = p."benutzername" FROM "Person" p WHERE p."id" = t."personId";
UPDATE "Auftrag" t SET "erstelltVonId" = p."benutzername" FROM "Person" p WHERE p."id" = t."erstelltVonId";
UPDATE "Auftrag" t SET "zugewiesenAnId" = p."benutzername" FROM "Person" p WHERE p."id" = t."zugewiesenAnId";
UPDATE "AuftragKommentar" t SET "personId" = p."benutzername" FROM "Person" p WHERE p."id" = t."personId";
UPDATE "Ausleihe" t SET "entleiherId" = p."benutzername" FROM "Person" p WHERE p."id" = t."entleiherId";
UPDATE "Ausleihe" t SET "entschiedenVonId" = p."benutzername" FROM "Person" p WHERE p."id" = t."entschiedenVonId" AND t."entschiedenVonId" IS NOT NULL;
UPDATE "Benachrichtigung" t SET "personId" = p."benutzername" FROM "Person" p WHERE p."id" = t."personId";
UPDATE "Dokumentversion" t SET "freigegebenVonId" = p."benutzername" FROM "Person" p WHERE p."id" = t."freigegebenVonId" AND t."freigegebenVonId" IS NOT NULL;
UPDATE "Fuehrerscheinkontrolle" t SET "geprueftVonId" = p."benutzername" FROM "Person" p WHERE p."id" = t."geprueftVonId";
UPDATE "PersonBerechtigung" t SET "personId" = p."benutzername" FROM "Person" p WHERE p."id" = t."personId";
UPDATE "PersonGruppe" t SET "personId" = p."benutzername" FROM "Person" p WHERE p."id" = t."personId";
UPDATE "Protokoll" t SET "akteurId" = p."benutzername" FROM "Person" p WHERE p."id" = t."akteurId" AND t."akteurId" IS NOT NULL;
UPDATE "Termin" t SET "erstelltVonId" = p."benutzername" FROM "Person" p WHERE p."id" = t."erstelltVonId";
UPDATE "TerminAnhang" t SET "hochgeladenVonId" = p."benutzername" FROM "Person" p WHERE p."id" = t."hochgeladenVonId";
UPDATE "TerminKommentar" t SET "personId" = p."benutzername" FROM "Person" p WHERE p."id" = t."personId";
UPDATE "TerminTeilnehmer" t SET "personId" = p."benutzername" FROM "Person" p WHERE p."id" = t."personId";
UPDATE "Uebergabeprotokoll" t SET "durchgefuehrtVonId" = p."benutzername" FROM "Person" p WHERE p."id" = t."durchgefuehrtVonId";
UPDATE "Vereinbarung" t SET "unterschriebenVonFirmaId" = p."benutzername" FROM "Person" p WHERE p."id" = t."unterschriebenVonFirmaId";
UPDATE "Zugehoerigkeit" t SET "personId" = p."benutzername" FROM "Person" p WHERE p."id" = t."personId";

-- 3. Primärschlüssel von Person tauschen: "id" raus, "benutzername" rein.
-- Der bestehende Unique-Index auf benutzername (aus @unique, historisch
-- noch "Person_personalnummer_key" benannt) wird dabei zum Primärschlüssel-
-- Index befördert und automatisch auf "Person_pkey" umbenannt — kein
-- zusätzlicher Index nötig.
ALTER TABLE "Person" DROP CONSTRAINT "Person_pkey";
ALTER TABLE "Person" DROP COLUMN "id";
ALTER TABLE "Person" ADD CONSTRAINT "Person_pkey" PRIMARY KEY USING INDEX "Person_personalnummer_key";

-- 4. Fremdschlüssel neu anlegen, jetzt auf Person(benutzername) — gleiches
-- ON DELETE-Verhalten wie vorher, zusätzlich ON UPDATE CASCADE.
ALTER TABLE "Abrechnungsposten" ADD CONSTRAINT "Abrechnungsposten_erstelltVonId_fkey" FOREIGN KEY ("erstelltVonId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Aufgabe" ADD CONSTRAINT "Aufgabe_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Auftrag" ADD CONSTRAINT "Auftrag_erstelltVonId_fkey" FOREIGN KEY ("erstelltVonId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Auftrag" ADD CONSTRAINT "Auftrag_zugewiesenAnId_fkey" FOREIGN KEY ("zugewiesenAnId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuftragKommentar" ADD CONSTRAINT "AuftragKommentar_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ausleihe" ADD CONSTRAINT "Ausleihe_entleiherId_fkey" FOREIGN KEY ("entleiherId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ausleihe" ADD CONSTRAINT "Ausleihe_entschiedenVonId_fkey" FOREIGN KEY ("entschiedenVonId") REFERENCES "Person"("benutzername") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Benachrichtigung" ADD CONSTRAINT "Benachrichtigung_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Dokumentversion" ADD CONSTRAINT "Dokumentversion_freigegebenVonId_fkey" FOREIGN KEY ("freigegebenVonId") REFERENCES "Person"("benutzername") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Fuehrerscheinkontrolle" ADD CONSTRAINT "Fuehrerscheinkontrolle_geprueftVonId_fkey" FOREIGN KEY ("geprueftVonId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PersonBerechtigung" ADD CONSTRAINT "PersonBerechtigung_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PersonGruppe" ADD CONSTRAINT "PersonGruppe_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Protokoll" ADD CONSTRAINT "Protokoll_akteurId_fkey" FOREIGN KEY ("akteurId") REFERENCES "Person"("benutzername") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Termin" ADD CONSTRAINT "Termin_erstelltVonId_fkey" FOREIGN KEY ("erstelltVonId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TerminAnhang" ADD CONSTRAINT "TerminAnhang_hochgeladenVonId_fkey" FOREIGN KEY ("hochgeladenVonId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TerminKommentar" ADD CONSTRAINT "TerminKommentar_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TerminTeilnehmer" ADD CONSTRAINT "TerminTeilnehmer_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Uebergabeprotokoll" ADD CONSTRAINT "Uebergabeprotokoll_durchgefuehrtVonId_fkey" FOREIGN KEY ("durchgefuehrtVonId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Vereinbarung" ADD CONSTRAINT "Vereinbarung_unterschriebenVonFirmaId_fkey" FOREIGN KEY ("unterschriebenVonFirmaId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Zugehoerigkeit" ADD CONSTRAINT "Zugehoerigkeit_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;
