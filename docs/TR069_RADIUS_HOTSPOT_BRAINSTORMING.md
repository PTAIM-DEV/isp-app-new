# Brainstorming: TR-069 ACS, RADIUS Server & Hotspot Voucher System

## 📋 Overview

Dokumen ini membahas implementasi tiga fitur utama untuk sistem ISP:
1. **TR-069 ACS (GenieACS)** - Device Management & Auto Configuration
2. **RADIUS Server** - Authentication, Authorization & Accounting
3. **Hotspot Voucher System** - Penjualan voucher WiFi hotspot

---

## 1. TR-069 ACS / GenieACS Integration

### 1.1 Konsep TR-069

**TR-069 (Technical Report 069)** adalah protokol standar untuk remote management perangkat CPE (Customer Premises Equipment) seperti router, modem, ONT, dll.

**GenieACS** adalah implementasi open-source dari TR-069 ACS (Auto Configuration Server) yang populer.

### 1.2 Arsitektur

```
┌─────────────────┐
│   ISP App       │
│  (Next.js)      │
└────────┬────────┘
         │ API Calls
         │
┌────────▼────────┐
│  GenieACS API   │
│  (Port 7557)    │
└────────┬────────┘
         │ TR-069 Protocol
         │ (SOAP/HTTP)
         │
┌────────▼────────┐
│  CPE Devices    │
│  (Router/Modem) │
└─────────────────┘
```

### 1.3 Database Schema Tambahan

```prisma
model Device {
  id              String   @id @default(cuid())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Device Identity
  serialNumber    String   @unique // Serial number dari device
  macAddress      String?  @unique // MAC address
  oui             String?  // Organizationally Unique Identifier
  productClass    String?  // e.g., "Router", "ONT"
  manufacturer    String?  // e.g., "TP-Link", "Huawei"
  modelName       String?  // e.g., "Archer C7"
  firmwareVersion String?

  // GenieACS Integration
  genieacsId      String?  @unique // ID dari GenieACS
  genieacsTags    String[] // Tags untuk grouping di GenieACS
  lastInform      DateTime? // Last TR-069 Inform event
  connectionRequestState String? // CONNECTED, DISCONNECTED

  // Customer Assignment
  userId          String?
  user            User?    @relation(fields: [userId], references: [id])
  
  // Network Info
  wanIpAddress    String?  // Public IP dari device
  lanIpAddress    String?  // LAN IP (biasanya 192.168.x.x)
  connectionType  String?  // PPPoE, DHCP, Static

  // Status
  status          String   @default("UNREGISTERED") // UNREGISTERED, REGISTERED, ACTIVE, OFFLINE
  lastSeen        DateTime? // Last time device contacted ACS

  // Configuration
  configProfileId String?
  configProfile   DeviceConfigProfile? @relation(fields: [configProfileId], references: [id])

  // Relations
  configHistory   DeviceConfigHistory[]
  tasks           DeviceTask[]
  parameters      DeviceParameter[]
}

model DeviceConfigProfile {
  id          String   @id @default(cuid())
  name        String
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Configuration Template (JSON)
  configTemplate Json // Template konfigurasi untuk device

  devices     Device[]
}

model DeviceConfigHistory {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())

  deviceId    String
  device      Device   @relation(fields: [deviceId], references: [id])

  action      String   // SET_PARAMETER, REBOOT, FACTORY_RESET, FIRMWARE_UPDATE
  parameters  Json?    // Parameters yang diubah
  status      String   @default("PENDING") // PENDING, COMPLETED, FAILED
  errorMessage String?
  completedAt DateTime?
}

model DeviceTask {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  deviceId    String
  device      Device   @relation(fields: [deviceId], references: [id])

  taskType    String   // SET_PARAMETER, REBOOT, FACTORY_RESET, FIRMWARE_UPDATE, GET_PARAMETER
  parameters  Json?    // Parameters untuk task
  status      String   @default("PENDING") // PENDING, IN_PROGRESS, COMPLETED, FAILED
  priority    Int      @default(0)
  retryCount  Int      @default(0)
  errorMessage String?
  completedAt DateTime?
}

model DeviceParameter {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  deviceId    String
  device      Device   @relation(fields: [deviceId], references: [id])

  path        String   // e.g., "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.Username"
  value       String?  // Current value
  dataType    String?  // string, int, unsignedInt, boolean, etc.
  writable    Boolean  @default(false)
  lastUpdated DateTime?
}
```

