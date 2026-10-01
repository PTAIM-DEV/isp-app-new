# Brainstorming: Hotspot Management dengan RouterOS API (Multi-Server)

## 📋 Overview

Membangun sistem manajemen hotspot MikroTik menggunakan **RouterOS API** langsung (tanpa RADIUS server) dengan dukungan **multi-server**. Pendekatan ini lebih sederhana dan mudah diimplementasikan, mirip dengan konsep [MIKHMON](https://laksa19.github.io).

**Fase 1 (Initial Release):**
- ✅ Generate voucher
- ✅ Monitor aktivitas hotspot
- ✅ Penjualan voucher & laporan penjualan

**Fase 2 (Future):**
- User management
- Bandwidth monitoring detail
- Advanced reporting
- Reseller management

---

## 1. Arsitektur Sistem

### 1.1 Diagram Arsitektur

```
┌─────────────────────────────────────────────────────────┐
│                    ISP App (Next.js)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Frontend   │  │   API Routes │  │   Services   │  │
│  │   (Admin)    │  │   (Backend)  │  │ (RouterOS)   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
└─────────┼─────────────────┼─────────────────┼──────────┘
          │                 │                 │
          │                 │                 │
┌─────────▼─────────────────▼─────────────────▼──────────┐
│              PostgreSQL Database                         │
│  - MikrotikServer                                        │
│  - HotspotPackage                                        │
│  - HotspotVoucher                                        │
│  - HotspotUser                                           │
│  - HotspotSession                                        │
│  - VoucherSale                                           │
└──────────────────────────────────────────────────────────┘
          │                 │                 │
          │                 │                 │
┌─────────▼─────────────────▼─────────────────▼──────────┐
│         RouterOS API Client (routeros-api)             │
│         (Node.js library untuk RouterOS API)            │
└─────────┬─────────────────┬─────────────────┬──────────┘
          │                 │                 │
          │                 │                 │
┌─────────▼─────────────────▼─────────────────▼──────────┐
│  MikroTik Router 1    MikroTik Router 2    MikroTik   │
│  (Server 1)           (Server 2)           Router N   │
│  IP: 192.168.1.1      IP: 192.168.2.1                 │
│  Port: 8728           Port: 8728                      │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Komponen Utama

1. **RouterOS API Client** - Library Node.js untuk komunikasi dengan MikroTik
2. **MikroTik Server Management** - Multi-server support
3. **Voucher Generation Engine** - Generate voucher dengan berbagai format
4. **Session Monitor** - Real-time monitoring aktivitas hotspot
5. **Sales & Reporting** - Tracking penjualan voucher

---

## 2. Database Schema

### 2.1 Schema Design

```prisma
model MikrotikServer {
  id              String   @id @default(cuid())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Server Identity
  name            String   // Nama server (e.g., "Router Utama", "Router Cabang 1")
  description     String?
  
  // Connection Info
  host            String   // IP address atau hostname
  port            Int      @default(8728) // RouterOS API port
  username        String   // RouterOS username
  password        String   // RouterOS password (encrypted)
  useSSL          Boolean  @default(false) // Use SSL/TLS
  timeout         Int      @default(5000) // Connection timeout (ms)

  // Hotspot Configuration
  hotspotProfile  String?  // Hotspot profile name di RouterOS
  hotspotInterface String? // Interface untuk hotspot (e.g., "wlan1")

  // Status
  isActive        Boolean  @default(true)
  lastConnected   DateTime?
  connectionStatus String  @default("DISCONNECTED") // CONNECTED, DISCONNECTED, ERROR
  errorMessage    String?

  // Relations
  packages        HotspotPackage[]
  vouchers        HotspotVoucher[]
  users           HotspotUser[]
  sessions        HotspotSession[]
  sales           VoucherSale[]
}

model HotspotPackage {
  id              String   @id @default(cuid())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Package Info
  name            String   // e.g., "Paket 1 Jam", "Paket Harian"
  description     String?
  
  // Server Assignment
  serverId        String
  server          MikrotikServer @relation(fields: [serverId], references: [id])

  // Voucher Configuration
  duration        Int      // Durasi dalam menit (e.g., 60 = 1 jam)
  limitUptime     String?  // Format: "1d / 2d / 60m" (MikroTik format)
  price           Decimal   // Harga voucher

  // Bandwidth Limit (optional)
  downloadSpeed   String?  // e.g., "10M" (10 Mbps)
  uploadSpeed     String?  // e.g., "5M" (5 Mbps)

  // Status
  isActive        Boolean  @default(true)

  // Relations
  vouchers        HotspotVoucher[]
  sales           VoucherSale[]
}

model HotspotVoucher {
  id              String   @id @default(cuid())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Voucher Identity
  code            String   @unique // Kode voucher (auto-generated)
  username        String?  @unique // Username untuk login (optional)
  password        String?  // Password untuk login (optional)

  // Package & Server
  packageId       String?
  package         HotspotPackage? @relation(fields: [packageId], references: [id])
  serverId        String
  server          MikrotikServer   @relation(fields: [serverId], references: [id])

  // Voucher Configuration
  duration        Int      // Durasi dalam menit
  limitUptime     String?  // Limit uptime format MikroTik
  price           Decimal   // Harga voucher

  // Code Generation Settings
  prefix          String?  // Prefix untuk code (e.g., "VIP")
  codeLength      Int       @default(8) // Panjang code
  combination     String    @default("ALPHANUMERIC") // ALPHANUMERIC, NUMERIC, ALPHABET

  // Usage Tracking
  status          String   @default("UNUSED") // UNUSED, ACTIVE, EXPIRED, USED
  activatedAt     DateTime?
  expiresAt       DateTime?
  lastUsedAt      DateTime?

  // Reseller (optional)
  resellerUserId  String?  // User reseller yang menjual voucher ini
  resellerUser    User?    @relation(fields: [resellerUserId], references: [id])

  // MikroTik Integration
  mikrotikUserId  String?  // ID user di MikroTik RouterOS (setelah dibuat)
  syncedToMikrotik Boolean  @default(false) // Sudah di-sync ke MikroTik?

  // Relations
  sessions        HotspotSession[]
  sales           VoucherSale[]
}

model HotspotUser {
  id              String   @id @default(cuid())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // User Identity
  username        String   @unique // Username di MikroTik
  password        String?  // Password (optional, bisa pakai voucher)

  // Server Assignment
  serverId        String
  server          MikrotikServer @relation(fields: [serverId], references: [id])

  // Profile & Limits
  profile         String?  // Hotspot profile name
  limitUptime     String?  // Uptime limit
  downloadSpeed   String?  // Download speed limit
  uploadSpeed     String?  // Upload speed limit

  // Status
  isActive        Boolean  @default(true)
  disabled        Boolean  @default(false)

  // MikroTik Integration
  mikrotikUserId  String?  // ID user di MikroTik RouterOS
  syncedToMikrotik Boolean @default(false)

  // Relations
  sessions        HotspotSession[]
}

model HotspotSession {
  id              String   @id @default(cuid())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Session Identity
  username        String   // Username yang login
  macAddress      String?  // MAC address device
  ipAddress       String?  // IP address yang diberikan
  serverId        String
  server          MikrotikServer @relation(fields: [serverId], references: [id])

  // Voucher Reference (jika pakai voucher)
  voucherId       String?
  voucher         HotspotVoucher? @relation(fields: [voucherId], references: [id])

  // User Reference (jika pakai user)
  userId          String?
  user            HotspotUser? @relation(fields: [userId], references: [id])

  // Session Info
  startTime       DateTime
  stopTime        DateTime?
  duration        Int?     // Duration in seconds
  bytesIn         BigInt?  // Bytes downloaded
  bytesOut        BigInt?  // Bytes uploaded
  packetsIn       Int?     // Packets received
  packetsOut      Int?     // Packets sent

  // Status
  status          String   @default("ACTIVE") // ACTIVE, STOPPED

  // MikroTik Session ID
  mikrotikSessionId String? // Session ID dari MikroTik
}

model VoucherSale {
  id              String   @id @default(cuid())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Sale Info
  voucherId       String
  voucher         HotspotVoucher @relation(fields: [voucherId], references: [id])
  
  packageId       String?
  package         HotspotPackage? @relation(fields: [packageId], references: [id])

  serverId        String
  server          MikrotikServer @relation(fields: [serverId], references: [id])

  // Sale Details
  quantity        Int      @default(1) // Jumlah voucher yang dijual
  unitPrice       Decimal  // Harga per voucher
  totalAmount     Decimal  // Total harga
  paymentMethod   String?  // CASH, TRANSFER, QRIS, etc.
  paymentStatus   String   @default("PENDING") // PENDING, PAID, CANCELLED

  // Reseller
  resellerUserId  String?
  resellerUser    User?    @relation(fields: [resellerUserId], references: [id])

  // Notes
  notes           String?
}
```

### 2.2 Update User Model (untuk Reseller)

```prisma
// Tambahkan ke model User yang sudah ada
model User {
  // ... existing fields ...
  
  // Hotspot Reseller
  soldVouchers    HotspotVoucher[] @relation("ResellerVouchers")
  voucherSales    VoucherSale[]
}
```

---

## 3. RouterOS API Integration

### 3.1 Library yang Digunakan

**routeros-api** - Node.js library untuk RouterOS API
```bash
npm install routeros-api
```

Atau alternatif:
- **node-routeros** - Alternative library
- **mikrotik-api** - Another option

### 3.2 RouterOS API Service

```typescript
// lib/services/routeros.ts
import { RouterOSAPI } from 'routeros-api';

export interface MikrotikConnectionConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  useSSL?: boolean;
  timeout?: number;
}

