-- AlterEnum (only if CANCELLED doesn't exist)
DO $$ BEGIN
    ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('INSTALLATION', 'MONTHLY', 'PREPAID', 'TRIAL');

-- CreateEnum
CREATE TYPE "InvoiceCategory" AS ENUM ('INSTALLATION_FEE', 'FIRST_MONTH', 'REGULAR_MONTHLY', 'PREPAID_3_MONTHS', 'PREPAID_6_MONTHS', 'PREPAID_12_MONTHS', 'TRIAL_PERIOD');

-- AlterTable: Add new columns to Subscription
ALTER TABLE "Subscription" ADD COLUMN "activatedDate" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN "trialStartDate" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN "trialEndDate" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN "paymentFlowId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "prepaidCreditMonths" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Subscription" ADD COLUMN "prepaidValidUntil" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN "bonusMonthsPending" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Subscription" ADD COLUMN "isTrialActive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Subscription" ADD COLUMN "isPrepaidActive" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Add new columns to Invoice
ALTER TABLE "Invoice" ADD COLUMN "invoiceNumber" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "type" "InvoiceType" NOT NULL DEFAULT 'MONTHLY';
ALTER TABLE "Invoice" ADD COLUMN "category" "InvoiceCategory" NOT NULL DEFAULT 'REGULAR_MONTHLY';
ALTER TABLE "Invoice" ADD COLUMN "description" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "prepaidMonths" INTEGER;
ALTER TABLE "Invoice" ADD COLUMN "bonusMonths" INTEGER;
ALTER TABLE "Invoice" ADD COLUMN "validUntil" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN "trialStartDate" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN "trialEndDate" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN "trialDays" INTEGER;
ALTER TABLE "Invoice" ADD COLUMN "promoUsageId" TEXT;

-- CreateTable: PaymentFlow
CREATE TABLE "PaymentFlow" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "requiresInstallationPayment" BOOLEAN NOT NULL DEFAULT false,
    "installationFeeAmount" DECIMAL(65,30),
    "freeInstallation" BOOLEAN NOT NULL DEFAULT false,
    "requiresFirstMonthPayment" BOOLEAN NOT NULL DEFAULT true,
    "firstMonthPaymentAfterInstall" BOOLEAN NOT NULL DEFAULT false,
    "supportsPrepaid" BOOLEAN NOT NULL DEFAULT false,
    "prepaidMonths" TEXT NOT NULL DEFAULT '[]',
    "prepaidBonusMonths" TEXT,
    "supportsTrial" BOOLEAN NOT NULL DEFAULT false,
    "trialDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PaymentFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Promo
CREATE TABLE "Promo" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "value" DECIMAL(65,30),
    "applicableToFlowIds" TEXT NOT NULL DEFAULT '[]',
    "applicableToPackageIds" TEXT NOT NULL DEFAULT '[]',
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Promo_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PromoUsage
CREATE TABLE "PromoUsage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "promoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromoUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
CREATE UNIQUE INDEX "Promo_code_key" ON "Promo"("code");
CREATE UNIQUE INDEX "PromoUsage_invoiceId_key" ON "PromoUsage"("invoiceId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_paymentFlowId_fkey" FOREIGN KEY ("paymentFlowId") REFERENCES "PaymentFlow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_promoUsageId_fkey" FOREIGN KEY ("promoUsageId") REFERENCES "PromoUsage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoUsage" ADD CONSTRAINT "PromoUsage_promoId_fkey" FOREIGN KEY ("promoId") REFERENCES "Promo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoUsage" ADD CONSTRAINT "PromoUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoUsage" ADD CONSTRAINT "PromoUsage_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Update existing invoices to have default type and category
UPDATE "Invoice" SET "type" = 'MONTHLY', "category" = 'REGULAR_MONTHLY' WHERE "type" IS NULL OR "category" IS NULL;