### 1.4 Implementasi

#### A. Setup GenieACS

```bash
# Install GenieACS via Docker
docker run -d \
  --name genieacs \
  -p 7557:7557 \
  -p 3000:3000 \
  -e MONGODB_CONNECTION_URL=mongodb://mongo:27017/genieacs \
  genieacs/genieacs
```

#### B. API Integration Layer

Buat service untuk komunikasi dengan GenieACS:

```typescript
// lib/services/genieacs.ts
import axios from 'axios';

const GENIEACS_API_URL = process.env.GENIEACS_API_URL || 'http://localhost:7557';

export class GenieACSService {
  // Register device ke GenieACS
  async registerDevice(serialNumber: string, macAddress?: string) {
    // GenieACS akan auto-register device saat pertama kali connect
    // Kita hanya perlu track di database
  }

  // Get device info dari GenieACS
  async getDeviceInfo(genieacsId: string) {
    const response = await axios.get(`${GENIEACS_API_URL}/devices/${genieacsId}`);
    return response.data;
  }

  // Set parameter ke device
  async setParameter(genieacsId: string, path: string, value: any) {
    await axios.post(`${GENIEACS_API_URL}/devices/${genieacsId}/tasks`, {
      name: 'setParameterValues',
      parameterValues: { [path]: value }
    });
  }

  // Reboot device
  async rebootDevice(genieacsId: string) {
    await axios.post(`${GENIEACS_API_URL}/devices/${genieacsId}/tasks`, {
      name: 'reboot'
    });
  }

  // Factory reset device
  async factoryReset(genieacsId: string) {
    await axios.post(`${GENIEACS_API_URL}/devices/${genieacsId}/tasks`, {
      name: 'factoryReset'
    });
  }

  // Get parameter values
  async getParameters(genieacsId: string, paths: string[]) {
    const response = await axios.post(`${GENIEACS_API_URL}/devices/${genieacsId}/tasks`, {
      name: 'getParameterValues',
      parameterNames: paths
    });
    return response.data;
  }
}
```

#### C. Webhook dari GenieACS

GenieACS bisa mengirim webhook saat device:
- Connect/disconnect
- Parameter berubah
- Task completed

```typescript
// app/api/webhooks/genieacs/route.ts
export async function POST(request: Request) {
  const event = await request.json();
  
  // Handle device inform (connect/disconnect)
  if (event.type === 'inform') {
    await updateDeviceStatus(event.deviceId, event.connected);
  }
  
  // Handle task completion
  if (event.type === 'taskComplete') {
    await updateDeviceTask(event.taskId, event.status);
  }
}
```

### 1.5 Use Cases

1. **Auto Configuration saat Instalasi**
   - Saat customer di-install, assign device ke customer
   - Set PPPoE credentials (username/password) ke device
   - Set bandwidth limit sesuai package

2. **Remote Management**
   - Reboot device dari dashboard admin
   - Change WiFi password
   - Update firmware
   - Monitor device status (online/offline)

3. **Bandwidth Management**
   - Set bandwidth limit sesuai package customer
   - Dynamic bandwidth adjustment

4. **Troubleshooting**
   - View device parameters
   - Check connection status
   - Factory reset jika perlu

---

## 2. RADIUS Server Integration

### 2.1 Konsep RADIUS

**RADIUS (Remote Authentication Dial-In User Service)** adalah protokol untuk:
- **Authentication** - Verifikasi username/password
- **Authorization** - Set policy (bandwidth, session time, dll)
- **Accounting** - Tracking usage (data, time)

### 2.2 Arsitektur

```
┌─────────────────┐
│   ISP App       │
│  (Next.js)      │
└────────┬────────┘
         │ API Calls
         │
┌────────▼────────┐
│  FreeRADIUS     │
│  (Port 1812/3)  │
└────────┬────────┘
         │ RADIUS Protocol
         │
┌────────▼────────┐
│  NAS Devices    │
│  (Router/BRAS)  │
└─────────────────┘
```

