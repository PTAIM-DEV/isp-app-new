-- CreateEnum
CREATE TYPE "CollectionStatus" AS ENUM ('NOT_COLLECTED', 'COLLECTING', 'PENDING_CONFIRMATION', 'DISPUTE', 'WRITE_OFF');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "collectionStatus" "CollectionStatus" DEFAULT 'NOT_COLLECTED';
ALTER TABLE "Invoice" ADD COLUMN "collectionNotes" TEXT;

