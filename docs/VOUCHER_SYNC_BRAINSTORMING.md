# Brainstorming: Voucher Sync & Server Status Management

## Masalah yang Dihadapi

1. **Voucher dihapus di MikroTik tapi masih ada di Web App**
   - Admin MikroTik menghapus voucher langsung di RouterOS
   - Web app tidak tahu bahwa voucher sudah dihapus
   - Data menjadi tidak sinkron

2. **Status Server Tidak Terlihat**
   - Tidak ada indikator jika server MikroTik terputus
   - Tidak ada informasi error connection
   - User tidak tahu kenapa sync gagal

3. **Voucher dari Multiple Server Bercampur**
   - Voucher dari berbagai server ditampilkan dalam satu list
   - Sulit untuk melihat voucher per server
   - Tidak ada grouping yang jelas

---

## Solusi yang Diusulkan

### 1. Sync Strategy: Check Before Delete vs Periodic Sync

#### Opsi A: Check Before Delete (Recommended)
**Cara Kerja:**
- Ketika user akan delete voucher, check dulu di MikroTik apakah masih ada
- Jika tidak ada di MikroTik, langsung hapus dari database
- Jika masih ada di MikroTik, tampilkan warning atau hapus dari MikroTik dulu

**Kelebihan:**
- ✅ Tidak akan sync voucher yang belum digunakan
- ✅ On-demand, hanya check saat diperlukan
- ✅ Lebih efisien, tidak perlu periodic job
- ✅ User punya kontrol penuh

**Kekurangan:**
- ❌ Perlu koneksi ke MikroTik setiap kali delete
- ❌ Jika server offline, delete akan gagal

**Implementasi:**
```typescript
// Pseudo code
async function deleteVoucher(voucherId: string) {
  const voucher = await getVoucher(voucherId);
  
  if (voucher.syncedToMikrotik && voucher.username) {
    // Check di MikroTik
    const existsInMikrotik = await checkUserExists(voucher.serverId, voucher.username);
    
    if (existsInMikrotik) {
      // Hapus dari MikroTik dulu
      await removeFromMikrotik(voucher.serverId, voucher.username);
    }
    // Jika tidak ada di MikroTik, langsung hapus dari DB
  }
  
  await deleteFromDatabase(voucherId);
}
```

#### Opsi B: Periodic Sync
**Cara Kerja:**
- Cron job yang berjalan setiap X menit/jam
- Check semua voucher yang `syncedToMikrotik = true`
- Compare dengan data di MikroTik
- Update status atau hapus jika tidak ada di MikroTik

**Kelebihan:**
- ✅ Otomatis, tidak perlu user action
- ✅ Bisa detect perubahan dari MikroTik

**Kekurangan:**
- ❌ Akan sync semua voucher termasuk yang belum digunakan
- ❌ Resource intensive (check semua voucher)
- ❌ Bisa menyebabkan race condition jika user sedang edit

**Implementasi:**
```typescript
// Cron job setiap 30 menit
async function syncVouchersWithMikrotik() {
  const syncedVouchers = await getSyncedVouchers();
  
  for (const voucher of syncedVouchers) {
    const exists = await checkUserExists(voucher.serverId, voucher.username);
    
    if (!exists) {
      // Voucher sudah dihapus di MikroTik
      await markAsDeleted(voucher.id);
      // Atau hapus langsung
      await deleteVoucher(voucher.id);
    }
  }
}
```

#### Opsi C: Hybrid Approach (Best Solution)
**Cara Kerja:**
- **Check Before Delete** sebagai default
- **Manual Sync Button** untuk sync semua voucher per server
- **Status Indicator** untuk voucher yang mungkin tidak sinkron

**Kelebihan:**
- ✅ Kombinasi kelebihan kedua opsi
- ✅ User punya kontrol penuh
- ✅ Bisa manual sync jika diperlukan

**Implementasi:**
```typescript
// 1. Check before delete (default)
async function deleteVoucher(voucherId: string) {
  // Check di MikroTik sebelum delete
  // ...
}

// 2. Manual sync per server
async function syncServerVouchers(serverId: string) {
  const vouchers = await getVouchersByServer(serverId);
  // Check semua voucher di server ini
  // Update status yang tidak sinkron
}

// 3. Status indicator
interface VoucherStatus {
  synced: boolean;
  existsInMikrotik: boolean;
  lastChecked: Date;
}
```

---

### 2. Server Status Display

**Fitur:**
- Tampilkan status koneksi server (CONNECTED, DISCONNECTED, ERROR)
- Tampilkan error message jika ada
- Tampilkan last connected time
- Badge/warning jika server offline

**Implementasi:**
```typescript
interface ServerStatus {
  id: string;
  name: string;
  connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  lastConnected: Date | null;
  errorMessage: string | null;
  isActive: boolean;
}

// Di UI
<div className="server-status">
  <Badge status={server.connectionStatus}>
    {server.connectionStatus === 'CONNECTED' && '✓ Terhubung'}
    {server.connectionStatus === 'ERROR' && '✗ Error: ' + server.errorMessage}
    {server.connectionStatus === 'DISCONNECTED' && '○ Terputus'}
  </Badge>
  {server.lastConnected && (
    <span className="text-xs text-gray-500">
      Terakhir: {formatDate(server.lastConnected)}
    </span>
  )}
</div>
```

