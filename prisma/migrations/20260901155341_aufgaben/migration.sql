-- CreateTable
CREATE TABLE "Aufgabe" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "titel" TEXT NOT NULL,
    "faelligAm" TIMESTAMP(3),
    "erledigtAm" TIMESTAMP(3),
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Aufgabe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Aufgabe_personId_erledigtAm_idx" ON "Aufgabe"("personId", "erledigtAm");

-- AddForeignKey
ALTER TABLE "Aufgabe" ADD CONSTRAINT "Aufgabe_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
