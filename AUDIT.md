# Audit Bug — Kafe 78 (POS + Customer QR Ordering)

Tanggal: 2026-11-01

## Status Menjalankan

| App | URL | Port | Proses |
|---|---|---|---|
| POS (`kafe78-react`) | http://localhost:3001 | 3001 | `tsx server.ts` (Express + Vite middleware) |
| Customer (`kafe78-customer`) | http://localhost:5175 | 5175 | `vite --port 5175 --host 0.0.0.0` |

Keduanya merespons **HTTP 200**.

Login POS (seed): waiter `111111`, dapur `222222`, antar `333333`, kasir `444444`, stok `555555`, laporan `666666`, owner `123456`.

URL meja customer: `http://localhost:5175/?t=<token>` (token contoh `T01` = `fd4b714ce94daf96cfa2f949`).

---

## Bug yang Ditemukan & Sudah Diperbaiki

### Kritis

1. **Customer app tidak punya konfigurasi Firebase**
   - File: `kafe78-customer/.env` (tidak ada)
   - Dampak: aplikasi customer blank / tidak bisa baca menu.
   - Fix: menambahkan `.env` berisi `VITE_FIREBASE_*` yang sama dengan POS.

2. **URL QR dari POS tidak bisa dibuka customer app**
   - File: `kafe78-customer/src/main.tsx`, `src/lib/customerOrdering.ts` (kedua project)
   - Penyebab: POS membuat URL `/order/<token>` / `/t/<token>`, customer hanya membaca `?t=`; juga muncul `//` saat base URL berakhiran `/`.
   - Fix: customer menerima `?t=`, `/order/t/<token>`, `/t/<token>`; `customerUrl()` menormalkan trailing slash dan memakai `?t=`.

### Tinggi

3. **Tabrakan ID order**
   - File: `src/utils/pos.ts`, `src/App.tsx`, `customerOrdering.ts`
   - Penyebab: ID dari `Date.now()` saja → dua order di milidetik sama saling menimpa.
   - Fix: `generateOrderId(existingIds)` dengan suffix acak + cek duplikat.

4. **Order `ditolak` / `dibatalkan` masih dihitung sebagai meja terisi**
   - File: `src/App.tsx` (`occupiedTables`, `navCounts.kasir`), `CashierModule.tsx` (`unpaidOrders`)
   - Dampak: meja terkunci padahal order sudah batal; badge kasir salah; order batal masih bisa dibayar.
   - Fix: filter status `ditolak`/`dibatalkan`; guard pembayaran.

5. **`costPrice` tidak tersimpan pada order waiter**
   - File: `src/App.tsx`
   - Dampak: laporan laba/rugi jadi 0 atau salah.
   - Fix: `costPrice` diambil dari menu saat order dibuat.

6. **Tidak ada validasi stok di waiter & customer**
   - File: `WaiterModule.tsx`, `CustomerApp.tsx`
   - Dampak: qty bisa melebihi stok → oversell.
   - Fix: qty dibatasi stok + toast saat kena batas; validasi ulang sebelum kirim order.

7. **Customer order mengabaikan `settings/stok_mode`**
   - File: `kafe78-customer/src/lib/customerOrdering.ts`
   - Dampak: mode `atomic` tetap memotong batch FIFO → stok dobel/desync.
   - Fix: hanya proses batch FIFO bila mode bukan `atomic`.

8. **Approve order customer tanpa cek stok**
   - File: `src/App.tsx`
   - Dampak: order disetujui walau stok kurang → stok minus.
   - Fix: guard stok sebelum approve.

### Sedang

9. **Growth rate laporan hardcoded `14.8`**
   - File: `ReportModule.tsx`
   - Fix: dihitung dari periode sebelumnya; `null` bila tidak ada baseline (UI menampilkan “—”).
   - Bonus: filter “Hari Ini” memakai awal hari kalender, bukan 24 jam terakhir.

10. **`selectedMenuId` di modul stok basi**
    - File: `StockModule.tsx`
    - Penyebab: menu dimuat async, selection tidak di-reset.
    - Fix: `useEffect` resync saat menu berubah.

### Blocker build / konfigurasi

11. **Konflik versi esbuild di POS** — `^0.25.0` vs dependency lain → `npm install` gagal. Fix: `^0.28.0`.
12. **`VITE_CUSTOMER_APP_URL` tidak diset di POS** → QR mengarah ke URL salah. Fix: `http://localhost:5175` (ganti ke IP/domain saat produksi).

---

## Masalah yang BELUM Diperbaiki (rekomendasi)

| Prioritas | Masalah | Rekomendasi |
|---|---|---|
| 🔴 Kritis | Firebase RTDB rules terbuka (read/write publik) | Terapkan rules + App Check; jangan publish DB terbuka |
| 🔴 Kritis | PIN plaintext di DB & auth sepenuhnya client-side | Hash PIN, pindah verifikasi ke backend/Cloud Functions |
| 🔴 Kritis | Harga & stok divalidasi di client | Validasi ulang di server (Cloud Function/API) sebelum commit order |
| 🟠 Tinggi | Baca-ubah-tulis seluruh array `orders` → lost update antar POS & customer | Simpan per-order di child node + `runTransaction`/multi-path update |
| 🟠 Tinggi | `vercel.json` rewrite `/api/*` memutus `/api/gemini/*` | Kecualikan `/api/gemini` dari rewrite |
| 🟡 Sedang | `StockModule` edit +/- langsung tidak menyinkronkan batch FIFO | Update batch bersamaan atau hitung ulang dari ledger |
| 🟡 Sedang | Duplikat kode mati `CustomerApp.tsx` + `customerOrdering.ts` di project POS | Hapus agar tidak ada dua sumber kebenaran |
| 🟡 Sedang | `npm start` = `node server.ts` (TypeScript) gagal di Node biasa | Pakai `tsx server.ts` atau build dulu |
| 🟢 Rendah | Export CSV tanpa BOM & escaping | Tambah `\uFEFF` + escape `"`/`,`/newline |

Catatan lingkungan: HMR dinonaktifkan (`DISABLE_HMR=true`) karena port 24678 sudah dipakai proses lain; warning WebSocket di console tidak fatal.

---

## Verifikasi

- Typecheck TS 5.9: **exit 0** (kedua project)
- Build produksi Vite 8.3.5: **exit 0** (kedua project)
- `GET /` POS 3001 → **200**, Customer 5175 → **200**
- Firebase RTDB `servers/78/v2` → read/write OK (uji tulis/hapus scratch 200)
- Env `VITE_CUSTOMER_APP_URL` ter-inline `http://localhost:5175` pada bundle POS
