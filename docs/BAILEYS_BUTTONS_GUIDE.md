# Baileys WhatsApp Buttons Guide

## ✅ Ya, Baileys Mendukung Pengiriman Tombol!

Baileys library mendukung beberapa jenis tombol interaktif di WhatsApp:

### 1. **Quick Reply Buttons** (Tombol Balasan Cepat)
Tombol yang muncul di bawah pesan, user bisa klik untuk memilih opsi.

### 2. **URL Buttons** (Tombol Link)
Tombol yang membuka URL/link ketika diklik.

### 3. **List Messages** (Pesan dengan Daftar)
Pesan dengan dropdown list untuk memilih opsi.

## 📝 Contoh Implementasi

### Quick Reply Buttons

```typescript
import { makeWASocket } from '@whiskeysockets/baileys';

// Kirim pesan dengan tombol quick reply
await sock.sendMessage(jid, {
    text: 'Pilih opsi pembayaran:',
    buttons: [
        { buttonId: 'pay_now', buttonText: { displayText: 'Bayar Sekarang' }, type: 1 },
        { buttonId: 'pay_later', buttonText: { displayText: 'Ingatkan Nanti' }, type: 1 },
        { buttonId: 'view_invoice', buttonText: { displayText: 'Lihat Detail' }, type: 1 },
    ],
    footer: 'ISP Management',
    headerType: 1
});
```

### URL Buttons

```typescript
await sock.sendMessage(jid, {
    text: 'Klik tombol di bawah untuk melakukan pembayaran:',
    buttons: [
        { 
            buttonId: 'pay_link', 
            buttonText: { displayText: '💳 Bayar Sekarang' }, 
            type: 1 
        },
        { 
            buttonId: 'view_invoice', 
            buttonText: { displayText: '📄 Lihat Invoice' }, 
            type: 1 
        },
    ],
    footer: 'ISP Management',
    headerType: 1
});
```

### List Messages (Dropdown)

```typescript
await sock.sendMessage(jid, {
    text: 'Pilih layanan yang ingin Anda akses:',
    sections: [
        {
            title: 'Layanan',
            rows: [
                { title: 'Cek Status Tagihan', description: 'Lihat status pembayaran terakhir', rowId: 'check_bill' },
                { title: 'Request Perbaikan', description: 'Laporkan masalah teknis', rowId: 'request_fix' },
                { title: 'Upgrade Paket', description: 'Tingkatkan kecepatan internet', rowId: 'upgrade' },
            ]
        }
    ],
    buttonText: 'Pilih Layanan',
    footer: 'ISP Management',
    title: 'Menu Layanan'
});
```

## 🔄 Handle Button Responses

Untuk menangani klik tombol, gunakan event listener:

```typescript
sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    
    // Check if it's a button response
    if (msg.message?.buttonsResponseMessage) {
        const buttonId = msg.message.buttonsResponseMessage.selectedButtonId;
        const jid = msg.key.remoteJid;
        
        switch (buttonId) {
            case 'pay_now':
                // Handle pay now
                await sock.sendMessage(jid, { text: 'Mengirim link pembayaran...' });
                break;
            case 'pay_later':
                // Handle remind later
                await sock.sendMessage(jid, { text: 'Kami akan mengingatkan Anda nanti.' });
                break;
            case 'view_invoice':
                // Handle view invoice
                await sock.sendMessage(jid, { text: 'Mengambil detail invoice...' });
                break;
        }
    }
    
    // Check if it's a list response
    if (msg.message?.listResponseMessage) {
        const selectedId = msg.message.listResponseMessage.singleSelectReply.selectedRowId;
        const jid = msg.key.remoteJid;
        
        switch (selectedId) {
            case 'check_bill':
                // Handle check bill
                break;
            case 'request_fix':
                // Handle request fix
                break;
            case 'upgrade':
                // Handle upgrade
                break;
        }
    }
});
```

## ⚠️ Batasan

1. **Maksimal 3 tombol** untuk quick reply buttons
2. **Maksimal 10 opsi** per section untuk list messages
3. **Maksimal 1 section** untuk list messages sederhana
4. **Button text maksimal 20 karakter**
5. **Hanya bekerja di WhatsApp Business** atau WhatsApp dengan fitur business

## 💡 Use Cases untuk ISP Management

### 1. Payment Reminder dengan Tombol
```typescript
await sock.sendMessage(jid, {
    text: `Tagihan Anda akan jatuh tempo dalam 5 hari.\n\n💰 Total: Rp 250.000\n📅 Jatuh Tempo: 15 Februari 2024`,
    buttons: [
        { buttonId: 'pay_now', buttonText: { displayText: '💳 Bayar Sekarang' }, type: 1 },
        { buttonId: 'view_details', buttonText: { displayText: '📄 Lihat Detail' }, type: 1 },
        { buttonId: 'remind_later', buttonText: { displayText: '⏰ Ingatkan Nanti' }, type: 1 },
    ],
    footer: 'ISP Management',
    headerType: 1
});
```

### 2. Service Menu dengan List
```typescript
await sock.sendMessage(jid, {
    text: 'Pilih layanan yang Anda butuhkan:',
    sections: [
        {
            title: 'Layanan',
            rows: [
                { title: 'Cek Status Tagihan', rowId: 'check_bill' },
                { title: 'Request Perbaikan', rowId: 'request_fix' },
                { title: 'Upgrade Paket', rowId: 'upgrade' },
                { title: 'Hubungi Sales', rowId: 'contact_sales' },
            ]
        }
    ],
    buttonText: 'Pilih Menu',
    footer: 'ISP Management'
});
```

## 🔧 Implementasi di Worker

Untuk mengimplementasikan di worker WhatsApp yang sudah ada, tambahkan format khusus di content:

```
[BUTTONS:type:button1_text:button1_id:button2_text:button2_id:button3_text:button3_id]
```

Atau untuk list:
```
[LIST:title:row1_title:row1_id:row2_title:row2_id:...]
```

Worker akan memparse format ini dan mengirim sebagai tombol/list.

