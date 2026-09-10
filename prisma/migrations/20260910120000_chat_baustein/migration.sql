-- CreateTable
CREATE TABLE "ChatKonversation" (
    "id" TEXT NOT NULL,
    "gruppeId" TEXT,
    "direktSchluessel" TEXT,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatKonversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatKonversationTeilnehmer" (
    "konversationId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,

    CONSTRAINT "ChatKonversationTeilnehmer_pkey" PRIMARY KEY ("konversationId","personId")
);

-- CreateTable
CREATE TABLE "ChatNachricht" (
    "id" TEXT NOT NULL,
    "konversationId" TEXT NOT NULL,
    "absenderId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatNachricht_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatKonversationGelesen" (
    "konversationId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "zuletztGelesenAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatKonversationGelesen_pkey" PRIMARY KEY ("konversationId","personId")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatKonversation_gruppeId_key" ON "ChatKonversation"("gruppeId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatKonversation_direktSchluessel_key" ON "ChatKonversation"("direktSchluessel");

-- CreateIndex
CREATE INDEX "ChatNachricht_konversationId_erstelltAm_idx" ON "ChatNachricht"("konversationId", "erstelltAm");

-- AddForeignKey
ALTER TABLE "ChatKonversation" ADD CONSTRAINT "ChatKonversation_gruppeId_fkey" FOREIGN KEY ("gruppeId") REFERENCES "Gruppe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatKonversationTeilnehmer" ADD CONSTRAINT "ChatKonversationTeilnehmer_konversationId_fkey" FOREIGN KEY ("konversationId") REFERENCES "ChatKonversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatKonversationTeilnehmer" ADD CONSTRAINT "ChatKonversationTeilnehmer_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatNachricht" ADD CONSTRAINT "ChatNachricht_konversationId_fkey" FOREIGN KEY ("konversationId") REFERENCES "ChatKonversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatNachricht" ADD CONSTRAINT "ChatNachricht_absenderId_fkey" FOREIGN KEY ("absenderId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatKonversationGelesen" ADD CONSTRAINT "ChatKonversationGelesen_konversationId_fkey" FOREIGN KEY ("konversationId") REFERENCES "ChatKonversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatKonversationGelesen" ADD CONSTRAINT "ChatKonversationGelesen_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("benutzername") ON DELETE RESTRICT ON UPDATE CASCADE;
