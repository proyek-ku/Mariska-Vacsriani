# Panduan Instalasi Website Profil Dosen
### Dari Nol Sampai Online — Untuk Pengguna Awam

---

## Gambaran Singkat

Website ini terdiri dari dua bagian yang bekerja sama:

```
[Pengunjung/Admin]
       |
       v
[Frontend — GitHub Pages]          <-- file index.html, admin.html, css/, js/
       |  (kirim permintaan API)
       v
[Backend — Google Apps Script]     <-- file backend-gas/Code.gs
       |  (baca/tulis data)
       v
[Google Sheets]  +  [Google Drive]
  (database)         (penyimpanan foto & dokumen)
```

**Yang Anda butuhkan sebelum mulai:**
- Akun Google (Gmail) — untuk Google Apps Script, Google Sheets, dan Google Drive.
- Akun GitHub (gratis) — untuk hosting halaman web via GitHub Pages.
- File-file proyek ini sudah ada di komputer Anda.

Estimasi waktu pengerjaan pertama kali: sekitar 30–45 menit.

---

## Persiapan

Pastikan hal-hal berikut sudah siap:

1. Anda sudah login di browser dengan akun Google Anda.
2. Anda sudah login di browser dengan akun GitHub Anda (daftar gratis di github.com jika belum punya).
3. Anda punya akses ke folder proyek ini di komputer Anda, berisi:
   - `index.html` — halaman publik mandiri (berisi CSS dan JS-nya sendiri, tidak bergantung pada file luar)
   - `admin.html` — panel admin
   - folder `css/` (berisi `styles.css` — dipakai oleh panel admin)
   - folder `js/` (berisi `config.js` dan `admin.js` — dipakai oleh panel admin; `public.js` tidak lagi dipakai oleh `index.html`)
   - folder `backend-gas/` (berisi `Code.gs` dan `appsscript.json`)
4. Editor teks tersedia (Notepad, VS Code, atau editor lain) untuk mengedit file.

---

## Bagian A — Pasang Backend (Google Apps Script)

> **Cara yang dianjurkan: container-bound (skrip menempel ke Sheet Anda).**
> Dengan cara ini, `setup()` akan otomatis memakai Google Sheet yang Anda buka —
> tidak akan membuat spreadsheet baru.
> Jika Anda membuat skrip secara mandiri di script.google.com (standalone),
> `setup()` akan membuat spreadsheet baru sendiri karena tidak ada Sheet yang menempel.

### A1. Buka atau Buat Google Sheet, Lalu Masuk ke Apps Script