### 2.3 Database Schema Tambahan

```prisma
model RadiusUser {
  id              String   @id @default(cuid())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // RADIUS Identity
  username        String   @unique // Username untuk login (bisa sama dengan customer phone atau custom)
  password        String   // Encrypted password (MD5, SHA1, atau Cleartext-Password)
  passwordType    String   @default("Cleartext-Password") // Cleartext-Password, MD5-Password, SHA-Password

  // Customer Assignment
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id])

  // RADIUS Attributes
  replyAttributes Json?    // RADIUS reply attributes (bandwidth, session-timeout, dll)
  checkAttributes Json?    // RADIUS check attributes

  // Status
  isActive        Boolean  @default(true)
  lastLogin       DateTime?
  lastLogout      DateTime?

  // Relations
  accountingLogs  RadiusAccounting[]
  sessions        RadiusSession[]
}

model RadiusGroup {
  id              String   @id @default(cuid())
  name            String   @unique
  description     String?
  replyAttributes Json     // Default attributes untuk group
  checkAttributes Json?
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  users           RadiusUser[]
}

model RadiusAccounting {
  id              String   @id @default(cuid())
  createdAt       DateTime @default(now())

  username        String
  sessionId       String   // Acct-Session-Id
  nasIpAddress    String?  // NAS-IP-Address
  nasIdentifier   String?  // NAS-Identifier
  framedIpAddress String?  // Framed-IP-Address

  // Accounting Type
  acctStatusType  String   // Start, Stop, Interim-Update, Accounting-On, Accounting-Off
  acctDelayTime   Int?     // Delay time in seconds
  acctSessionTime Int?     // Session time in seconds
  acctInputOctets BigInt?  // Input bytes
  acctOutputOctets BigInt? // Output bytes
  acctInputPackets Int?    // Input packets
  acctOutputPackets Int?   // Output packets

  // Timestamps
  acctStartTime   DateTime?
  acctStopTime    DateTime?
  acctUpdateTime  DateTime?

  // Relations
  userId          String?
  user            User?    @relation(fields: [userId], references: [id])
}

model RadiusSession {
  id              String   @id @default(cuid())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  username        String
  sessionId       String   @unique
  nasIpAddress    String?
  framedIpAddress String?
  callingStationId String?  // MAC address atau identifier lain

  // Status
  status          String   @default("ACTIVE") // ACTIVE, STOPPED
  startTime       DateTime
  stopTime        DateTime?

  // Usage
  inputOctets     BigInt   @default(0)
  outputOctets    BigInt   @default(0)
  inputPackets    Int      @default(0)
  outputPackets   Int      @default(0)
  sessionTime     Int      @default(0) // seconds

  // Relations
  userId          String?
  user            User?    @relation(fields: [userId], references: [id])
}
```

### 2.4 Implementasi

#### A. Setup FreeRADIUS

```bash
# Install FreeRADIUS
apt-get install freeradius freeradius-postgresql

# Configure FreeRADIUS untuk menggunakan PostgreSQL
# Edit /etc/freeradius/3.0/mods-enabled/sql
```

#### B. Database Integration

FreeRADIUS bisa menggunakan PostgreSQL sebagai backend:

```sql
-- Create RADIUS tables (FreeRADIUS schema)
-- File: /etc/freeradius/3.0/mods-config/sql/main/postgresql/schema.sql
```

#### C. API untuk Manage RADIUS Users

