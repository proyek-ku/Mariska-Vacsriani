# Profil Dosen — Panduan Setup & Deploy

Website profil satu dosen dengan frontend statis (GitHub Pages) dan backend Google Apps Script (GAS) yang menggunakan Google Sheets sebagai database dan Google Drive sebagai penyimpanan media.

---

## Struktur Proyek

```
/
├── index.html              # Halaman publik profil dosen — mandiri (CSS + JS inline, tidak butuh file luar)
├── admin.html              # Panel admin (login + CRUD)
├── css/styles.css          # Stylesheet untuk panel admin
├── js/config.js            # URL API GAS untuk panel admin (WAJIB diisi setelah deploy)
├── js/public.js            # Tidak lagi dipakai oleh index.html — boleh diabaikan atau dihapus
├── js/admin.js             # Logika panel admin
├── backend-gas/
│   ├── Code.gs             # Seluruh backend GAS (API, CRUD, auth, upload)
│   └── appsscript.json     # Manifest GAS
└── README.md               # File ini
```

---

## Langkah 1: Siapkan Project Google Apps Script

Ada dua cara: manual di browser atau lewat clasp (CLI).

### Cara A: Manual (lebih mudah untuk pertama kali)

> **Cara yang dianjurkan:** buka Google Sheet Anda terlebih dahulu, lalu masuk ke Apps Script
> lewat menu **Extensions → Apps Script**. Dengan cara ini skrip menempel (container-bound) pada
> Sheet tersebut, dan `setup()` akan memakai Sheet itu — tidak membuat spreadsheet baru.
> Jika Anda membuat skrip langsung di script.google.com tanpa membuka Sheet terlebih dahulu
> (standalone), `setup()` akan membuat spreadsheet baru sendiri.

1. Buka atau buat Google Sheet yang akan dipakai sebagai database, kemudian klik **Extensions → Apps Script**. Editor terbuka dan skrip menempel pada Sheet tersebut. Beri nama project, misalnya: **"Backend Profil Dosen"**.
2. Hapus kode `function myFunction() {}` yang ada di editor.
3. Salin seluruh isi file `backend-gas/Code.gs` dan tempel ke editor GAS.
4. Buka menu **Project Settings** (ikon roda gigi di sidebar kiri).
5. Centang **"Show appsscript.json manifest file in editor"**.
6. Klik tab file `appsscript.json` di editor, hapus isinya, lalu tempel isi dari `backend-gas/appsscript.json`.

### Cara B: Menggunakan clasp

```bash
# Install clasp secara global
npm install -g @google/clasp

# Login ke akun Google Anda
clasp login

# Masuk ke folder backend
cd backend-gas

# Buat project GAS baru (tipe standalone)
clasp create --type standalone --title "Backend Profil Dosen"

# Push kode ke GAS
clasp push
```

---

## Langkah 2: Jalankan `setup()`

**PENTING:** Langkah ini harus dilakukan SEKALI sebelum apapun.

1. Di editor GAS, pastikan fungsi yang dipilih di dropdown adalah `setup`.
2. Klik tombol **Run (segitiga)**.
3. Saat diminta izin (Authorization), klik **Review permissions** → pilih akun Google Anda → klik **Allow**.
   - Scope yang diminta: Google Sheets, Google Drive.
4. Tunggu hingga selesai. Buka **View → Logs (Ctrl+Enter)** untuk melihat ringkasan.

Log yang muncul akan mencantumkan:
- Konfirmasi skrip memakai spreadsheet aktif (container-bound) beserta URL-nya, atau nama spreadsheet baru bila standalone
- ID folder Drive yang dibuat
- **Peringatan wajib ganti password** — BACA ini!

**Kredensial admin awal:**
- Username: `admin`
- Password: `ubah-saya-segera`

**WAJIB GANTI password segera setelah login pertama** via tab "Akun" di panel admin.

---

## Langkah 3: Deploy sebagai Web App

1. Di editor GAS, klik **Deploy** (pojok kanan atas) → **New deployment**.
2. Klik ikon roda gigi di sebelah "Select type" → pilih **Web app**.
3. Isi form:
   - Description: `v1` (atau nama bebas)
   - **Execute as: Me** (akun Google Anda)
   - **Who has access: Anyone** (termasuk anonymous — diperlukan agar frontend bisa memanggil tanpa login Google)
4. Klik **Deploy**.
5. Izinkan scope OAuth jika diminta.
6. **Salin URL Web App** yang muncul. URL berbentuk:
   ```
   https://script.google.com/macros/s/AKfy.../exec
   ```

> **Catatan:** Setiap kali Anda mengubah kode `Code.gs`, buat deployment BARU (bukan update yang sama). Klik Deploy → New deployment, bukan "Manage deployments" → edit yang lama, karena deployment lama tetap menjalankan versi kode lama.

---

## Langkah 4: Isi URL di Dua Tempat

URL Web App GAS harus diisi di **dua tempat** dengan URL yang **sama persis**:

### 4a. `index.html` — untuk halaman publik

`index.html` adalah file mandiri (CSS dan JS inline di dalamnya). Konstanta `API_URL` ada di bagian atas blok `<script>` di dalam file tersebut.

```js
// Sebelum:
const API_URL = 'GANTI_DENGAN_URL_WEB_APP_GAS';

// Sesudah (contoh):
const API_URL = 'https://script.google.com/macros/s/AKfy.../exec';
```

