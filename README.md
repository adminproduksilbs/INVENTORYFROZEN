# LBS Inventory v9 - Operator PIN Login

Update dari versi aplikasi terakhir dengan login Operator menggunakan PIN 6 digit.

- Admin: Email + Password
- Operator: PIN 6 digit
- PIN Operator digunakan sebagai password Firebase Authentication untuk akun `operator@lampungbayseafood.com`.
- Tidak mengubah database Firestore.

PENTING: Sebelum memakai login PIN, password akun Authentication Operator harus diatur menjadi PIN 6 digit yang diinginkan di Firebase Console. Jangan menyimpan PIN di Firestore.
