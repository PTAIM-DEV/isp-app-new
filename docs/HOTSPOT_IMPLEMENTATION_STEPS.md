# Hotspot System Implementation Steps

## ✅ Completed Steps

### 1. Database Schema ✅
- ✅ Updated `Role` enum dengan `RESELLER`
- ✅ Added SaaS tier models (`SaasTierConfig`, `SaasSubscription`)
- ✅ Added MikroTik server models (`MikrotikServer`)
- ✅ Added Hotspot models (`HotspotPackage`, `HotspotVoucher`, `HotspotUser`, `HotspotSession`)
- ✅ Added Sales & Komisi models (`VoucherSale`, `KomisiRule`, `KomisiRecord`)
- ✅ Updated `User` model dengan relations untuk reseller

**Next:** Run migration
```bash
npx prisma migrate dev --name add_hotspot_system
```

### 2. Service Layer ✅
- ✅ `RouterOSService` - Connection pooling, encryption, CRUD operations
- ✅ `HotspotVoucherService` - Voucher generation, activation, komisi calculation
- ✅ `WhatsAppVoucherService` - Send voucher via WhatsApp

**Location:**
- `src/lib/services/routeros-service.ts`
- `src/lib/services/hotspot-voucher-service.ts`
- `src/lib/services/whatsapp-voucher-service.ts`

### 3. API Endpoints (Partial) ✅
- ✅ `/api/admin/hotspot/servers` - GET, POST

## 🔄 Next Steps

### Step 4: Complete API Endpoints

#### 4.1 Server Management
- [ ] `PUT /api/admin/hotspot/servers/[id]` - Update server
- [ ] `DELETE /api/admin/hotspot/servers/[id]` - Delete server
- [ ] `POST /api/admin/hotspot/servers/[id]/test` - Test connection
- [ ] `GET /api/admin/hotspot/servers/[id]/status` - Get connection status

#### 4.2 Package Management
- [ ] `GET /api/admin/hotspot/packages` - List packages
- [ ] `POST /api/admin/hotspot/packages` - Create package
- [ ] `PUT /api/admin/hotspot/packages/[id]` - Update package
- [ ] `DELETE /api/admin/hotspot/packages/[id]` - Delete package

#### 4.3 Voucher Management
- [ ] `POST /api/admin/hotspot/vouchers/generate` - Generate vouchers
- [ ] `GET /api/admin/hotspot/vouchers` - List vouchers (with filters)
- [ ] `GET /api/admin/hotspot/vouchers/[id]` - Get voucher details
- [ ] `POST /api/admin/hotspot/vouchers/[id]/activate` - Activate voucher
- [ ] `POST /api/admin/hotspot/vouchers/[id]/send-whatsapp` - Send via WhatsApp
- [ ] `POST /api/admin/hotspot/vouchers/batch-send-whatsapp` - Send multiple
- [ ] `DELETE /api/admin/hotspot/vouchers/[id]` - Delete voucher

#### 4.4 Session Monitoring
- [ ] `GET /api/admin/hotspot/sessions` - List active sessions
- [ ] `POST /api/admin/hotspot/sessions/sync` - Sync from MikroTik
- [ ] `POST /api/admin/hotspot/sessions/[id]/disconnect` - Disconnect session

#### 4.5 Sales & Reporting
- [ ] `GET /api/admin/hotspot/sales` - List sales (with filters)
- [ ] `POST /api/admin/hotspot/sales` - Record sale
- [ ] `GET /api/admin/hotspot/sales/stats` - Sales statistics
- [ ] `GET /api/admin/hotspot/sales/export` - Export sales report

#### 4.6 Komisi Management
- [ ] `GET /api/admin/hotspot/komisi/rules` - List komisi rules
- [ ] `POST /api/admin/hotspot/komisi/rules` - Create komisi rule
- [ ] `PUT /api/admin/hotspot/komisi/rules/[id]` - Update komisi rule
- [ ] `DELETE /api/admin/hotspot/komisi/rules/[id]` - Delete komisi rule
- [ ] `GET /api/admin/hotspot/komisi/records` - List komisi records
- [ ] `POST /api/admin/hotspot/komisi/records/[id]/pay` - Mark komisi as paid

#### 4.7 Reseller Portal APIs
- [ ] `GET /api/reseller/dashboard` - Reseller dashboard stats
- [ ] `GET /api/reseller/vouchers` - Reseller's vouchers
- [ ] `POST /api/reseller/vouchers/generate` - Generate vouchers (reseller)
- [ ] `GET /api/reseller/sales` - Reseller's sales
- [ ] `GET /api/reseller/komisi` - Reseller's komisi records
- [ ] `GET /api/reseller/reports` - Reseller reports

### Step 5: Frontend - Admin Pages

#### 5.1 Server Management
- [ ] `/admin/hotspot/servers` - Server list page
- [ ] `/admin/hotspot/servers/new` - Add server form
- [ ] `/admin/hotspot/servers/[id]/edit` - Edit server form

#### 5.2 Package Management
- [ ] `/admin/hotspot/packages` - Package list page
- [ ] `/admin/hotspot/packages/new` - Add package form
- [ ] `/admin/hotspot/packages/[id]/edit` - Edit package form