export class RouterOSService {
  private connections: Map<string, RouterOSAPI> = new Map();

  // Connect ke MikroTik server
  async connect(serverId: string, config: MikrotikConnectionConfig): Promise<RouterOSAPI> {
    const conn = new RouterOSAPI({
      host: config.host,
      user: config.username,
      password: config.password,
      port: config.port || 8728,
      timeout: config.timeout || 5000,
      keepalive: true
    });

    await conn.connect();
    this.connections.set(serverId, conn);
    
    return conn;
  }

  // Get connection (reuse existing atau create new)
  async getConnection(serverId: string, config: MikrotikConnectionConfig): Promise<RouterOSAPI> {
    let conn = this.connections.get(serverId);
    
    if (!conn || !conn.connected) {
      conn = await this.connect(serverId, config);
    }
    
    return conn;
  }

  // Create hotspot user
  async createHotspotUser(
    serverId: string,
    config: MikrotikConnectionConfig,
    userData: {
      username: string;
      password?: string;
      profile?: string;
      limitUptime?: string;
      disabled?: boolean;
    }
  ): Promise<any> {
    const conn = await this.getConnection(serverId, config);
    
    const result = await conn.write('/ip/hotspot/user/add', [
      `=name=${userData.username}`,
      userData.password ? `=password=${userData.password}` : '',
      userData.profile ? `=profile=${userData.profile}` : '',
      userData.limitUptime ? `=limit-uptime=${userData.limitUptime}` : '',
      `=disabled=${userData.disabled ? 'yes' : 'no'}`
    ].filter(Boolean));

    return result;
  }

