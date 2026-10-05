-- CreateTable
CREATE TABLE "FahrzeugschadenFoto" (
    "id" TEXT NOT NULL,
    "schadenId" TEXT NOT NULL,
    "pfad" TEXT NOT NULL,
    "mimetyp" TEXT NOT NULL,
    "groesseBytes" INTEGER NOT NULL,
    "hochgeladenAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hochgeladenVonId" TEXT NOT NULL,

    CONSTRAINT "FahrzeugschadenFoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FahrzeugschadenFoto_schadenId_idx" ON "FahrzeugschadenFoto"("schadenId");

-- AddForeignKey
ALTER TABLE "FahrzeugschadenFoto" ADD CONSTRAINT "FahrzeugschadenFoto_schadenId_fkey" FOREIGN KEY ("schadenId") REFERENCES "Fahrzeugschaden"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FahrzeugschadenFoto" ADD CONSTRAINT "FahrzeugschadenFoto_hochgeladenVonId_fkey" FOREIGN KEY ("hochgeladenVonId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;
