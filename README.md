# LBS Inventory & Stok Opname — Paket Lengkap

## Isi fitur
- Login Firebase Authentication
- Role Admin / Operator
- Dashboard
- Master Produk CRUD
- Barcode scanning kamera
- Inventory
- Stok Masuk / Keluar
- Riwayat transaksi
- Stok Opname: system stock, physical stock, difference
- Finalisasi opname dan penyesuaian stok
- Manajemen pengguna Operator oleh Admin
- Export Excel
- PDF Berita Acara Stok Opname
- Responsive HP / tablet / laptop / PC

## Firebase yang digunakan
Project: `lbs-peminjaman`
Firestore collections:
`products`, `categories`, `users`, `stock_transactions`, `opnames` + subcollection `details`.

Koleksi lama `user` tidak disentuh.

## Cara upload ke GitHub Pages
1. Extract ZIP.
2. Buka repository `INVENTORYFROZEN`.
3. Upload/replace `index.html`, `app.js`, `style.css`.
4. Commit changes.
5. Buka GitHub Pages dan tunggu deployment.
6. Buka alamat Pages dan login.

## Catatan
- Situs harus HTTPS untuk scan barcode kamera; GitHub Pages sudah HTTPS.
- Firebase Authentication Authorized Domains harus memuat `adminproduksilbs.github.io`.
- Firestore Rules harus memakai rules role-based yang sudah dipasang.
- Operator dapat membaca produk/inventory dan melakukan transaksi/opname, tetapi tidak dapat mengelola produk/kategori/user.
