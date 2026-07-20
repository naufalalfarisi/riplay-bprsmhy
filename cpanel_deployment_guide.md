# Panduan Deployment & Hosting RIPLAY BPRS MHY di cPanel

Dokumen ini berisi panduan penting mengenai konfigurasi domain/subdomain, cara pemindahan file project, serta langkah konfigurasi Node.js pada hosting cPanel untuk aplikasi **RIPLAY BPRS MHY**.

---

## 1. Konfigurasi Direktori Domain & Subdomain (Document Root)

Struktur pemetaan folder di cPanel Anda dirancang secara independen dan **aman (tidak saling menimpa)**:

| Domain / Subdomain | Document Root (Folder) | Fungsi / Keterangan |
| :--- | :--- | :--- |
| `bprsmh-yogyakarta.co.id` | `/public_html` | Domain utama |
| `bprsmh-yogyakarta.com` | `/public_html/reborn` | Website Reborn |
| `reborn.bprsmh-yogyakarta.co.id` | `/public_html/reborn` | Alias/Subdomain Reborn |
| `riplay.bprsmh-yogyakarta.com` | `/public_html/riplay` | Aplikasi RIPLAY |

> [!NOTE]
> Folder `reborn` dan `riplay` berada di dalam `/public_html`. Hal ini aman dan tidak akan saling menghapus file satu sama lain karena masing-masing website membaca folder tujuannya sendiri.

---

## 2. Cara Memindahkan File Project ke cPanel

Guna menghindari pemindahan ribuan file pustaka yang sangat berat (`node_modules`), gunakan metode ZIP berikut:

### Langkah A: Membuat File ZIP Lokal
1. Buka folder project lokal Anda (`d:\Antigravity-ide`).
2. Pilih file dan folder utama di bawah ini (**Kecualikan folder `node_modules`**):
   - Folder `public/`
   - Folder `data/`
   - File `server.js`
   - File `package.json`
   - File `package-lock.json`
3. Klik kanan pada item yang dipilih, lalu kompres menjadi file ZIP (misal: `riplay-project.zip`).

### Langkah B: Unggah dan Ekstrak di cPanel
1. Buka **File Manager** cPanel.
2. Masuk ke folder `/public_html/riplay`.
3. Klik **Upload** di bagian atas menu, lalu pilih file `riplay-project.zip` dari komputer Anda.
4. Setelah proses upload 100% selesai, kembali ke File Manager, klik kanan pada `riplay-project.zip` dan pilih **Extract** ke direktori `/public_html/riplay`.
5. Hapus file ZIP tersebut setelah diekstrak untuk menghemat kuota hosting.

---

## 3. Konfigurasi Aplikasi Node.js di cPanel

Karena aplikasi RIPLAY memiliki backend Node.js (Express) untuk memproses database (`db.json`) dan pengelolaan konten, Anda harus mendaftarkannya pada sistem runtime cPanel:

1. Buka menu **Setup Node.js App** di halaman utama cPanel.
2. Klik tombol **Create Application** dan isi kolom konfigurasi berikut:
   - **Node.js Version:** Pilih versi Node.js yang direkomendasikan (misal: v18 atau v20).
   - **Application Mode:** Pilih `Production`.
   - **Application Root:** Tulis **`public_html/riplay`** *(tanpa tanda garis miring `/` di awal)*.
   - **Application URL:** Pilih subdomain **`riplay.bprsmh-yogyakarta.com`**.
   - **Application Startup File:** Tulis **`server.js`**.
3. Klik **Create** untuk menyimpan konfigurasi.
4. Setelah berhasil dibuat, klik tombol **Run NPM Install** pada panel konfigurasi tersebut untuk menginstal semua dependensi otomatis dari file `package.json`.

---

## 4. Penanganan Error Saat Instalasi Modul (Troubleshooting)

### Masalah: Peringatan "package.json file is required"
* **Penyebab:** cPanel tidak dapat menemukan file `package.json` di jalur direktori yang Anda tentukan di kolom *Application Root*.
* **Solusi:** Pastikan file `package.json` sudah berada langsung di dalam folder `/public_html/riplay` melalui File Manager cPanel, dan pastikan penulisan kolom *Application Root* di cPanel adalah `public_html/riplay` (tidak menggunakan `/` di paling depan).

### Masalah: Peringatan "check availability of application has failed" / Content-Type Mismatch
* **Penyebab:** Ini adalah *false alarm* (peringatan palsu) yang biasa terjadi di cPanel. Saat aplikasi Node.js pertama kali aktif setelah `npm install`, cPanel mengirimkan tes request ke web Anda dan mengharapkan respon halaman kosong (*text/plain*). Karena aplikasi RIPLAY langsung merespon dengan halaman HTML penuh (`text/html`), sistem cPanel menganggap ada ketidaksesuaian respon dan memunculkan error tersebut.
* **Solusi:**
  1. Abaikan peringatan tersebut dan coba langsung akses subdomain Anda di browser (`http://riplay.bprsmh-yogyakarta.com`).
  2. Jika halaman terbuka dengan normal, maka aplikasi telah berhasil berjalan 100%.
  3. Jika aplikasi belum terbuka atau menampilkan halaman error dari Passenger, masuk kembali ke **Setup Node.js App** di cPanel dan klik tombol **Restart** di bagian atas konfigurasi.
