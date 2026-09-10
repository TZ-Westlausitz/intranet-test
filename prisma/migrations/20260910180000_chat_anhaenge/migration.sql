-- AlterTable
ALTER TABLE "ChatNachricht" ALTER COLUMN "text" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ChatNachrichtAnhang" (
    "id" TEXT NOT NULL,
    "nachrichtId" TEXT NOT NULL,
    "dateiname" TEXT NOT NULL,
    "pfad" TEXT NOT NULL,
    "mimetyp" TEXT NOT NULL,
    "groesseBytes" INTEGER NOT NULL,
    "hochgeladenAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatNachrichtAnhang_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatNachrichtAnhang_nachrichtId_idx" ON "ChatNachrichtAnhang"("nachrichtId");

-- AddForeignKey
ALTER TABLE "ChatNachrichtAnhang" ADD CONSTRAINT "ChatNachrichtAnhang_nachrichtId_fkey" FOREIGN KEY ("nachrichtId") REFERENCES "ChatNachricht"("id") ON DELETE CASCADE ON UPDATE CASCADE;
