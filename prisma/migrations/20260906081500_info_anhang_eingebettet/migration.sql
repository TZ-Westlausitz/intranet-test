-- Markiert Anhänge, die über den Bild-Knopf in den Fließtext eingefügt
-- wurden, statt separat hochgeladen — verhindert doppelte Anzeige in der
-- allgemeinen Anhänge-Liste (siehe Kommentar am Model InfoAnhang).
ALTER TABLE "InfoAnhang" ADD COLUMN "eingebettet" BOOLEAN NOT NULL DEFAULT false;
