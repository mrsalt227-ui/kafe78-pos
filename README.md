# Kafe 78 — POS

Aplikasi Point of Sale untuk Kafe 78: kasir, waiter, dapur, antar, stok, laporan, dan owner
dalam satu dashboard. Data tersinkron realtime lewat Firebase Realtime Database.

Aplikasi pendamping (pemesanan mandiri via scan QR) ada di repo **kafe78-customer**.

## Fitur

- **Kasir** — buat order, pembayaran, struk, kelola meja.
- **Waiter** — order meja, keranjang dibatasi stok, kirim ke dapur.
- **Dapur** — antrian masak, update status.
- **Antar** — daftar pesanan siap antar.
- **Stok** — master menu, batch FIFO, mode stok `atomic` / batch.
- **Laporan** — penjualan, laba/rugi (pakai `costPrice`), growth vs periode sebelumnya.
- **Owner** — manajemen user/PIN, pengaturan, backup.
- **Customer service & chat tim** — drawer chat internal.
- **Gemini advisor** — opsional, butuh `GEMINI_API_KEY`.

## Stack

- React 19 + TypeScript + Vite
- Express (`server.ts`) sebagai server dev/produksi + endpoint API
- Firebase Realtime Database (`servers/78/v2`)

## Setup

Butuh **Node.js 20+**.

```bash
npm install
cp .env.example .env
```

Isi `.env`:

| Variabel | Keterangan |
|---|---|
| `VITE_FIREBASE_API_KEY` | Dari Firebase Console |
| `VITE_FIREBASE_DATABASE_URL` | Contoh `https://<project>-default-rtdb.asia-southeast1.firebasedatabase.app` |
| `VITE_FIREBASE_PROJECT_ID` | ID project |
| `VITE_FIREBASE_AUTH_DOMAIN` | `<project>.firebaseapp.com` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `<project>.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender ID |
| `VITE_FIREBASE_APP_ID` | App ID web |
| `VITE_CUSTOMER_APP_URL` | URL aplikasi customer, mis. `http://localhost:5174` |
| `GEMINI_API_KEY` | Opsional |

Tanpa `VITE_FIREBASE_*`, aplikasi tetap jalan dalam mode lokal (`localStorage`).

## Menjalankan

```bash
npm run dev          # http://localhost:3000
```

Port bisa diubah: `PORT=3001 npm run dev`.

Build produksi:

```bash
npm run build
npm start            # jalankan server.ts (butuh tsx/Node dengan dukungan TS)
```

## Login (data seed)

| Peran | PIN |
|---|---|
| Waiter | `111111` |
| Dapur | `222222` |
| Antar | `333333` |
| Kasir | `444444` |
| Stok | `555555` |
| Laporan | `666666` |
| Owner | `123456` |

## Keamanan

⚠️ **Jangan deploy apa adanya.** Rules RTDB pada setup ini terbuka (read/write publik),
PIN tersimpan plaintext, dan validasi harga/stok masih di sisi client.
Detail temuan lengkap ada di [`AUDIT.md`](./AUDIT.md).