#### 5.3 Voucher Generation (Sesuai Screenshot)
- [ ] `/admin/hotspot/vouchers/new` - Voucher generation form dengan fields:
  - Pilih Server (dropdown)
  - User Reseller (optional dropdown)
  - Paket (dropdown, filtered by server)
  - Deskripsi Voucher (text input)
  - Username checkbox
  - Password checkbox
  - Jumlah Voucher (number input)
  - Limit Uptime (text input, format: "1d / 2d / 60m")
  - Harga Voucher (number input)
  - Panjang Huruf (number input, max 10)
  - Awalan / Prefix (text input)
  - Kombinasi (dropdown: ALPHANUMERIC, NUMERIC, ALPHABET)
- [ ] Preview generated vouchers
- [ ] Export/Print vouchers

#### 5.4 Voucher List
- [ ] `/admin/hotspot/vouchers` - Voucher list dengan filters
- [ ] `/admin/hotspot/vouchers/[id]` - Voucher details

#### 5.5 Monitor
- [ ] `/admin/hotspot/monitor` - Real-time session monitor
- [ ] `/admin/hotspot/monitor/servers` - Server status dashboard

#### 5.6 Sales & Reports
- [ ] `/admin/hotspot/sales` - Sales list dengan filters
- [ ] `/admin/hotspot/sales/reports` - Sales reports & charts

#### 5.7 Komisi Management
- [ ] `/admin/hotspot/komisi/rules` - Komisi rules management
- [ ] `/admin/hotspot/komisi/records` - Komisi records & payment

### Step 6: Frontend - Reseller Portal

#### 6.1 Reseller Authentication
- [ ] `/reseller/login` - Reseller login page
- [ ] Reseller session management
- [ ] Reseller middleware protection

#### 6.2 Reseller Dashboard
- [ ] `/reseller/dashboard` - Dashboard dengan stats:
  - Total vouchers sold
  - Total sales (hari ini, bulan ini)
  - Total komisi (pending, paid)
  - Recent sales

#### 6.3 Reseller Voucher Management
- [ ] `/reseller/vouchers` - List vouchers yang dibuat reseller
- [ ] `/reseller/vouchers/new` - Generate vouchers (limited by tier)

#### 6.4 Reseller Sales & Reports
- [ ] `/reseller/sales` - Sales history
- [ ] `/reseller/komisi` - Komisi records
- [ ] `/reseller/reports` - Sales reports & charts

### Step 7: SaaS Tier Management

#### 7.1 Tier Configuration
- [ ] `/admin/saas/tiers` - Tier list & configuration
- [ ] Set limits per tier (max servers, max vouchers, max resellers)

#### 7.2 Subscription Management
- [ ] `/admin/saas/subscriptions` - User subscriptions
- [ ] Assign tier to users
- [ ] Check tier limits saat create server/voucher

### Step 8: Background Jobs

#### 8.1 Session Sync Job
- [ ] Cron job untuk sync sessions dari MikroTik setiap X menit
- [ ] Update session status di database

#### 8.2 Voucher Expiration Job
- [ ] Cron job untuk check expired vouchers
- [ ] Disable vouchers yang expired di MikroTik
- [ ] Update status di database

### Step 9: Testing

#### 9.1 Unit Tests
- [ ] Test RouterOSService
- [ ] Test HotspotVoucherService
- [ ] Test WhatsAppVoucherService
- [ ] Test Komisi calculation

#### 9.2 Integration Tests
- [ ] Test API endpoints
- [ ] Test MikroTik connection
- [ ] Test voucher generation & activation
- [ ] Test WhatsApp sending

### Step 10: Documentation

#### 10.1 User Documentation
- [ ] Admin guide untuk hotspot management
- [ ] Reseller guide untuk menggunakan portal
- [ ] API documentation

#### 10.2 Technical Documentation
- [ ] Architecture documentation
- [ ] Database schema documentation
- [ ] Deployment guide

## 📝 Important Notes

### Environment Variables
Tambahkan ke `.env`:
```
ENCRYPTION_KEY=your-secret-encryption-key-change-in-production
```

### Dependencies
Sudah diinstall:
- `routeros-client` ✅

### Database Migration
```bash
npx prisma migrate dev --name add_hotspot_system
npx prisma generate
```

### MikroTik Configuration
Pastikan MikroTik RouterOS:
1. API enabled (Services > API)
2. User dengan permission untuk hotspot management
3. Hotspot sudah dikonfigurasi

## 🚀 Quick Start

1. **Run Migration**
   ```bash
   npx prisma migrate dev --name add_hotspot_system
   ```

2. **Seed Default Tier** (optional)
   ```typescript
   // Create script: prisma/seed-saas-tiers.ts
   ```

3. **Test Connection**
   - Create server via API
   - Test connection

4. **Generate Voucher**
   - Create package
   - Generate vouchers
   - Test activation

5. **Test WhatsApp**
   - Generate voucher
   - Send via WhatsApp
   - Verify received

## 📚 Reference

- RouterOS API: https://wiki.mikrotik.com/wiki/Manual:API
- routeros-client: https://www.npmjs.com/package/routeros-client
- MIKHMON: https://laksa19.github.io