Simpan file `index.html`.

### 4b. `js/config.js` — untuk panel admin

```js
// Sebelum:
const API_URL = 'GANTI_DENGAN_URL_WEB_APP_GAS';

// Sesudah (contoh, URL sama seperti di index.html):
const API_URL = 'https://script.google.com/macros/s/AKfy.../exec';
```

Simpan file `js/config.js`.

> File `js/public.js` tidak lagi dipakai oleh `index.html`. File ini boleh diabaikan atau dihapus — tidak memengaruhi fungsi apapun.

---

## Langkah 5: Deploy Frontend ke GitHub Pages

1. Buat repository baru di GitHub (mis. `profil-dosen`).
2. Push seluruh isi folder proyek ini ke repository tersebut:
   ```bash
   git init
   git add .
   git commit -m "Inisialisasi website profil dosen"
   git remote add origin https://github.com/USERNAME/profil-dosen.git
   git push -u origin main
   ```
3. Di GitHub, buka repository → **Settings** → **Pages**.
4. Di bawah "Source", pilih:
   - Branch: `main`
   - Folder: `/ (root)`
5. Klik **Save**.
6. Tunggu beberapa menit, lalu buka URL yang diberikan GitHub Pages (mis. `https://username.github.io/profil-dosen/`).

---

## Langkah 6: Uji CORS dari GitHub Pages

Buka URL GitHub Pages Anda di browser, lalu buka DevTools (F12) → Console.

Jika ada error CORS, periksa:
- Apakah `API_URL` di `index.html` (halaman publik) dan di `js/config.js` (panel admin) sudah benar?
- Apakah Web App GAS sudah di-deploy dengan akses "Anyone (even anonymous)"?
- Apakah semua request dari frontend menggunakan `Content-Type: text/plain;charset=utf-8`?

**Catatan CORS (penting):** GAS tidak mendukung preflight OPTIONS. Semua request dari frontend menggunakan pola "simple request" (POST + `text/plain`). GAS secara otomatis menambahkan header `Access-Control-Allow-Origin: *` pada respons. Pola ini WAJIB diuji dari URL GitHub Pages asli — tidak bisa diuji dari `localhost`.

---

## Langkah 7: Login dan Isi Data

1. Buka `https://username.github.io/profil-dosen/admin.html`
2. Login dengan `admin` / `ubah-saya-segera`
3. **Segera ganti password** di tab "Akun"
4. Isi profil, tambah penelitian, pengabdian, galeri, dan dokumen

---

## Titik yang WAJIB Diuji Manual

Kode sudah **ditulis** tetapi **belum diuji jalan** di lingkungan GAS/GitHub Pages nyata. Bagian berikut memerlukan pengujian manual:

| No | Yang Diuji | Cara Uji |
|----|-----------|----------|
| 1 | CORS dari GitHub Pages | Buka halaman publik via Pages, cek Console DevTools |
| 2 | Thumbnail foto Drive | Upload foto profil dan galeri, lihat apakah gambar tampil |
| 3 | `setSharing()` Drive | Setelah upload, buka URL thumbnail di tab incognito |
| 4 | `setup()` di GAS | Jalankan dari editor (via Extensions → Apps Script pada Sheet Anda), periksa log bahwa memakai Sheet yang benar |
| 5 | Login throttle (5 percobaan) | Coba login dengan password salah 5+ kali |
| 6 | Upload file besar (>25 MB) | Pastikan ditolak di client dengan pesan yang jelas |
| 7 | Deploy Web App baru setelah edit Code.gs | Pastikan deployment baru dibuat, bukan yang lama |

---

## Skema Google Sheets

Dibuat otomatis oleh `setup()`. Jangan ubah nama sheet atau urutan kolom header secara manual.

| Sheet | Kolom |
|-------|-------|
| `Profil` | key, value |
| `Penelitian` | id, judul, tahun, link, urutan, dibuat_pada |
| `Pengabdian` | id, judul, tahun, link, urutan, dibuat_pada |
| `Galeri` | id, judul, keterangan, file_id, urutan, dibuat_pada |
| `Dokumen` | id, judul, jenis, file_id, nama_file, ukuran, dibuat_pada |
| `Admin` | username, password_hash, salt, dibuat_pada, login_terakhir |

---

## Pertanyaan Umum

**T: Gambar dari Drive tidak muncul di halaman publik?**
J: Pastikan file di Drive sudah di-share "Anyone with the link". `setup()` dan `uploadMedia()` seharusnya sudah mengatur ini, tetapi perlu diverifikasi manual (coba buka URL thumbnail di tab incognito).

**T: Setelah edit `Code.gs`, perubahan tidak terlihat?**
J: Buat deployment BARU di GAS (bukan edit deployment lama), lalu perbarui `API_URL` di **dua tempat** dengan URL baru: di `index.html` (blok `<script>` bagian atas) dan di `js/config.js`.

**T: Token sesi berapa lama?**
J: 6 jam (`CacheService` GAS dengan TTL 21600 detik). Sesi tersimpan di `sessionStorage` browser, jadi otomatis habis saat tab/browser ditutup.

**T: Apakah ada notifikasi email?**
J: Tidak — fitur notifikasi tidak termasuk dalam ruang lingkup proyek ini.