1. Buka [Google Drive](https://drive.google.com) Anda.
2. **Buat Google Sheet baru** (klik "+ Baru" → "Google Spreadsheet") atau buka Sheet yang sudah Anda siapkan sebagai database. Beri nama Sheet tersebut, misalnya: **Database Profil Dosen**.
3. Di dalam Google Sheet tersebut, klik menu **Extensions** (Ekstensi) → **Apps Script**.
4. Editor Apps Script terbuka di tab baru. Skrip ini sekarang **menempel** (container-bound) pada Sheet tadi.
5. Klik nama proyek di bagian atas editor (biasanya "Untitled project"), ganti dengan nama yang mudah diingat, misalnya: **Backend Profil Dosen**, lalu klik **OK**.

### A2. Masukkan Kode Backend

1. Di editor GAS, Anda akan melihat isi file `Code.gs` yang berisi kode bawaan (`function myFunction() {}`). **Hapus semua** teks yang ada di sana.
2. Buka file `backend-gas/Code.gs` dari folder proyek di komputer Anda menggunakan editor teks.
3. Pilih semua teks (`Ctrl+A`), salin (`Ctrl+C`).
4. Kembali ke editor GAS di browser, klik di area kode, lalu tempel (`Ctrl+V`).
5. Klik ikon **Save** (disket) atau tekan `Ctrl+S`. Pastikan tidak ada pesan error merah.

### A3. Tampilkan dan Isi `appsscript.json`

File `appsscript.json` berisi pengaturan penting (izin OAuth dan konfigurasi Web App).

1. Di editor GAS, klik ikon **roda gigi (Project Settings)** di sidebar kiri.
2. Cari opsi **"Show appsscript.json manifest file in editor"**, centang kotak tersebut.
3. Klik ikon **editor (< >)** di sidebar kiri untuk kembali ke editor kode.
4. Di daftar file (sidebar kiri), sekarang akan muncul file `appsscript.json`. Klik file tersebut.
5. **Hapus semua** isi yang ada, lalu salin dan tempel seluruh isi file `backend-gas/appsscript.json` dari folder proyek di komputer Anda. Isi yang benar adalah:

```json
{
  "timeZone": "Asia/Jakarta",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE_ANONYMOUS"
  },
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/script.external_request"
  ]
}
```

6. Simpan (`Ctrl+S`).

### A4. Jalankan Fungsi Inisialisasi (`setup`)

Fungsi `setup` akan memakai Sheet tempat skrip menempel sebagai database, membuat folder di Google Drive untuk menyimpan foto dan dokumen, serta membuat akun admin awal.

**Langkah:**

1. Klik tab file `Code.gs` di sidebar editor.
2. Di bagian atas editor, ada **dropdown** yang biasanya bertuliskan nama fungsi. Klik dropdown tersebut dan pilih **`setup`** dari daftar.
3. Klik tombol **Run** (ikon segitiga / play).
4. Akan muncul dialog **"Authorization required"** (Otorisasi diperlukan). Klik **"Review permissions"** (Periksa izin).
5. Pilih akun Google Anda dari daftar.
6. Muncul layar peringatan **"Google hasn't verified this app"**. Ini normal untuk project pribadi. Klik **"Advanced"** (di pojok kiri bawah layar tersebut), lalu klik **"Go to Backend Profil Dosen (unsafe)"** (atau nama project Anda).
7. Tinjau izin yang diminta (Google Sheets dan Google Drive), lalu klik **"Allow"** (Izinkan).
8. Tunggu beberapa detik hingga proses selesai.

**Periksa hasil di Execution Log:**

1. Klik menu **View** di bagian atas → **Logs** (atau tekan `Ctrl+Enter`), atau klik panel **"Execution log"** yang muncul di bawah editor.
2. Pastikan log menampilkan pesan yang mengandung:
   - `=== Setup selesai ===`
   - Konfirmasi bahwa skrip memakai spreadsheet aktif (container-bound) dengan URL-nya
   - ID Folder Drive
   - **Peringatan wajib ganti password** — baca baik-baik

Jika ada pesan error merah, pastikan Anda sudah memberikan izin OAuth dengan benar di langkah sebelumnya. Coba jalankan `setup` sekali lagi — fungsi ini aman dijalankan ulang (tidak akan menggandakan data, tidak akan menghapus data yang sudah ada).

### Jika Sebelumnya Sudah Terlanjur Terbuat Sheet Baru

Jika pada percobaan sebelumnya `setup()` sudah membuat spreadsheet baru bernama **"Database Profil Dosen"** (karena dijalankan secara standalone), lakukan langkah berikut untuk beralih ke Sheet Anda sendiri:

1. Pastikan skrip Apps Script Anda sudah dibuka melalui **Extensions → Apps Script** dari dalam Google Sheet yang Anda inginkan (bukan dari script.google.com langsung). Jika belum, tutup editor GAS yang ada, buka Sheet yang diinginkan, lalu masuk lewat Extensions → Apps Script.
2. Jalankan `setup()` kembali dari editor tersebut. Karena skrip kini menempel pada Sheet Anda, `setup()` akan otomatis menunjuk ke Sheet itu dan memperbarui pengaturan internal.
3. Setelah `setup()` selesai dan log menampilkan URL Sheet Anda (bukan sheet lama), spreadsheet "Database Profil Dosen" yang terlanjur dibuat sebelumnya sudah tidak dipakai lagi. Anda boleh menghapusnya secara manual dari Google Drive jika tidak dibutuhkan.

### A5. Deploy sebagai Web App

Ini adalah langkah untuk "menerbitkan" backend Anda agar bisa diakses oleh halaman web.

1. Di editor GAS, klik tombol **"Deploy"** di pojok kanan atas.
2. Pilih **"New deployment"** (Deployment baru).
3. Klik ikon **roda gigi** di sebelah tulisan "Select type", lalu pilih **"Web app"**.
4. Isi formulir yang muncul:
   - **Description** (Deskripsi): isi dengan `v1` atau keterangan bebas.
   - **Execute as** (Jalankan sebagai): pilih **"Me"** (akun Google Anda). Ini sesuai dengan nilai `USER_DEPLOYING` di `appsscript.json`.
   - **Who has access** (Siapa yang bisa mengakses): pilih **"Anyone"** atau **"Anyone, even anonymous"**. Ini sesuai dengan nilai `ANYONE_ANONYMOUS` di `appsscript.json`. Pilihan ini wajib agar halaman web bisa memanggil backend tanpa login Google.
5. Klik **"Deploy"**.
6. Jika muncul permintaan izin OAuth lagi, ikuti langkah yang sama seperti di A4 (Advanced → Go to...).
7. Setelah berhasil, akan muncul dialog dengan **Web app URL**. URL ini berbentuk:
   ```
   https://script.google.com/macros/s/AKfy.../exec
   ```
8. **Salin URL ini** dan simpan di tempat yang mudah Anda temukan. Anda akan membutuhkannya di langkah berikutnya.

---

## Bagian B — Hubungkan Frontend ke Backend

URL Web App GAS harus diisi di **dua tempat** yang berbeda menggunakan URL yang **sama persis**:

### B1. Isi URL di `index.html` (untuk halaman publik)

`index.html` adalah file mandiri yang memuat CSS dan JS-nya sendiri secara inline. Konstanta `API_URL` ada di dalam blok `<script>` di bagian atas file tersebut.

1. Di komputer Anda, buka file `index.html` menggunakan editor teks.
2. Cari baris berikut di bagian atas blok `<script>`:
   ```js
   const API_URL = 'GANTI_DENGAN_URL_WEB_APP_GAS';
   ```
3. Ganti teks `GANTI_DENGAN_URL_WEB_APP_GAS` dengan URL Web App yang Anda salin di langkah A5. Contoh hasil akhirnya:
   ```js
   const API_URL = 'https://script.google.com/macros/s/AKfy.../exec';
   ```
4. Simpan file `index.html`.

### B2. Isi URL di `js/config.js` (untuk panel admin)

File `js/config.js` dipakai oleh panel admin (`admin.html` dan `js/admin.js`). Isi URL yang sama seperti di B1.

1. Di komputer Anda, buka file `js/config.js` menggunakan editor teks.
2. Anda akan melihat baris berikut:
   ```js
   const API_URL = 'GANTI_DENGAN_URL_WEB_APP_GAS';
   ```
3. Ganti teks `GANTI_DENGAN_URL_WEB_APP_GAS` dengan URL Web App yang sama (URL identik dengan yang diisi di `index.html`). Contoh hasil akhirnya:
   ```js
   const API_URL = 'https://script.google.com/macros/s/AKfy.../exec';
   ```
4. Simpan file `config.js`.

**Catatan penting:**
- Kedua nilai `API_URL` (di `index.html` dan di `js/config.js`) harus berisi URL yang **sama persis**.
- Jika salah satu masih berisi `GANTI_DENGAN_URL_WEB_APP_GAS`, bagian yang belum diisi tidak akan bisa mengambil data apapun.
- File `js/public.js` **tidak lagi dipakai** oleh `index.html`. File tersebut boleh diabaikan atau dihapus — keberadaan maupun ketiadaannya tidak memengaruhi fungsi apapun.

---

## Bagian C — Online-kan via GitHub Pages

### C1. Buat Repository GitHub

1. Buka **https://github.com** dan login.
2. Klik tombol **"+"** di pojok kanan atas → pilih **"New repository"**.
3. Isi nama repository, misalnya: `profil-dosen`.
4. Biarkan pengaturan lainnya pada nilai default (Public, tanpa README).
5. Klik **"Create repository"**.
6. Catat URL repository Anda, misalnya: `https://github.com/USERNAME/profil-dosen`

### C2. Upload File Proyek ke GitHub

Cara paling mudah untuk pengguna awam adalah upload langsung lewat browser:

1. Di halaman repository yang baru dibuat, klik **"uploading an existing file"** atau tombol **"Add file"** → **"Upload files"**.
2. Upload file dan folder berikut (pertahankan struktur folder yang sama):
   - `index.html`
   - `admin.html`
   - folder `css/` (beserta isi `styles.css`)
   - folder `js/` (beserta isi `config.js`, `public.js`, `admin.js`)
   - folder `backend-gas/` (boleh disertakan untuk arsip kode, tapi GitHub Pages tidak akan "menjalankan" folder ini — folder ini hanya tersimpan sebagai referensi)

   **Cara upload folder:** Anda bisa drag-and-drop seluruh folder sekaligus ke area upload di GitHub.

3. Di bagian bawah halaman upload, isi pesan commit singkat, misalnya: `Inisialisasi website profil dosen`.
4. Klik **"Commit changes"**.

Alternatif menggunakan Git (jika familiar):
```bash
git init
git add .
git commit -m "Inisialisasi website profil dosen"
git remote add origin https://github.com/USERNAME/profil-dosen.git
git push -u origin main
```

### C3. Aktifkan GitHub Pages

1. Di halaman repository GitHub Anda, klik tab **"Settings"** (Pengaturan).
2. Di sidebar kiri, klik **"Pages"**.
3. Di bagian **"Source"**, atur:
   - **Branch:** `main`
   - **Folder:** `/ (root)`
4. Klik **"Save"**.
5. Tunggu 1–3 menit. Refresh halaman Pages tersebut. Akan muncul URL website Anda, misalnya:
   ```
   https://USERNAME.github.io/profil-dosen/
   ```
6. Salin URL ini — ini adalah alamat website publik Anda.

---

## Bagian D — Login dan Isi Data

### D1. Akses Panel Admin

Panel admin berada di halaman `admin.html`. Cara mengaksesnya: tambahkan `admin.html` di akhir URL GitHub Pages Anda:

```
https://USERNAME.github.io/profil-dosen/admin.html
```

Buka URL tersebut di browser.

### D2. Login Pertama Kali

Gunakan kredensial awal berikut (nilai ini diverifikasi langsung dari kode `setup()` di `Code.gs`):

- **Username:** `admin`
- **Password:** `ubah-saya-segera`

### D3. Wajib: Ganti Password Segera

Setelah login berhasil, **langsung ganti password** sebelum melakukan hal lain:

1. Di panel admin, cari tab atau menu **"Akun"**.
2. Form di tab ini memiliki **tiga field** yang harus diisi:
   - **Username Baru** — boleh tetap `admin` atau ganti dengan nama lain.
   - **Password Baru** — isi dengan password yang kuat (minimal 8 karakter).
   - **Konfirmasi Password Baru** — ketik ulang password baru yang sama persis untuk memastikan tidak ada salah ketik.
3. Klik simpan.
4. Anda akan diminta login ulang — masuk dengan kredensial baru Anda.

**Jangan lewati langkah ini.** Password `ubah-saya-segera` mudah ditebak dan dapat membahayakan data Anda.

### D4. Isi Konten Profil

Setelah login, Anda bisa mulai mengisi:

- **Profil** — nama lengkap, gelar, jabatan, institusi, bio, email, foto profil, dan link media sosial (Facebook, Instagram, TikTok, LinkedIn, YouTube, Google Scholar, Garuda).
- **Penelitian** — judul, tahun, dan link publikasi.
- **Pengabdian** — judul, tahun, dan link kegiatan.
- **Galeri** — foto kegiatan beserta judul dan keterangan.
- **Dokumen** — file PDF (CV, sertifikat, dll.) beserta judul dan jenis dokumen.

Untuk upload foto dan dokumen, gunakan tombol upload yang tersedia di masing-masing bagian. Batas ukuran file: **25 MB per file**. Format yang diterima:
- Foto/Galeri: JPEG, PNG, WebP
- Dokumen: PDF

---

## Uji Coba dan Verifikasi

Setelah semua langkah selesai, periksa hal-hal berikut:

- [ ] Buka URL GitHub Pages (`index.html`) — halaman publik muncul tanpa error.
- [ ] Data profil yang sudah diisi tampil di halaman publik.
- [ ] Foto profil muncul (bukan ikon kosong).
- [ ] Link media sosial yang diisi muncul sebagai tombol/ikon; yang tidak diisi tidak muncul.
- [ ] Halaman penelitian dan pengabdian menampilkan data yang sudah dimasukkan.
- [ ] Galeri menampilkan foto.
- [ ] Dokumen dapat diklik dan dibuka.
- [ ] Buka `admin.html` — form login muncul.
- [ ] Login dengan kredensial baru (setelah ganti password) berhasil.
- [ ] Logout bekerja dengan baik.
- [ ] Buka DevTools browser (`F12`) → tab Console — tidak ada error merah saat halaman dimuat.

---

## Pemecahan Masalah (Troubleshooting)

### Data tidak muncul / halaman publik kosong

**Gejala:** Halaman terbuka tapi tidak ada data profil, penelitian, dll. Mungkin ada pesan error di Console.

**Kemungkinan penyebab dan solusi:**

1. **`API_URL` belum diisi atau salah** — Ada dua tempat yang harus diperiksa:
   - `index.html`: cari konstanta `API_URL` di bagian atas blok `<script>` — pastikan sudah diisi URL Web App GAS, bukan masih `GANTI_DENGAN_URL_WEB_APP_GAS`.
   - `js/config.js`: pastikan nilai `API_URL` di file ini juga sudah diisi dengan URL yang sama.
   Setelah diubah, commit dan push ulang ke GitHub.

2. **Deployment GAS belum aktif atau salah konfigurasi** — Kembali ke editor GAS, pastikan deployment memiliki akses **"Anyone"** atau **"Anyone, even anonymous"**. Jika ragu, buat deployment baru dan perbarui URL di `config.js`.

3. **Anda membuka file secara lokal (bukan dari URL GitHub Pages)** — GAS tidak mengizinkan permintaan dari `file://`. Website ini **wajib diakses dari URL GitHub Pages** (`https://...github.io/...`). Tidak bisa diuji dengan cara membuka file HTML langsung dari folder komputer.

### Error CORS di Console browser

**Gejala:** Di Console DevTools, ada pesan error berisi kata "CORS" atau "blocked by CORS policy".

**Solusi:**
- Pastikan deployment GAS menggunakan akses **"Anyone (even anonymous)"** — bukan "Only myself" atau "Anyone with Google Account".
- Pastikan Anda mengakses website dari URL GitHub Pages, bukan dari localhost atau file lokal.
- Periksa apakah URL di `API_URL` sudah benar dan tidak ada typo.

Perlu dipastikan saat ini juga: pola CORS yang digunakan (POST + `Content-Type: text/plain`) sudah ditulis di kode frontend, namun wajib diuji langsung dari URL GitHub Pages asli karena GAS tidak mendukung uji coba dari localhost.

### Foto atau gambar dari Drive tidak muncul

**Gejala:** Foto profil atau gambar galeri tidak tampil; muncul ikon gambar rusak.

**Kemungkinan penyebab dan solusi:**

1. **File Drive belum ter-share publik** — Setiap file yang diunggah lewat panel admin seharusnya otomatis di-share "Anyone with the link can view" oleh kode backend. Perlu dipastikan saat ini juga: buka Google Drive Anda → folder **"Media Profil Dosen"** → klik kanan file foto → "Share" → pastikan ada opsi "Anyone with the link". Jika belum, atur secara manual.

2. **URL thumbnail Drive berubah perilakunya** — Cara menampilkan gambar Drive di halaman web bisa berubah karena kebijakan Google. Ini adalah titik rawan yang wajib diuji manual: buka URL thumbnail foto di tab incognito/private browser untuk memastikan gambar bisa diakses tanpa login.

### Perubahan di `Code.gs` tidak terlihat setelah deploy

**Gejala:** Sudah mengedit kode di editor GAS, tapi perilaku API tidak berubah.

**Penjelasan:** Setiap deployment GAS membekukan versi kode pada saat deploy. Jika Anda mengedit `Code.gs` setelah deploy, Anda **harus membuat deployment baru**, bukan mengedit deployment yang lama.

**Cara benar:**
1. Di editor GAS, klik **"Deploy"** → **"New deployment"** (bukan "Manage deployments").
2. Isi deskripsi baru (mis. `v2`), atur Execute as dan Who has access seperti sebelumnya.
3. Klik **Deploy**.
4. Salin URL baru yang muncul.
5. Buka `index.html` di komputer, ganti nilai `API_URL` di bagian atas blok `<script>` dengan URL baru.
6. Buka `js/config.js` di komputer, ganti nilai `API_URL` di file ini dengan URL yang sama persis.
7. Commit dan push ulang ke GitHub.

### Fungsi `setup` gagal saat dijalankan

**Gejala:** Execution log menampilkan error merah.

**Solusi:**
- Pastikan Anda sudah memberi izin OAuth dengan benar (klik Allow, bukan Cancel).
- Pastikan isi `appsscript.json` sudah benar (salin ulang dari file `backend-gas/appsscript.json`).
- Coba jalankan `setup` sekali lagi — fungsi ini aman dijalankan berulang kali dan tidak akan menggandakan data.

### Akun admin terkunci (terlalu banyak percobaan login gagal)

**Gejala:** Muncul pesan "Akun terkunci sementara".

**Solusi:** Tunggu beberapa menit (kunci otomatis lepas setelah sekitar 5 menit), lalu coba login kembali dengan kredensial yang benar.

---

## Catatan Keamanan

1. **Ganti password `ubah-saya-segera` segera** setelah login pertama. Password ini adalah nilai default yang diketahui publik.

2. **Password minimal 8 karakter.** Gunakan kombinasi huruf, angka, dan simbol.

3. **URL Web App GAS (nilai `API_URL`) boleh ada di file publik** — URL ini tidak mengandung rahasia. Yang dilindungi adalah username dan password admin, yang disimpan sebagai hash terenkripsi di Google Sheets (bukan plaintext).

4. **Jangan pernah menaruh password atau kunci rahasia** di file `js/config.js` atau file frontend lainnya, karena semua file di GitHub Pages bersifat publik dan bisa dilihat siapa saja.

5. **Akses panel admin (`admin.html`) tidak perlu dilindungi di level URL** karena sudah ada sistem login. Namun, jika Anda ingin ekstra aman, cukup hapus atau ganti nama file `admin.html` saat tidak digunakan (dengan catatan Anda perlu mengingat nama barunya).

---

## Ringkasan Nilai yang Terverifikasi dari Kode

Nilai-nilai di bawah ini diverifikasi langsung dari file kode, bukan asumsi:

| Item | Nilai |
|------|-------|
| Nama fungsi inisialisasi | `setup()` (di `Code.gs`) |
| Username admin awal | `admin` |
| Password admin awal | `ubah-saya-segera` |
| Nama konstanta URL (di dua tempat) | `API_URL` |
| Lokasi 1 konstanta URL | `index.html` — di bagian atas blok `<script>` (halaman publik mandiri) |
| Lokasi 2 konstanta URL | `js/config.js` — untuk panel admin (`admin.html` + `js/admin.js`) |
| Placeholder URL (sama di dua tempat) | `GANTI_DENGAN_URL_WEB_APP_GAS` |
| Status `js/public.js` | Tidak lagi dipakai oleh `index.html`; boleh diabaikan atau dihapus |
| `executeAs` di `appsscript.json` | `USER_DEPLOYING` (setara "Me" di UI) |
| `access` di `appsscript.json` | `ANYONE_ANONYMOUS` (setara "Anyone" di UI) |
| Perilaku `setup()` bila container-bound | Memakai Sheet tempat skrip menempel (tidak membuat baru) |
| Perilaku `setup()` bila standalone | Membuat Spreadsheet baru bernama `Database Profil Dosen` |
| Nama folder Drive root | `Media Profil Dosen` |
| Subfolder Drive | `Foto`, `Galeri`, `Dokumen` |
| Sheet yang dibuat | `Profil`, `Penelitian`, `Pengabdian`, `Galeri`, `Dokumen`, `Admin` |
| Batas ukuran upload | 25 MB per file |
