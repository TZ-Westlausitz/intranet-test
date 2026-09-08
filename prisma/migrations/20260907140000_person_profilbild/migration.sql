-- Freiwilliges Profilbild — nur Pfad + Mimetyp, die Datei selbst liegt auf dem Volume (Regel 7).
ALTER TABLE "Person" ADD COLUMN "profilbildPfad" TEXT;
ALTER TABLE "Person" ADD COLUMN "profilbildMimetyp" TEXT;
