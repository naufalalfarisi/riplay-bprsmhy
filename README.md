# RIPLAY (Ringkasan Informasi Produk dan Layanan) - BPRS Mitra Harmoni Yogyakarta

RIPLAY adalah aplikasi portal informasi interaktif berbasis web (Kiosk) yang dirancang khusus untuk menampilkan informasi produk keuangan secara transparan, cepat, dan sesuai dengan prinsip syariah di **BPRS Mitra Harmoni Yogyakarta (MHY)**.

Aplikasi ini dilengkapi dengan **Panel Admin** dinamis yang memungkinkan pengelola bank untuk mengubah warna tema, logo, tagline hero, data produk keuangan, dan brosur/file PDF secara real-time tanpa perlu mengubah kode program.

---

## 🚀 Fitur Utama

### 1. Portal Publik (Kiosk / Halaman Utama)
*   **Tema Warna Dinamis**: Warna utama (*primary* & *secondary*) serta background gradien di halaman depan akan otomatis menyesuaikan dengan warna tema yang dipilih oleh administrator di dashboard admin.
*   **Katalog Produk Interaktif**: Daftar produk (Tabungan, Deposito, Pembiayaan) disajikan dalam tab kategori dengan filter pencarian instan.
*   **Modal RIPLAY Terstruktur**: Detail lengkap produk syariah (akad, fitur, manfaat, risiko, biaya, persyaratan) ditampilkan melalui modal modern dan premium dengan opsi unduh PDF/Gambar brosur.
*   **Kalkulator Simulasi Finansial**:
    *   *Simulasi Deposito*: Perhitungan bagi hasil (nisbah) mudharabah.
    *   *Simulasi Pembiayaan*: Perhitungan angsuran bulanan menggunakan metode anuitas/flat syariah.
*   **Aesthetic & Modern UI**: Efek transparan (glassmorphism), jam & kalender digital real-time, blob background animasi mengambang, serta pendaran cahaya modern di footer.

### 2. Panel Administrasi (`/admin.html`)
*   **Keamanan Login**: Autentikasi aman menggunakan kombinasi nama pengguna (Username) dan kode sandi (Passcode).
*   **Pengaturan Profil Bank & Tema**:
    *   Ubah Nama Bank & Nama Logo.
    *   Ubah Kontak (No. Telepon, WhatsApp, Email, Alamat, Sosial Media).
    *   Ubah Tagline Subjudul Hero Utama.
    *   Pilih Warna Tema Utama (dilengkapi color picker visual).
*   **Manajemen Produk (CRUD)**:
    *   Menambah, mengubah, dan menghapus produk perbankan.
    *   Mengunggah file brosur PDF atau gambar brosur (sistem upload didukung file filter aman).
*   **Sistem Toast Premium**: Notifikasi status melayang yang responsif (success, error, warning, info) menggantikan alert browser bawaan yang kaku.
*   **Keamanan Ekstra**:
    *   *Proteksi XSS*: Semua input teks disanitasi secara ketat sebelum dirender menggunakan fungsi pembantu `escapeHTML`.
    *   *Anti-Caching Auth*: Header Cache-Control dan parameter cache-buster dipasang di API otentikasi agar sesi login/logout sinkron seketika.

---

## 🛠️ Tech Stack (Teknologi)

*   **Frontend**: HTML5, Vanilla CSS3 (Custom Variables), Bootstrap 5, FontAwesome 6, Vanilla JavaScript (ES6+).
*   **Backend**: Node.js, Express.js.
*   **Database**: File JSON lokal (`data/db.json`).
*   **File Uploads**: Multer (untuk penyimpanan brosur fisik di `/data/uploads/`).

---

## 💻 Cara Menjalankan Proyek Secara Lokal

### Prasyarat
Pastikan komputer Anda sudah terinstal **Node.js** (rekomendasi versi 16 ke atas).

### Langkah-langkah
1.  **Clone / Ekstrak** folder proyek ke komputer Anda.
2.  Buka terminal/command prompt di direktori proyek tersebut.
3.  Instal seluruh dependensi yang diperlukan:
    ```bash
    npm install
    ```
4.  Jalankan server aplikasi:
    ```bash
    npm run dev
    ```
    atau
    ```bash
    npm start
    ```
5.  Buka browser Anda dan akses:
    *   Halaman Utama Kiosk: `http://localhost:3000`
    *   Halaman Panel Admin: `http://localhost:3000/admin.html`

---

## 🔐 Kredensial Default Panel Admin
*   **Username**: `superadmin`
*   **Passcode (Kode Sandi)**: `admin123`
*(Kredensial ini dapat diubah secara langsung di Panel Admin bagian tab Pengaturan).*

---

## 📂 Struktur Folder Proyek
```
riplay-bprs/
├── data/                  # Folder Database & Uploads
│   ├── uploads/           # File fisik gambar/PDF brosur yang diunggah
│   └── db.json            # Database JSON (konfigurasi & produk)
├── node_modules/          # Library dependencies Node.js
├── public/                # File statis frontend (HTML, CSS, JS, Images)
│   ├── css/
│   │   ├── admin.css      # Styling khusus panel admin
│   │   └── style.css      # Styling premium halaman utama
│   ├── js/
│   │   ├── admin.js       # Logika interaktif admin dashboard
│   │   └── app.js         # Logika interaktif portal utama
│   ├── images/            # Logo default dan aset gambar
│   └── admin.html         # Halaman admin dashboard
├── .gitignore             # Berkas Git untuk mengecualikan file sampah
├── package.json           # File konfigurasi dependensi npm
├── README.md              # Dokumentasi proyek (file ini)
└── server.js              # Server backend Express utama
```