  // Remove hotspot user
  async removeHotspotUser(
    serverId: string,
    config: MikrotikConnectionConfig,
    username: string
  ): Promise<void> {
    const conn = await this.getConnection(serverId, config);
    
    // Find user ID
    const users = await conn.write('/ip/hotspot/user/print', [
      `?name=${username}`
    ]);

    if (users.length > 0) {
      await conn.write('/ip/hotspot/user/remove', [
        `=.id=${users[0]['.id']}`
      ]);
    }
  }

  // Get active sessions
  async getActiveSessions(
    serverId: string,
    config: MikrotikConnectionConfig
  ): Promise<any[]> {
    const conn = await this.getConnection(serverId, config);
    
    const sessions = await conn.write('/ip/hotspot/active/print');
    return sessions;
  }

  // Disconnect session
  async disconnectSession(
    serverId: string,
    config: MikrotikConnectionConfig,
    sessionId: string
  ): Promise<void> {
    const conn = await this.getConnection(serverId, config);
    
    await conn.write('/ip/hotspot/active/remove', [
      `=.id=${sessionId}`
    ]);
  }

  // Get user info
  async getUserInfo(
    serverId: string,
    config: MikrotikConnectionConfig,
    username: string
  ): Promise<any> {
    const conn = await this.getConnection(serverId, config);
    
    const users = await conn.write('/ip/hotspot/user/print', [
      `?name=${username}`
    ]);

    return users.length > 0 ? users[0] : null;
  }

