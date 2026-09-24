-- AlterTable
ALTER TABLE "ChatKonversationTeilnehmer" ADD COLUMN     "istGruppenAdmin" BOOLEAN NOT NULL DEFAULT false;

-- Bootstrap: für bereits bestehende, frei angelegte Gruppen (gruppeId NULL,
-- titel gesetzt) ist nirgends festgehalten, wer sie ursprünglich erstellt
-- hat — deshalb bekommen bei dieser einmaligen Umstellung ALLE aktuellen
-- Mitglieder Gruppenadminrechte, statt dass eine Gruppe für immer ohne
-- verwaltende Person dasteht. Ab jetzt gilt: nur noch die erstellende
-- Person (automatisch) bzw. wer von ihr befördert wurde.
UPDATE "ChatKonversationTeilnehmer" t
SET "istGruppenAdmin" = true
FROM "ChatKonversation" k
WHERE t."konversationId" = k.id
  AND k."gruppeId" IS NULL
  AND k."titel" IS NOT NULL;
