-- CreateTable
CREATE TABLE "PushAbo" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushAbo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushAbo_endpoint_key" ON "PushAbo"("endpoint");

-- CreateIndex
CREATE INDEX "PushAbo_personId_idx" ON "PushAbo"("personId");

-- AddForeignKey
ALTER TABLE "PushAbo" ADD CONSTRAINT "PushAbo_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("benutzername") ON DELETE CASCADE ON UPDATE CASCADE;
