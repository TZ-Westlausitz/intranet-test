-- Neuer Zwischenschritt IN_ARBEIT zwischen ANGENOMMEN und ERLEDIGT, damit
-- sichtbar wird, wann eine Person tatsächlich mit einer Projekt-Aufgabe zu
-- arbeiten beginnt (statt nur "angenommen, aber evtl. noch gar nicht dran").
ALTER TYPE "AufgabeStatus" ADD VALUE 'IN_ARBEIT' AFTER 'ANGENOMMEN';