```typescript
// lib/services/radius.ts
import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

export class RadiusService {
  // Create RADIUS user untuk customer
  async createRadiusUser(userId: string, username: string, password: string) {
    // Hash password sesuai kebutuhan
    const hashedPassword = this.hashPassword(password, 'MD5-Password');
    
    const radiusUser = await prisma.radiusUser.create({
      data: {
        username,
        password: hashedPassword,
        passwordType: 'MD5-Password',
        userId,
        replyAttributes: {
          'Mikrotik-Rate-Limit': '10M/10M', // Bandwidth limit
          'Session-Timeout': 86400, // 24 hours
        }
      }
    });

    return radiusUser;
  }

  // Update bandwidth limit
  async updateBandwidthLimit(userId: string, downloadSpeed: string, uploadSpeed: string) {
    const radiusUser = await prisma.radiusUser.findUnique({
      where: { userId }
    });

    if (!radiusUser) return;

    await prisma.radiusUser.update({
      where: { id: radiusUser.id },
      data: {
        replyAttributes: {
          ...radiusUser.replyAttributes,
          'Mikrotik-Rate-Limit': `${downloadSpeed}/${uploadSpeed}`
        }
      }
    });
  }

  // Disconnect user session
  async disconnectUser(username: string) {
    // Send CoA (Change of Authorization) atau Disconnect-Request
    // Implementasi tergantung NAS yang digunakan
  }

  private hashPassword(password: string, type: string): string {
    if (type === 'MD5-Password') {
      return createHash('md5').update(password).digest('hex');
    }
    return password; // Cleartext-Password
  }
}
```

#### D. Accounting Webhook

FreeRADIUS bisa mengirim accounting data ke aplikasi:

```typescript
// app/api/webhooks/radius/accounting/route.ts
export async function POST(request: Request) {
  const accounting = await request.json();
  
  // Save accounting log
  await prisma.radiusAccounting.create({
    data: {
      username: accounting.username,
      sessionId: accounting['Acct-Session-Id'],
      acctStatusType: accounting['Acct-Status-Type'],
      acctInputOctets: accounting['Acct-Input-Octets'],
      acctOutputOctets: accounting['Acct-Output-Octets'],
      acctSessionTime: accounting['Acct-Session-Time'],
      // ... other fields
    }
  });

  // Update session jika ada
  if (accounting['Acct-Status-Type'] === 'Start') {
    await prisma.radiusSession.create({
      data: {
        username: accounting.username,
        sessionId: accounting['Acct-Session-Id'],
        startTime: new Date(),
        status: 'ACTIVE'
      }
    });
  }
}
```

### 2.5 Use Cases

1. **PPPoE Authentication**
   - Customer login dengan username/password
   - RADIUS verify credentials
   - Set bandwidth limit sesuai package

2. **Hotspot Authentication**
   - Voucher-based authentication
   - Prepaid time/data limit

3. **Bandwidth Management**
   - Dynamic bandwidth adjustment
   - QoS (Quality of Service)

4. **Usage Tracking**
   - Track data usage per customer
   - Generate usage reports
   - Billing berdasarkan usage

---

## 3. Hotspot Voucher System

### 3.1 Konsep

Sistem untuk menjual voucher WiFi hotspot dengan berbagai durasi dan limit.

### 3.2 Database Schema

```prisma
model HotspotServer {
  id              String   @id @default(cuid())
  name            String
  description     String?
  nasIpAddress    String   // IP address dari NAS (Mikrotik/Router)
  nasSecret       String   // RADIUS secret
  radiusPort      Int      @default(1812)
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  vouchers        HotspotVoucher[]
  packages        HotspotPackage[]
}

model HotspotPackage {
  id              String   @id @default(cuid())
  name            String
  description     String?
  duration        Int      // Durasi dalam menit
  price           Decimal
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  serverId        String?
  server          HotspotServer? @relation(fields: [serverId], references: [id])

  vouchers        HotspotVoucher[]
}

model HotspotVoucher {
  id              String   @id @default(cuid())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Voucher Identity
  code            String   @unique // Kode voucher (auto-generated)
  username        String?  @unique // Username untuk login (optional, bisa sama dengan code)
  password        String?  // Password untuk login (optional)

  // Package Info
  packageId       String?
  package         HotspotPackage? @relation(fields: [packageId], references: [id])
  serverId        String
  server          HotspotServer   @relation(fields: [serverId], references: [id])

  // Configuration
  duration        Int      // Durasi dalam menit
  limitUptime     String?  // Limit uptime (e.g., "1d / 2d / 60m")
  price           Decimal   // Harga voucher

  // Voucher Settings
  prefix          String?   // Prefix untuk code (e.g., "VIP")
  codeLength     Int       @default(8) // Panjang code
  combination    String?   // Kombinasi karakter (ALPHANUMERIC, NUMERIC, ALPHABET)

  // Usage Tracking
  status          String   @default("UNUSED") // UNUSED, ACTIVE, EXPIRED, USED
  activatedAt     DateTime?
  expiresAt       DateTime?
  lastUsedAt      DateTime?

  // Reseller
  resellerUserId  String?  // User reseller yang menjual voucher ini
  resellerUser    User?    @relation(fields: [resellerUserId], references: [id])

  // Relations
  sessions        HotspotSession[]
}

model HotspotSession {
  id              String   @id @default(cuid())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  voucherId       String
  voucher         HotspotVoucher @relation(fields: [voucherId], references: [id])

  username        String
  macAddress      String?
  ipAddress       String?
  nasIpAddress    String?
  sessionId       String?

  startTime       DateTime
  stopTime        DateTime?
  duration        Int?     // Duration in seconds
  inputOctets     BigInt?  // Data downloaded
  outputOctets    BigInt?  // Data uploaded

  status          String   @default("ACTIVE") // ACTIVE, STOPPED
}
```