**Lokasi Display:**
1. Di header voucher list (jika filter by server)
2. Di setiap row voucher (badge kecil)
3. Di server selector dropdown
4. Di tab header (jika pakai tab per server)

---

### 3. Grouping Voucher Per Server (Tab-based)

**Fitur:**
- Tab untuk setiap server aktif
- Tab "All" untuk semua voucher
- Voucher dikelompokkan per server dalam tab masing-masing

**UI Design:**
```
┌─────────────────────────────────────────────────┐
│ [All] [Server A] [Server B] [Server C]          │
├─────────────────────────────────────────────────┤
│ Server Status: ✓ Terhubung | Last: 2 min ago   │
│                                                 │
│ [Checkbox] Kode | Server | Package | ...       │
│ [✓] VOUCHER1   | Server A | ...                │
│ [✓] VOUCHER2   | Server A | ...                │
└─────────────────────────────────────────────────┘
```

**Implementasi:**
```typescript
// Group vouchers by server
const vouchersByServer = vouchers.reduce((acc, voucher) => {
  const serverId = voucher.server.id;
  if (!acc[serverId]) {
    acc[serverId] = {
      server: voucher.server,
      vouchers: []
    };
  }
  acc[serverId].vouchers.push(voucher);
  return acc;
}, {});

// Render tabs
<Tabs>
  <Tab label="All" value="all">
    <VoucherList vouchers={allVouchers} />
  </Tab>
  {servers.map(server => (
    <Tab 
      key={server.id} 
      label={server.name}
      value={server.id}
      badge={serverStatus[server.id]?.connectionStatus}
    >
      <ServerStatusDisplay server={server} />
      <VoucherList vouchers={vouchersByServer[server.id]?.vouchers || []} />
    </Tab>
  ))}
</Tabs>
```

---

## Rekomendasi Implementasi

### Phase 1: Server Status Display
1. ✅ Fetch server status saat load page
2. ✅ Display status badge di UI
3. ✅ Show error message jika ada
4. ✅ Auto-refresh status setiap 30 detik

### Phase 2: Check Before Delete
1. ✅ Modify delete function untuk check di MikroTik
2. ✅ Handle case: voucher tidak ada di MikroTik
3. ✅ Handle case: server offline
4. ✅ Show appropriate message ke user

### Phase 3: Tab-based Grouping
1. ✅ Group vouchers by server
2. ✅ Create tab component
3. ✅ Add server status di tab header
4. ✅ Maintain filter/search across tabs

### Phase 4: Manual Sync (Optional)
1. ✅ Add "Sync Server" button per tab
2. ✅ Check all vouchers di server
3. ✅ Update status yang tidak sinkron
4. ✅ Show sync result

---

## Database Schema Changes (if needed)

```prisma
model HotspotVoucher {
  // ... existing fields
  
  // Sync tracking
  lastSyncCheck    DateTime?  // Last time checked di MikroTik
  syncStatus       String?     // 'SYNCED', 'NOT_FOUND', 'ERROR'
  syncErrorMessage String?    // Error message jika sync gagal
}
```

---

## API Endpoints Needed

1. `GET /api/admin/hotspot/servers/status` - Get all servers status
2. `POST /api/admin/hotspot/vouchers/[id]/check-mikrotik` - Check if voucher exists in MikroTik
3. `POST /api/admin/hotspot/servers/[id]/sync-vouchers` - Sync all vouchers in server
4. `GET /api/admin/hotspot/vouchers?serverId=xxx` - Get vouchers by server (already exists)

---

## User Experience Flow

### Delete Voucher Flow:
1. User klik delete voucher
2. System check: Apakah voucher `syncedToMikrotik = true`?
   - Jika **tidak**: Langsung hapus dari DB
   - Jika **ya**: 
     - Check server status (online/offline)
     - Jika **offline**: Tampilkan warning, tanya apakah tetap hapus dari DB?
     - Jika **online**: 
       - Check apakah masih ada di MikroTik
       - Jika **ada**: Hapus dari MikroTik dulu, lalu hapus dari DB
       - Jika **tidak ada**: Langsung hapus dari DB (sudah dihapus manual di MikroTik)
3. Show success/error message

### View Voucher Flow:
1. User buka voucher list
2. System load semua server dan status
3. Display tabs: [All] [Server A] [Server B] ...
4. Setiap tab show:
   - Server status badge
   - Voucher list untuk server tersebut
5. User bisa switch tab untuk lihat voucher per server

---

## Technical Considerations

1. **Performance:**
   - Check before delete: 1 API call per delete (acceptable)
   - Manual sync: Batch check untuk efisiensi
   - Server status: Cache untuk 30 detik

2. **Error Handling:**
   - Server offline: Show warning, allow delete from DB
   - Timeout: Retry once, then show error
   - Network error: Show user-friendly message

3. **Data Consistency:**
   - Use transaction untuk delete (MikroTik + DB)
   - Rollback jika salah satu gagal
   - Log semua sync operations

---

## Next Steps

1. ✅ Review dan approve approach
2. ✅ Implement Phase 1 (Server Status)
3. ✅ Implement Phase 2 (Check Before Delete)
4. ✅ Implement Phase 3 (Tab Grouping)
5. ✅ Testing dan refinement

