# LBS Inventory v8
Offline Mode + Sinkronisasi Otomatis.

- Firestore persistent local cache.
- Status Online/Offline.
- Produksi tetap dapat dicatat saat offline dan masuk antrean lokal.
- Saat internet kembali, antrean Produksi disinkronkan otomatis.
- Opname menggunakan cache Firestore sehingga perubahan yang dibuat saat offline akan menunggu sinkronisasi Firebase.