  // Update user
  async updateHotspotUser(
    serverId: string,
    config: MikrotikConnectionConfig,
    username: string,
    updates: {
      password?: string;
      profile?: string;
      limitUptime?: string;
      disabled?: boolean;
    }
  ): Promise<void> {
    const conn = await this.getConnection(serverId, config);
    
    // Find user ID
    const users = await conn.write('/ip/hotspot/user/print', [
      `?name=${username}`
    ]);

    if (users.length > 0) {
      const updateParams = [
        `=.id=${users[0]['.id']}`,
        updates.password ? `=password=${updates.password}` : '',
        updates.profile ? `=profile=${updates.profile}` : '',
        updates.limitUptime ? `=limit-uptime=${updates.limitUptime}` : '',
        updates.disabled !== undefined ? `=disabled=${updates.disabled ? 'yes' : 'no'}` : ''
      ].filter(Boolean);

      await conn.write('/ip/hotspot/user/set', updateParams);
    }
  }
}
```

### 3.3 Hotspot Voucher Service

```typescript
// lib/services/hotspot-voucher.ts
import { PrismaClient } from '@prisma/client';
import { RouterOSService } from './routeros';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();
const routerosService = new RouterOSService();

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
      where: { id: packageId },
      include: { server: true }
    });

    if (!package_) throw new Error('Package not found');

    const vouchers = [];

    for (let i = 0; i < quantity; i++) {
      const code = this.generateCode(
        options.prefix || '',
        options.codeLength || 8,
        options.combination || 'ALPHANUMERIC'
      );

      const username = options.username ? code : null;
      const password = options.password ? this.generatePassword() : null;

      // Create voucher di database
      const voucher = await prisma.hotspotVoucher.create({
        data: {
          code,
          username,
          password,
          packageId,
          serverId,
          duration: package_.duration,
          limitUptime: package_.limitUptime,
          price: package_.price,
          prefix: options.prefix,
          codeLength: options.codeLength || 8,
          combination: options.combination || 'ALPHANUMERIC',
          status: 'UNUSED'
        }
      });

      // Sync ke MikroTik jika perlu (optional, bisa dilakukan saat aktivasi)
      // await this.syncVoucherToMikrotik(voucher);

      vouchers.push(voucher);
    }

    return vouchers;
  }

  // Sync voucher ke MikroTik
  async syncVoucherToMikrotik(voucherId: string) {
    const voucher = await prisma.hotspotVoucher.findUnique({
      where: { id: voucherId },
      include: { server: true, package: true }
    });

    if (!voucher || voucher.syncedToMikrotik) return;

    const username = voucher.username || voucher.code;
    const password = voucher.password || voucher.code;

    // Create user di MikroTik
    const result = await routerosService.createHotspotUser(
      voucher.serverId,
      {
        host: voucher.server.host,
        port: voucher.server.port,
        username: voucher.server.username,
        password: voucher.server.password, // Decrypt jika perlu
        useSSL: voucher.server.useSSL,
        timeout: voucher.server.timeout
      },
      {
        username,
        password,
        limitUptime: voucher.limitUptime || `${voucher.duration}m`,
        disabled: false
      }
    );

    // Update voucher dengan MikroTik user ID
    await prisma.hotspotVoucher.update({
      where: { id: voucherId },
      data: {
        mikrotikUserId: result['.id'],
        syncedToMikrotik: true,
        status: 'ACTIVE'
      }
    });
  }

  // Activate voucher (saat digunakan pertama kali)
  async activateVoucher(code: string) {
    const voucher = await prisma.hotspotVoucher.findUnique({
      where: { code },
      include: { server: true }
    });

    if (!voucher) throw new Error('Voucher not found');
    if (voucher.status !== 'UNUSED') throw new Error('Voucher already used');

    // Sync ke MikroTik jika belum
    if (!voucher.syncedToMikrotik) {
      await this.syncVoucherToMikrotik(voucher.id);
    }

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

    return voucher;
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
}
```

---

## 4. API Endpoints

### 4.1 MikroTik Server Management

```typescript
// app/api/admin/hotspot/servers/route.ts
export async function GET() {
  const servers = await prisma.mikrotikServer.findMany({
    include: {
      _count: {
        select: {
          vouchers: true,
          users: true,
          sessions: true
        }
      }
    }
  });

  return Response.json({ servers });
}

