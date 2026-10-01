# ISP Management System

Sistem manajemen ISP (Internet Service Provider) berbasis Next.js dengan fitur lengkap untuk manajemen pelanggan, billing, dan integrasi WhatsApp.

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

Copy file `.env.example` menjadi `.env` dan isi dengan konfigurasi yang sesuai:

```bash
cp .env.example .env
```

Edit file `.env` dan isi dengan:
- `DATABASE_URL` - Connection string PostgreSQL
- `XENDIT_SECRET_KEY` - API key dari Xendit
- `XENDIT_CALLBACK_TOKEN` - Callback token dari Xendit
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - API key Google Maps (untuk LocationMap)

### 3. Setup Database

```bash
# Run migrations
npx prisma migrate dev

# Seed default PaymentFlow data
npx ts-node prisma/seed-payment-flows.ts
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

- ✅ Pendaftaran pelanggan dengan verifikasi OTP WhatsApp
- ✅ Dashboard admin untuk manajemen pelanggan
- ✅ Sistem billing fleksibel dengan PaymentFlow
- ✅ Support berbagai skenario pembayaran (instalasi, bulanan, prepaid)
- ✅ Free trial period
- ✅ Promo code system
- ✅ Integrasi WhatsApp untuk komunikasi
- ✅ Integrasi Xendit untuk payment gateway
- ✅ Manajemen instalasi dan teknisi

## Database Schema

Gunakan Prisma untuk manage database schema. File schema ada di `prisma/schema.prisma`.

## Payment Flow System

Sistem pembayaran yang fleksibel dengan support:
- Standard Flow (bayar instalasi dulu)
- Free Installation Flow
- Prepaid Flow (bayar sekaligus dengan bonus)
- Free Trial Period
- Promo Codes

Lihat `PAYMENT_SYSTEM_DESIGN.md` untuk detail desain sistem.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Xendit API Documentation](https://docs.xendit.co/)
