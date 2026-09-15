# LBS Inventory FINAL v13 — PIN Operator Aman

Versi ini mempertahankan dashboard modern dan seluruh modul versi sebelumnya.

## Login
- Admin: email + password Firebase.
- Operator: cukup masukkan PIN **0112**.
- PIN tidak disimpan di Firestore dan tidak ditulis di `app.js`.
- Backend Cloud Function memverifikasi PIN dan menerbitkan Firebase Custom Token untuk UID Operator `OD1D85j502azoQzGuuBf7Hb5Bwp1`.

## Deploy sekali untuk PIN Operator
Diperlukan Firebase CLI dan project `lbs-peminjaman`.

1. Instal Firebase CLI jika belum ada.
2. Dari folder hasil ZIP ini jalankan `firebase login`.
3. Jalankan `firebase use lbs-peminjaman`.
4. Set secret PIN:
   `firebase functions:secrets:set OPERATOR_PIN`
   lalu masukkan `0112` saat diminta.
5. Deploy function:
   `firebase deploy --only functions:operatorPinLogin`
6. Upload `index.html`, `app.js`, `style.css`, dan `logo-lbs.png` ke GitHub Pages seperti biasa.

> Cloud Functions umumnya memerlukan billing/Blaze plan pada Firebase. Tidak perlu membuat project baru dan tidak perlu menghapus database.

## Catatan keamanan
PIN hanya berada di Secret Manager melalui Cloud Functions. Client browser tidak menerima nilai PIN atau password internal Firebase. Firestore Rules tetap memakai UID Operator yang sudah ada.


## FINAL v15 - Login Operator tanpa Cloud Functions
- Operator cukup memasukkan PIN: `0112`
- Aplikasi menggunakan akun Firebase Authentication `operator@lbs.com` di belakang layar.
- Password Authentication Operator: `011222`
- Tidak memerlukan Cloud Functions atau paket Blaze.
- Pastikan akun Authentication `operator@lbs.com` memiliki password `011222`.
- Dokumen Firestore `users/OD1D85j502azoQzGuuBf7Hb5Bwp1` harus memiliki role `operator` dan aktif `true`.