export async function POST(request: Request) {
  const body = await request.json();
  
  // Test connection dulu
  const routerosService = new RouterOSService();
  try {
    await routerosService.connect('test', {
      host: body.host,
      port: body.port || 8728,
      username: body.username,
      password: body.password,
      useSSL: body.useSSL || false
    });
  } catch (error) {
    return Response.json({ error: 'Connection failed' }, { status: 400 });
  }

  const server = await prisma.mikrotikServer.create({
    data: {
      name: body.name,
      description: body.description,
      host: body.host,
      port: body.port || 8728,
      username: body.username,
      password: encryptPassword(body.password), // Encrypt password
      useSSL: body.useSSL || false,
      hotspotProfile: body.hotspotProfile,
      hotspotInterface: body.hotspotInterface
    }
  });

  return Response.json({ server });
}
```

### 4.2 Voucher Generation

```typescript
// app/api/admin/hotspot/vouchers/generate/route.ts
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

  const voucherService = new HotspotVoucherService();
  const vouchers = await voucherService.generateVouchers(
    serverId,
    packageId,
    quantity,
    { prefix, codeLength, combination, username, password }
  );

  return Response.json({ vouchers, count: vouchers.length });
}
```

### 4.3 Session Monitoring

```typescript
// app/api/admin/hotspot/sessions/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const serverId = searchParams.get('serverId');

  // Get sessions from database
  const sessions = await prisma.hotspotSession.findMany({
    where: serverId ? { serverId } : undefined,
    include: {
      server: true,
      voucher: true,
      user: true
    },
    orderBy: { startTime: 'desc' },
    take: 100
  });

  return Response.json({ sessions });
}

// Sync sessions from MikroTik
// app/api/admin/hotspot/sessions/sync/route.ts
export async function POST(request: Request) {
  const { serverId } = await request.json();

  const server = await prisma.mikrotikServer.findUnique({
    where: { id: serverId }
  });

  if (!server) {
    return Response.json({ error: 'Server not found' }, { status: 404 });
  }

  const routerosService = new RouterOSService();
  const activeSessions = await routerosService.getActiveSessions(
    serverId,
    {
      host: server.host,
      port: server.port,
      username: server.username,
      password: decryptPassword(server.password),
      useSSL: server.useSSL,
      timeout: server.timeout
    }
  );

  // Sync ke database
  for (const session of activeSessions) {
    await prisma.hotspotSession.upsert({
      where: { mikrotikSessionId: session['.id'] },
      update: {
        bytesIn: BigInt(session['bytes-in'] || 0),
        bytesOut: BigInt(session['bytes-out'] || 0),
        packetsIn: session['packets-in'] || 0,
        packetsOut: session['packets-out'] || 0,
        duration: session['uptime'] || 0,
        status: 'ACTIVE'
      },
      create: {
        username: session.user,
        macAddress: session['mac-address'],
        ipAddress: session.address,
        serverId: serverId,
        startTime: new Date(session['uptime'] * 1000),
        bytesIn: BigInt(session['bytes-in'] || 0),
        bytesOut: BigInt(session['bytes-out'] || 0),
        packetsIn: session['packets-in'] || 0,
        packetsOut: session['packets-out'] || 0,
        duration: session['uptime'] || 0,
        mikrotikSessionId: session['.id'],
        status: 'ACTIVE'
      }
    });
  }

  return Response.json({ synced: activeSessions.length });
}
```

### 4.4 Sales & Reporting

```typescript
// app/api/admin/hotspot/sales/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const serverId = searchParams.get('serverId');

  const sales = await prisma.voucherSale.findMany({
    where: {
      createdAt: {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined
      },
      serverId: serverId || undefined
    },
    include: {
      voucher: true,
      package: true,
      server: true,
      resellerUser: true
    },
    orderBy: { createdAt: 'desc' }
  });

  // Calculate totals
  const totalSales = sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
  const totalQuantity = sales.reduce((sum, sale) => sum + sale.quantity, 0);

  return Response.json({
    sales,
    summary: {
      totalSales,
      totalQuantity,
      count: sales.length
    }
  });
}
```

---

## 5. Frontend Components

### 5.1 Server Management Page

```
/admin/hotspot/servers
- List semua server MikroTik
- Add new server (form dengan test connection)
- Edit server
- Delete server
- Connection status indicator
```

### 5.2 Voucher Generation Page (sesuai screenshot)

```
/admin/hotspot/vouchers/new
- Form fields:
  ✅ Pilih Server (dropdown)
  ✅ User Reseller (optional dropdown)
  ✅ Paket (dropdown, filtered by server)
  ✅ Deskripsi Voucher (text input)
  ✅ Username checkbox
  ✅ Password checkbox
  ✅ Jumlah Voucher (number input)
  ✅ Limit Uptime (text input, format: "1d / 2d / 60m")
  ✅ Harga Voucher (number input)
  ✅ Panjang Huruf (number input, max 10)
  ✅ Awalan / Prefix (text input)
  ✅ Kombinasi (dropdown: ALPHANUMERIC, NUMERIC, ALPHABET)