### 3.3 Implementasi

#### A. Voucher Generation

```typescript
// lib/services/hotspot-voucher.ts
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

export class HotspotVoucherService {
  // Generate voucher codes
  async generateVouchers(
    serverId: string,
    packageId: string,
    quantity: number,
    options: {
      prefix?: string;
      codeLength?: number;
      combination?: 'ALPHANUMERIC' | 'NUMERIC' | 'ALPHABET';
      username?: boolean;
      password?: boolean;
    }
  ) {
    const package_ = await prisma.hotspotPackage.findUnique({
      where: { id: packageId }
    });

    if (!package_) throw new Error('Package not found');

    const vouchers = [];

    for (let i = 0; i < quantity; i++) {
      const code = this.generateCode(
        options.prefix,
        options.codeLength || 8,
        options.combination || 'ALPHANUMERIC'
      );

      const voucher = await prisma.hotspotVoucher.create({
        data: {
          code,
          username: options.username ? code : null,
          password: options.password ? this.generatePassword() : null,
          packageId,
          serverId,
          duration: package_.duration,
          price: package_.price,
          prefix: options.prefix,
          codeLength: options.codeLength || 8,
          combination: options.combination || 'ALPHANUMERIC',
          status: 'UNUSED'
        }
      });

      vouchers.push(voucher);
    }

    return vouchers;
  }

  private generateCode(prefix: string = '', length: number = 8, combination: string = 'ALPHANUMERIC'): string {
    let chars = '';
    if (combination === 'NUMERIC') {
      chars = '0123456789';
    } else if (combination === 'ALPHABET') {
      chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    } else {
      chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    }

    let code = prefix;
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return code;
  }

  private generatePassword(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  // Activate voucher (saat digunakan pertama kali)
  async activateVoucher(code: string) {
    const voucher = await prisma.hotspotVoucher.findUnique({
      where: { code }
    });

    if (!voucher) throw new Error('Voucher not found');
    if (voucher.status !== 'UNUSED') throw new Error('Voucher already used');

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + voucher.duration);

    await prisma.hotspotVoucher.update({
      where: { id: voucher.id },
      data: {
        status: 'ACTIVE',
        activatedAt: new Date(),
        expiresAt
      }
    });

    // Create RADIUS user untuk voucher ini
    await this.createRadiusUserForVoucher(voucher);

    return voucher;
  }

  private async createRadiusUserForVoucher(voucher: HotspotVoucher) {
    // Create user di RADIUS dengan limit sesuai voucher
    // Implementasi tergantung NAS yang digunakan
  }
}
```

#### B. API Endpoints

