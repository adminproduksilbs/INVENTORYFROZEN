# LBS Inventory Frozen — Final v10

Versi final aplikasi Inventory & Stok Opname PT Lampung Bay Seafood.

## Perubahan final
- Dashboard modern mengikuti desain referensi: KPI, grafik pergerakan 7 hari, donut kategori, aktivitas terbaru, status sinkronisasi.
- Tidak ada kartu Akses Cepat di Dashboard.
- Menu sidebar: Dashboard, Produksi, Stok Masuk/Keluar, Stok Opname, Laporan, Produk, Pengguna (Admin).
- Login Admin: email + password.
- Login Operator: PIN 4 digit melalui akun Firebase Operator yang sudah ada.
- Fitur Produksi, barcode, Stok Opname, laporan Excel/PDF, CRUD produk dan pengguna tetap dipertahankan.
- Firebase project tetap `lbs-peminjaman`; tidak menghapus collection/data lama.

## Operator PIN
PIN yang disepakati: `0112`. Karena Firebase Authentication memerlukan kredensial, aplikasi menggunakan PIN tersebut sebagai password akun Operator `operator@lampungbayseafood.com` di belakang layar. PIN tidak disimpan di Firestore.

## Deploy
Upload `index.html`, `app.js`, `style.css`, `logo-lbs.png`, dan `README.md` ke root repository GitHub Pages yang sama.