- Generate button
- Preview generated vouchers
- Export/Print vouchers
```

### 5.3 Voucher List Page

```
/admin/hotspot/vouchers
- Table dengan columns:
  - Code
  - Server
  - Package
  - Duration
  - Price
  - Status
  - Created At
  - Actions (View, Delete, Print)
- Filter by server, status, date range
- Search by code
```

### 5.4 Monitor Page

```
/admin/hotspot/monitor
- Real-time active sessions
- Server status
- Active users count
- Bandwidth usage (if available)
- Recent sessions history
```

### 5.5 Sales & Reports Page

```
/admin/hotspot/sales
- Sales list dengan filter
- Summary cards:
  - Total Sales (hari ini, bulan ini)
  - Total Vouchers Sold
  - Top Packages
  - Top Servers
- Charts:
  - Sales over time
  - Sales by package
  - Sales by server
- Export reports
```

---

## 6. Implementation Steps

### Phase 1: Foundation (Week 1-2)

1. **Setup Database Schema**
   - Add Prisma models
   - Run migration
   - Seed test data

2. **RouterOS API Integration**
   - Install routeros-api library
   - Create RouterOSService
   - Test connection dengan MikroTik
   - Implement basic CRUD operations

3. **Server Management**
   - CRUD MikroTik servers
   - Connection testing
   - Status monitoring

### Phase 2: Voucher System (Week 3-4)

4. **Voucher Generation**
   - Code generation algorithm
   - Package management
   - Generate vouchers API
   - Sync to MikroTik (optional)

5. **Frontend Voucher Form**
   - Create form sesuai screenshot
   - Validation
   - Preview generated vouchers
   - Export/Print functionality

### Phase 3: Monitoring (Week 5)

6. **Session Monitoring**
   - Sync sessions from MikroTik
   - Real-time updates (polling atau websocket)
   - Session history
   - Disconnect functionality

7. **Monitor Dashboard**
   - Active sessions display
   - Server status
   - Usage statistics

### Phase 4: Sales & Reporting (Week 6)

8. **Sales Tracking**
   - Record voucher sales
   - Sales API
   - Sales list page

9. **Reports**
   - Sales summary
   - Charts & graphs
   - Export functionality

---

## 7. Security Considerations

1. **Password Encryption**
   - Encrypt MikroTik passwords di database
   - Use environment variables untuk encryption key

2. **API Security**
   - Authentication required untuk semua admin endpoints
   - Rate limiting
   - Input validation

3. **Connection Security**
   - Use SSL/TLS untuk RouterOS API jika memungkinkan
   - Secure credential storage

---

## 8. Dependencies

```json
{
  "dependencies": {
    "routeros-api": "^1.0.0",
    // atau alternatif:
    // "node-routeros": "^1.0.0",
    // "mikrotik-api": "^1.0.0"
  }
}
```

---

## 9. Referensi

- **MIKHMON**: https://laksa19.github.io
- **RouterOS API**: https://wiki.mikrotik.com/wiki/Manual:API
- **routeros-api npm**: https://www.npmjs.com/package/routeros-api
- **MikroTik Hotspot**: https://wiki.mikrotik.com/wiki/Manual:IP/Hotspot

---

## 10. Next Steps

1. ✅ Review & approve design
2. ✅ Setup development environment
3. ✅ Install RouterOS API library
4. ✅ Test connection dengan MikroTik
5. ✅ Implement database schema
6. ✅ Build API endpoints
7. ✅ Create frontend components
8. ✅ Testing & deployment



