-- Farben der Termin-Kategorie umbenannt, um Verwechslung mit den
-- Firmenfarben zu vermeiden: Hellgrün/Orange -> Dunkelgrün/Gelb.
-- ALTER TYPE ... RENAME VALUE erhält bestehende Zeilen automatisch.
ALTER TYPE "TerminFarbe" RENAME VALUE 'GRUEN' TO 'DUNKELGRUEN';
ALTER TYPE "TerminFarbe" RENAME VALUE 'ORANGE' TO 'GELB';
