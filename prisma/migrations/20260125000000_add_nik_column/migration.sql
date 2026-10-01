-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nik" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_nik_key" ON "User"("nik") WHERE "nik" IS NOT NULL;













