-- CreateTable
CREATE TABLE "Gruppe" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Gruppe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonGruppe" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "gruppeId" TEXT NOT NULL,

    CONSTRAINT "PersonGruppe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Berechtigung" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Berechtigung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonBerechtigung" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "berechtigungId" TEXT NOT NULL,

    CONSTRAINT "PersonBerechtigung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ort" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Ort_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Gruppe_name_key" ON "Gruppe"("name");

-- CreateIndex
CREATE INDEX "PersonGruppe_personId_idx" ON "PersonGruppe"("personId");

-- CreateIndex
CREATE INDEX "PersonGruppe_gruppeId_idx" ON "PersonGruppe"("gruppeId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonGruppe_personId_gruppeId_key" ON "PersonGruppe"("personId", "gruppeId");

-- CreateIndex
CREATE UNIQUE INDEX "Berechtigung_name_key" ON "Berechtigung"("name");

-- CreateIndex
CREATE INDEX "PersonBerechtigung_personId_idx" ON "PersonBerechtigung"("personId");

-- CreateIndex
CREATE INDEX "PersonBerechtigung_berechtigungId_idx" ON "PersonBerechtigung"("berechtigungId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonBerechtigung_personId_berechtigungId_key" ON "PersonBerechtigung"("personId", "berechtigungId");

-- CreateIndex
CREATE UNIQUE INDEX "Ort_name_key" ON "Ort"("name");

-- AddForeignKey
ALTER TABLE "PersonGruppe" ADD CONSTRAINT "PersonGruppe_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonGruppe" ADD CONSTRAINT "PersonGruppe_gruppeId_fkey" FOREIGN KEY ("gruppeId") REFERENCES "Gruppe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonBerechtigung" ADD CONSTRAINT "PersonBerechtigung_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonBerechtigung" ADD CONSTRAINT "PersonBerechtigung_berechtigungId_fkey" FOREIGN KEY ("berechtigungId") REFERENCES "Berechtigung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
