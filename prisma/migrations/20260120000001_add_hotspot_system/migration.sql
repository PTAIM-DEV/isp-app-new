-- CreateEnum
CREATE TYPE "SaasTier" AS ENUM ('FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "KomisiType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "KomisiStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- AlterEnum (add RESELLER to Role enum)
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'RESELLER';

-- CreateTable
CREATE TABLE IF NOT EXISTS "SaasTierConfig" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tier" "SaasTier" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "maxServers" INTEGER NOT NULL DEFAULT 1,
    "maxVouchers" INTEGER,
    "maxResellers" INTEGER,
    "monthlyPrice" DECIMAL(65,30) NOT NULL,
    "yearlyPrice" DECIMAL(65,30),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SaasTierConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SaasSubscription" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "billingCycle" TEXT NOT NULL DEFAULT 'MONTHLY',
    "nextBillingDate" TIMESTAMP(3),

    CONSTRAINT "SaasSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MikrotikServer" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subscriptionId" TEXT,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 8728,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "useSSL" BOOLEAN NOT NULL DEFAULT false,
    "timeout" INTEGER NOT NULL DEFAULT 5000,
    "hotspotProfile" TEXT,
    "hotspotInterface" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastConnected" TIMESTAMP(3),
    "connectionStatus" TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "errorMessage" TEXT,

    CONSTRAINT "MikrotikServer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "HotspotPackage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "serverId" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "limitUptime" TEXT,
    "price" DECIMAL(65,30) NOT NULL,
    "downloadSpeed" TEXT,
    "uploadSpeed" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "HotspotPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "HotspotVoucher" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "code" TEXT NOT NULL,
    "username" TEXT,
    "password" TEXT,
    "packageId" TEXT,
    "serverId" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "limitUptime" TEXT,
    "price" DECIMAL(65,30) NOT NULL,
    "prefix" TEXT,
    "codeLength" INTEGER NOT NULL DEFAULT 8,
    "combination" TEXT NOT NULL DEFAULT 'ALPHANUMERIC',
    "status" TEXT NOT NULL DEFAULT 'UNUSED',
    "activatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "resellerUserId" TEXT,
    "mikrotikUserId" TEXT,
    "syncedToMikrotik" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" TIMESTAMP(3),
    "whatsappSent" BOOLEAN NOT NULL DEFAULT false,
    "whatsappSentAt" TIMESTAMP(3),
    "whatsappJid" TEXT,

    CONSTRAINT "HotspotVoucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "HotspotUser" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT,
    "serverId" TEXT NOT NULL,
    "profile" TEXT,
    "limitUptime" TEXT,
    "downloadSpeed" TEXT,
    "uploadSpeed" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "mikrotikUserId" TEXT,
    "syncedToMikrotik" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "HotspotUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "HotspotSession" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "username" TEXT NOT NULL,
    "macAddress" TEXT,
    "ipAddress" TEXT,
    "serverId" TEXT NOT NULL,
    "voucherId" TEXT,
    "userId" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "stopTime" TIMESTAMP(3),
    "duration" INTEGER,
    "bytesIn" BIGINT,
    "bytesOut" BIGINT,
    "packetsIn" INTEGER,
    "packetsOut" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "mikrotikSessionId" TEXT,

    CONSTRAINT "HotspotSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "VoucherSale" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "voucherId" TEXT NOT NULL,
    "packageId" TEXT,
    "serverId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "totalAmount" DECIMAL(65,30) NOT NULL,
    "paymentMethod" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "resellerUserId" TEXT,
    "komisiAmount" DECIMAL(65,30),
    "komisiStatus" TEXT,
    "komisiPaidAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "VoucherSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "KomisiRule" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "packageId" TEXT,
    "serverId" TEXT,
    "resellerLevel" INTEGER,
    "komisiType" "KomisiType" NOT NULL DEFAULT 'PERCENTAGE',
    "komisiValue" DECIMAL(65,30) NOT NULL,
    "minSaleAmount" DECIMAL(65,30),
    "maxKomisiAmount" DECIMAL(65,30),
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "KomisiRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "KomisiRecord" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resellerUserId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "ruleId" TEXT,
    "komisiAmount" DECIMAL(65,30) NOT NULL,
    "komisiType" "KomisiType" NOT NULL,
    "komisiValue" DECIMAL(65,30) NOT NULL,
    "baseAmount" DECIMAL(65,30) NOT NULL,
    "status" "KomisiStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "paymentNotes" TEXT,

    CONSTRAINT "KomisiRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SaasTierConfig_tier_key" ON "SaasTierConfig"("tier");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SaasSubscription_userId_key" ON "SaasSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "HotspotVoucher_code_key" ON "HotspotVoucher"("code");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "HotspotVoucher_username_key" ON "HotspotVoucher"("username") WHERE "username" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "HotspotUser_username_key" ON "HotspotUser"("username");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "HotspotSession_mikrotikSessionId_key" ON "HotspotSession"("mikrotikSessionId") WHERE "mikrotikSessionId" IS NOT NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "HotspotSession_username_idx" ON "HotspotSession"("username");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "HotspotSession_serverId_idx" ON "HotspotSession"("serverId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "HotspotSession_voucherId_idx" ON "HotspotSession"("voucherId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "HotspotSession_startTime_idx" ON "HotspotSession"("startTime");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "VoucherSale_resellerUserId_idx" ON "VoucherSale"("resellerUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "VoucherSale_createdAt_idx" ON "VoucherSale"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "VoucherSale_paymentStatus_idx" ON "VoucherSale"("paymentStatus");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "KomisiRecord_resellerUserId_idx" ON "KomisiRecord"("resellerUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "KomisiRecord_status_idx" ON "KomisiRecord"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "KomisiRecord_createdAt_idx" ON "KomisiRecord"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "KomisiRecord_saleId_key" ON "KomisiRecord"("saleId");

-- AddForeignKey
ALTER TABLE "SaasSubscription" ADD CONSTRAINT "SaasSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaasSubscription" ADD CONSTRAINT "SaasSubscription_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "SaasTierConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MikrotikServer" ADD CONSTRAINT "MikrotikServer_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "SaasSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotspotPackage" ADD CONSTRAINT "HotspotPackage_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "MikrotikServer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotspotVoucher" ADD CONSTRAINT "HotspotVoucher_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "HotspotPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotspotVoucher" ADD CONSTRAINT "HotspotVoucher_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "MikrotikServer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotspotVoucher" ADD CONSTRAINT "HotspotVoucher_resellerUserId_fkey" FOREIGN KEY ("resellerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotspotUser" ADD CONSTRAINT "HotspotUser_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "MikrotikServer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotspotSession" ADD CONSTRAINT "HotspotSession_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "MikrotikServer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotspotSession" ADD CONSTRAINT "HotspotSession_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "HotspotVoucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotspotSession" ADD CONSTRAINT "HotspotSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "HotspotUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherSale" ADD CONSTRAINT "VoucherSale_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "HotspotVoucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherSale" ADD CONSTRAINT "VoucherSale_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "HotspotPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherSale" ADD CONSTRAINT "VoucherSale_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "MikrotikServer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherSale" ADD CONSTRAINT "VoucherSale_resellerUserId_fkey" FOREIGN KEY ("resellerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KomisiRule" ADD CONSTRAINT "KomisiRule_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "HotspotPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KomisiRule" ADD CONSTRAINT "KomisiRule_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "MikrotikServer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KomisiRecord" ADD CONSTRAINT "KomisiRecord_resellerUserId_fkey" FOREIGN KEY ("resellerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KomisiRecord" ADD CONSTRAINT "KomisiRecord_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "VoucherSale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KomisiRecord" ADD CONSTRAINT "KomisiRecord_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "KomisiRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;