```typescript
// app/api/admin/hotspot/vouchers/route.ts
export async function POST(request: Request) {
  const body = await request.json();
  
  const {
    serverId,
    packageId,
    quantity,
    prefix,
    codeLength,
    combination,
    username,
    password
  } = body;

  const vouchers = await hotspotVoucherService.generateVouchers(
    serverId,
    packageId,
    quantity,
    { prefix, codeLength, combination, username, password }
  );

  return Response.json({ vouchers });
}

// app/api/admin/hotspot/vouchers/[id]/route.ts
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const voucher = await prisma.hotspotVoucher.findUnique({
    where: { id: params.id },
    include: { package: true, server: true }
  });

  return Response.json({ voucher });
}
```

#### C. Frontend Form (sesuai screenshot)

```typescript
// app/admin/hotspot/vouchers/new/page.tsx
// Form untuk create voucher baru dengan fields:
// - Pilih Server (dropdown)
// - User Reseller (optional dropdown)
// - Paket (dropdown)
// - Deskripsi Voucher (text input)
// - Username checkbox
// - Password checkbox
// - Jumlah Voucher (number input)
// - Limit Uptime (text input, e.g., "1d / 2d / 60m")
// - Harga Voucher (number input)
// - Panjang Huruf (number input, max 10)
// - Awalan / Prefix (text input)
// - Kombinasi (dropdown: ALPHANUMERIC, NUMERIC, ALPHABET)
```

### 3.4 Integration dengan RADIUS

Voucher harus di-create sebagai RADIUS user saat diaktifkan:

```typescript
// Saat voucher diaktifkan, create RADIUS user
async function createRadiusUserForVoucher(voucher: HotspotVoucher) {
  const radiusUser = await prisma.radiusUser.create({
    data: {
      username: voucher.username || voucher.code,
      password: voucher.password || voucher.code,
      passwordType: 'Cleartext-Password',
      replyAttributes: {
        'Session-Timeout': voucher.duration * 60, // Convert to seconds
        'Mikrotik-Rate-Limit': '10M/10M', // Default bandwidth
      },
      checkAttributes: {
        'Expiration': voucher.expiresAt?.toISOString()
      }
    }
  });

  // Sync ke NAS (Mikrotik) jika perlu
  await syncToNAS(voucher.server, radiusUser);
}
```

---

## 4. Integration Flow

### 4.1 Customer Activation Flow

```
1. Customer di-install → Assign Device
2. Create RADIUS User → Set credentials
3. Configure Device via TR-069 → Set PPPoE username/password
4. Device connect → Authenticate via RADIUS
5. Set bandwidth limit → Via RADIUS attributes
```

### 4.2 Hotspot Voucher Flow

```
1. Admin create voucher → Generate code
2. Voucher dijual → Update status
3. User login dengan voucher → RADIUS authenticate
4. Track session → Accounting logs
5. Voucher expired → Disconnect user
```

---

## 5. Teknologi yang Dibutuhkan

### 5.1 TR-069 ACS
- **GenieACS** (https://genieacs.com/)
- MongoDB (untuk GenieACS database)
- Docker (untuk deployment)

### 5.2 RADIUS Server
- **FreeRADIUS** (https://freeradius.org/)
- PostgreSQL (untuk RADIUS database)
- NAS Integration (Mikrotik, RouterOS, dll)

### 5.3 Hotspot Voucher
- RADIUS integration
- Code generation algorithm
- Session tracking

---

## 6. Next Steps

1. **Setup Development Environment**
   - Install GenieACS (Docker)
   - Install FreeRADIUS
   - Setup test NAS device

2. **Database Migration**
   - Add new models ke Prisma schema
   - Run migration

3. **API Development**
   - GenieACS integration service
   - RADIUS service
   - Hotspot voucher service

4. **Frontend Development**
   - Device management UI
   - RADIUS user management
   - Hotspot voucher creation form
   - Voucher list & management

5. **Testing**
   - Test TR-069 device registration
   - Test RADIUS authentication
   - Test voucher generation & activation

---

## 7. Referensi

- **TR-069**: https://www.broadband-forum.org/technical/download/TR-069.pdf
- **GenieACS**: https://genieacs.com/
- **FreeRADIUS**: https://freeradius.org/
- **Mikrotik RADIUS**: https://wiki.mikrotik.com/wiki/Manual:RADIUS

