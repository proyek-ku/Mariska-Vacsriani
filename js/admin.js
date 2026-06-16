/**
 * ADMIN.JS — Logika panel admin (admin.html)
 * ============================================
 * Login, manajemen sesi, dan CRUD untuk semua konten profil dosen.
 *
 * CATATAN CORS (WAJIB):
 *   Semua request ke GAS menggunakan pola "simple request":
 *   POST + Content-Type: text/plain;charset=utf-8 + body = JSON string.
 *   Token sesi dikirim DI DALAM body, bukan sebagai Authorization header.
 *   WAJIB DIUJI MANUAL dari URL GitHub Pages nyata.
 *
 * CATATAN UPLOAD:
 *   FileReader.readAsDataURL menghasilkan string "data:MIME;base64,DATA".
 *   Kode ini memotong prefix tersebut dan hanya mengirim bagian DATA.
 *   Batas ukuran 25 MB divalidasi di client sebelum encoding base64.
 */

'use strict';

/* =====================================================
   KONSTANTA
   ===================================================== */

const BATAS_UKURAN_MB = 25;
const BATAS_UKURAN_BYTES = BATAS_UKURAN_MB * 1024 * 1024;

/* =====================================================
   PENYIMPANAN DATA GLOBAL (untuk lookup via dataset id)
   ===================================================== */

let dataPenelitian = [];
let dataPengabdian = [];
let dataGaleri = [];
let dataDokumen = [];

/* =====================================================
   FLAG ANTI DOUBLE-SUBMIT UPLOAD
   ===================================================== */

let sedangUploadGaleri  = false;
let sedangUploadDokumen = false;

/* =====================================================
   MANAJEMEN SESI
   ===================================================== */

function simpanToken(token) {
  sessionStorage.setItem('admin_token', token);
}

function ambilToken() {
  return sessionStorage.getItem('admin_token');
}

function hapusToken() {
  sessionStorage.removeItem('admin_token');
}

function sudahLogin() {
  return !!ambilToken();
}

/* =====================================================
   HELPER API (CORS-SAFE)
   ===================================================== */

/**
 * Panggil GAS API dengan pola CORS-safe.
 * Token dikirim di dalam body bila tersedia.
 *
 * @param {string} action
 * @param {Object} payload
 * @returns {Promise<{ok:boolean, pesan:string, data:*}>}
 */
async function apiCall(action, payload = {}) {
  const token = ambilToken();
  const body = JSON.stringify({
    action,
    ...(token ? { token } : {}),
    ...payload
  });

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

/* =====================================================
   TOAST NOTIFIKASI
   ===================================================== */

function tampilToast(pesan, tipe = 'info', durasi = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = `toast toast--${tipe}`;
  el.textContent = pesan;
  container.appendChild(el);
  setTimeout(() => el.remove(), durasi);
}

/* =====================================================
   UTILITAS
   ===================================================== */

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatUkuran(bytes) {
  if (!bytes || isNaN(bytes)) return '';
  const n = Number(bytes);
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / (1024 * 1024)).toFixed(1) + ' MB';
}

/** Set tombol ke state loading (disabled + teks loading). */
function setTombolLoading(el, sedangLoading, teksAsal) {
  if (sedangLoading) {
    el.disabled = true;
    el.dataset.teksAsal = el.textContent;
    el.textContent = 'Memproses...';
  } else {
    el.disabled = false;
    el.textContent = el.dataset.teksAsal || teksAsal || 'Simpan';
  }
}

/**
 * Baca file sebagai base64 (tanpa prefix data:...;base64,).
 * @param {File} file
 * @returns {Promise<{base64: string, mimeType: string, namaFile: string, ukuran: number}>}
 */
function bacaFileBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const hasil = e.target.result; // "data:MIME;base64,DATA"
      const koma  = hasil.indexOf(',');
      if (koma === -1) return reject(new Error('Format data file tidak valid.'));
      resolve({
        base64:    hasil.slice(koma + 1),
        mimeType:  file.type,
        namaFile:  file.name,
        ukuran:    file.size
      });
    };
    reader.onerror = () => reject(new Error('Gagal membaca file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Upload media ke Drive via GAS API.
 * @param {File} file - File object dari input
 * @param {string} target - 'Foto' | 'Galeri' | 'Dokumen'
 * @returns {Promise<{fileId:string, namaFile:string, ukuran:number}>}
 */
async function uploadMedia(file, target) {
  // Validasi ukuran
  if (file.size > BATAS_UKURAN_BYTES) {
    throw new Error(`Ukuran file melebihi batas ${BATAS_UKURAN_MB} MB.`);
  }

  // Validasi tipe berdasarkan target
  if ((target === 'Foto' || target === 'Galeri') && !file.type.startsWith('image/')) {
    throw new Error('Hanya file gambar yang diizinkan untuk folder ini.');
  }
  if (target === 'Dokumen' && file.type !== 'application/pdf') {
    throw new Error('Hanya file PDF yang diizinkan untuk dokumen.');
  }

  const { base64, mimeType, namaFile } = await bacaFileBase64(file);

  const hasil = await apiCall('uploadMedia', {
    namaFile,
    mimeType,
    dataBase64: base64,
    target
  });

  if (!hasil.ok) throw new Error(hasil.pesan || 'Upload gagal.');
  return hasil.data; // { fileId, namaFile, ukuran }
}

/* =====================================================
   NAVIGASI TAB
   ===================================================== */

function inisialisasiTab() {
  const tabItems  = document.querySelectorAll('.admin-nav__item');
  const tabPanels = document.querySelectorAll('.admin-panel');

  tabItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.dataset.tab;

      tabItems.forEach(t => t.classList.remove('aktif'));
      tabPanels.forEach(p => p.classList.remove('aktif'));

      item.classList.add('aktif');
      const panel = document.getElementById('tab-' + target);
      if (panel) panel.classList.add('aktif');
    });
  });

  // Aktifkan tab pertama
  if (tabItems.length > 0) tabItems[0].click();
}

/* =====================================================
   LOGIN
   ===================================================== */

async function prosesLogin(e) {
  e.preventDefault();
  const form     = e.target;
  const username = form.username.value.trim();
  const password = form.password.value;
  const pesan    = document.getElementById('login-pesan');
  const tombol   = form.querySelector('button[type="submit"]');

  pesan.classList.remove('tampil');
  setTombolLoading(tombol, true);

  try {
    const hasil = await apiCall('login', { username, password });
    if (hasil.ok) {
      simpanToken(hasil.data.token);
      tampilkanDashboard();
      await muatDataAdmin();
    } else {
      pesan.textContent = hasil.pesan || 'Login gagal.';
      pesan.classList.add('tampil');
    }
  } catch (err) {
    pesan.textContent = 'Tidak dapat terhubung ke server. Periksa koneksi Anda.';
    pesan.classList.add('tampil');
    console.error('[Admin] Error login:', err);
  } finally {
    setTombolLoading(tombol, false, 'Masuk');
  }
}

async function prosesLogout() {
  try {
    await apiCall('logout');
  } catch (_) {
    // Tetap logout di sisi client meski request gagal
  }
  hapusToken();
  tampilkanLogin();
}

/* =====================================================
   TAMPILAN LOGIN / DASHBOARD
   ===================================================== */

function tampilkanLogin() {
  document.getElementById('halaman-login').style.display = 'flex';
  document.getElementById('halaman-dashboard').style.display = 'none';
}

function tampilkanDashboard() {
  document.getElementById('halaman-login').style.display = 'none';
  document.getElementById('halaman-dashboard').style.display = 'flex';
}

/* =====================================================
   MUAT DATA ADMIN
   ===================================================== */

/**
 * Deteksi respons sesi tidak valid dari server.
 * Server mengembalikan {ok:false, pesan:'...', kodeSesi:true} saat sesi habis.
 */
function adalahSesiTidakValid(hasil) {
  if (hasil && hasil.ok === false && hasil.kodeSesi === true) return true;
  // Fallback: cek pesan (jaga kompatibilitas respons lama)
  if (hasil && hasil.ok === false && hasil.pesan &&
      (hasil.pesan.includes('Sesi tidak valid') || hasil.pesan.includes('Sesi habis'))) {
    return true;
  }
  return false;
}

/** Paksa logout dan tampilkan login dengan pesan sesi berakhir. */
function tanganiSesiKadaluarsa() {
  hapusToken();
  const pesan = document.getElementById('login-pesan');
  if (pesan) {
    pesan.textContent = 'Sesi berakhir, silakan login lagi.';
    pesan.classList.add('tampil');
  }
  tampilkanLogin();
}

async function muatDataAdmin() {
  try {
    const hasil = await apiCall('getAdmin');
    if (!hasil.ok) {
      if (adalahSesiTidakValid(hasil)) {
        tanganiSesiKadaluarsa();
        return;
      }
      tampilToast('Gagal memuat data: ' + hasil.pesan, 'gagal');
      return;
    }
    const { profil, penelitian, pengabdian, galeri, dokumen } = hasil.data;
    isiFormProfil(profil || {});
    dataPenelitian = penelitian || [];
    dataPengabdian = pengabdian || [];
    dataGaleri     = galeri     || [];
    dataDokumen    = dokumen    || [];
    renderTabelPenelitian(dataPenelitian);
    renderTabelPengabdian(dataPengabdian);
    renderGaleriAdmin(dataGaleri);
    renderDokumenAdmin(dataDokumen);
  } catch (err) {
    tampilToast('Tidak dapat terhubung ke server.', 'gagal');
    console.error('[Admin] Error muatDataAdmin:', err);
  }
}

/* =====================================================
   PROFIL
   ===================================================== */

function isiFormProfil(profil) {
  const fields = [
    'nama_lengkap','nuptk','gelar_depan','gelar_belakang',
    'profesi','jabatan','institusi','bio','email_publik',
    'sosmed_facebook','sosmed_instagram','sosmed_tiktok',
    'sosmed_linkedin','sosmed_youtube','sosmed_scholar','sosmed_garuda'
  ];
  fields.forEach(f => {
    const el = document.getElementById('profil_' + f);
    if (el) el.value = profil[f] || '';
  });

  // Tampilkan foto preview jika ada
  if (profil.foto_profil_id) {
    const preview = document.getElementById('profil-foto-preview');
    if (preview) {
      preview.src = `https://drive.google.com/thumbnail?id=${encodeURIComponent(profil.foto_profil_id)}&sz=w200`;
      preview.classList.add('tampil');
    }
    // Simpan ID foto lama di dataset form
    const form = document.getElementById('form-profil');
    if (form) form.dataset.fotoId = profil.foto_profil_id;
  }
}

async function prosesSimpanProfil(e) {
  e.preventDefault();
  const form   = e.target;
  const tombol = form.querySelector('button[type="submit"]');
  setTombolLoading(tombol, true);

  try {
    // Upload foto baru jika dipilih
    const inputFoto = document.getElementById('profil_foto_file');
    let fotoId = form.dataset.fotoId || '';

    if (inputFoto && inputFoto.files.length > 0) {
      try {
        const hasilUpload = await uploadMedia(inputFoto.files[0], 'Foto');
        fotoId = hasilUpload.fileId;
        tampilToast('Foto profil berhasil diunggah.', 'sukses');
      } catch (errUpload) {
        tampilToast('Gagal upload foto: ' + errUpload.message, 'gagal');
        setTombolLoading(tombol, false, 'Simpan Profil');
        return;
      }
    }

    // Kumpulkan data form
    const data = {
      foto_profil_id:  fotoId,
      nama_lengkap:    form.nama_lengkap.value.trim(),
      nuptk:           form.nuptk.value.trim(),
      gelar_depan:     form.gelar_depan.value.trim(),
      gelar_belakang:  form.gelar_belakang.value.trim(),
      profesi:         form.profesi.value.trim(),
      jabatan:         form.jabatan.value.trim(),
      institusi:       form.institusi.value.trim(),
      bio:             form.bio.value.trim(),
      email_publik:    form.email_publik.value.trim(),
      sosmed_facebook:  form.sosmed_facebook.value.trim(),
      sosmed_instagram: form.sosmed_instagram.value.trim(),
      sosmed_tiktok:    form.sosmed_tiktok.value.trim(),
      sosmed_linkedin:  form.sosmed_linkedin.value.trim(),
      sosmed_youtube:   form.sosmed_youtube.value.trim(),
      sosmed_scholar:   form.sosmed_scholar.value.trim(),
      sosmed_garuda:    form.sosmed_garuda.value.trim()
    };

    const hasil = await apiCall('saveProfil', { data });
    if (hasil.ok) {
      tampilToast('Profil berhasil disimpan.', 'sukses');
      form.dataset.fotoId = fotoId; // perbarui ID foto di form
    } else {
      if (adalahSesiTidakValid(hasil)) { tanganiSesiKadaluarsa(); return; }
      tampilToast('Gagal: ' + hasil.pesan, 'gagal');
    }
  } catch (err) {
    tampilToast('Terjadi kesalahan. Coba lagi.', 'gagal');
    console.error('[Admin] Error simpan profil:', err);
  } finally {
    setTombolLoading(tombol, false, 'Simpan Profil');
  }
}

/* =====================================================
   PENELITIAN
   ===================================================== */

function renderTabelPenelitian(daftar) {
  const el = document.getElementById('tabel-penelitian-body');
  if (!el) return;

  if (!daftar.length) {
    el.innerHTML = '<tr><td colspan="4" class="status-kosong">Belum ada data penelitian.</td></tr>';
    return;
  }

  el.innerHTML = daftar.map(item => `
    <tr>
      <td>${escHtml(item.judul || '—')}</td>
      <td>${escHtml(String(item.tahun || '—'))}</td>
      <td>${item.link ? `<a href="${escHtml(item.link)}" target="_blank" rel="noopener noreferrer">Lihat</a>` : '—'}</td>
      <td>
        <div style="display:flex;gap:0.4rem;">
          <button class="tombol tombol--sekunder tombol--kecil btn-edit-penelitian"
            data-id="${escHtml(String(item.id || ''))}">Edit</button>
          <button class="tombol tombol--bahaya tombol--kecil btn-hapus-penelitian"
            data-id="${escHtml(String(item.id || ''))}">Hapus</button>
        </div>
      </td>
    </tr>`).join('');

  // Event delegation — pasang sekali setelah render
  el.removeEventListener('click', _delegasiPenelitian);
  el.addEventListener('click', _delegasiPenelitian);
}

function _delegasiPenelitian(e) {
  const tombol = e.target.closest('button');
  if (!tombol) return;
  const id = tombol.dataset.id;
  if (!id) return;

  if (tombol.classList.contains('btn-edit-penelitian')) {
    const item = dataPenelitian.find(d => String(d.id) === id);
    if (item) bukaModalEditPenelitian(item);
  } else if (tombol.classList.contains('btn-hapus-penelitian')) {
    hapusPenelitian(id);
  }
}

function bukaModalTambahPenelitian() {
  document.getElementById('modal-penelitian-judul').textContent = 'Tambah Penelitian';
  document.getElementById('form-penelitian').reset();
  document.getElementById('penelitian_id').value = '';
  document.getElementById('modal-penelitian').classList.remove('tersembunyi');
}

function bukaModalEditPenelitian(item) {
  document.getElementById('modal-penelitian-judul').textContent = 'Edit Penelitian';
  document.getElementById('penelitian_id').value    = item.id    || '';
  document.getElementById('penelitian_judul').value = item.judul || '';
  document.getElementById('penelitian_tahun').value = item.tahun || '';
  document.getElementById('penelitian_link').value  = item.link  || '';
  document.getElementById('modal-penelitian').classList.remove('tersembunyi');
}

function tutupModalPenelitian() {
  document.getElementById('modal-penelitian').classList.add('tersembunyi');
}

async function prosesSimpanPenelitian(e) {
  e.preventDefault();
  const form   = e.target;
  const tombol = form.querySelector('button[type="submit"]');
  const id     = form.penelitian_id.value;
  setTombolLoading(tombol, true);

  const data = {
    id:    id || undefined,
    judul: form.penelitian_judul.value.trim(),
    tahun: form.penelitian_tahun.value.trim(),
    link:  form.penelitian_link.value.trim()
  };

  if (!data.judul) {
    tampilToast('Judul penelitian wajib diisi.', 'gagal');
    setTombolLoading(tombol, false, 'Simpan');
    return;
  }

  try {
    const action = id ? 'updatePenelitian' : 'addPenelitian';
    const hasil  = await apiCall(action, { data });

    if (hasil.ok) {
      tampilToast(id ? 'Penelitian diperbarui.' : 'Penelitian ditambahkan.', 'sukses');
      tutupModalPenelitian();
      await muatDataAdmin();
    } else {
      if (adalahSesiTidakValid(hasil)) { tanganiSesiKadaluarsa(); return; }
      tampilToast('Gagal: ' + hasil.pesan, 'gagal');
    }
  } catch (err) {
    tampilToast('Terjadi kesalahan. Coba lagi.', 'gagal');
    console.error('[Admin] Error simpan penelitian:', err);
  } finally {
    setTombolLoading(tombol, false, 'Simpan');
  }
}

async function hapusPenelitian(id) {
  if (!confirm('Hapus penelitian ini? Tindakan tidak dapat dibatalkan.')) return;
  try {
    const hasil = await apiCall('deletePenelitian', { id });
    if (hasil.ok) {
      tampilToast('Penelitian dihapus.', 'sukses');
      await muatDataAdmin();
    } else {
      if (adalahSesiTidakValid(hasil)) { tanganiSesiKadaluarsa(); return; }
      tampilToast('Gagal: ' + hasil.pesan, 'gagal');
    }
  } catch (err) {
    tampilToast('Terjadi kesalahan.', 'gagal');
  }
}

/* =====================================================
   PENGABDIAN
   ===================================================== */

function renderTabelPengabdian(daftar) {
  const el = document.getElementById('tabel-pengabdian-body');
  if (!el) return;

  if (!daftar.length) {
    el.innerHTML = '<tr><td colspan="4" class="status-kosong">Belum ada data pengabdian.</td></tr>';
    return;
  }

  el.innerHTML = daftar.map(item => `
    <tr>
      <td>${escHtml(item.judul || '—')}</td>
      <td>${escHtml(String(item.tahun || '—'))}</td>
      <td>${item.link ? `<a href="${escHtml(item.link)}" target="_blank" rel="noopener noreferrer">Lihat</a>` : '—'}</td>
      <td>
        <div style="display:flex;gap:0.4rem;">
          <button class="tombol tombol--sekunder tombol--kecil btn-edit-pengabdian"
            data-id="${escHtml(String(item.id || ''))}">Edit</button>
          <button class="tombol tombol--bahaya tombol--kecil btn-hapus-pengabdian"
            data-id="${escHtml(String(item.id || ''))}">Hapus</button>
        </div>
      </td>
    </tr>`).join('');

  // Event delegation — pasang setelah render
  el.removeEventListener('click', _delegasiPengabdian);
  el.addEventListener('click', _delegasiPengabdian);
}

function _delegasiPengabdian(e) {
  const tombol = e.target.closest('button');
  if (!tombol) return;
  const id = tombol.dataset.id;
  if (!id) return;

  if (tombol.classList.contains('btn-edit-pengabdian')) {
    const item = dataPengabdian.find(d => String(d.id) === id);
    if (item) bukaModalEditPengabdian(item);
  } else if (tombol.classList.contains('btn-hapus-pengabdian')) {
    hapusPengabdian(id);
  }
}

function bukaModalTambahPengabdian() {
  document.getElementById('modal-pengabdian-judul').textContent = 'Tambah Pengabdian';
  document.getElementById('form-pengabdian').reset();
  document.getElementById('pengabdian_id').value = '';
  document.getElementById('modal-pengabdian').classList.remove('tersembunyi');
}

function bukaModalEditPengabdian(item) {
  document.getElementById('modal-pengabdian-judul').textContent = 'Edit Pengabdian';
  document.getElementById('pengabdian_id').value    = item.id    || '';
  document.getElementById('pengabdian_judul').value = item.judul || '';
  document.getElementById('pengabdian_tahun').value = item.tahun || '';
  document.getElementById('pengabdian_link').value  = item.link  || '';
  document.getElementById('modal-pengabdian').classList.remove('tersembunyi');
}

function tutupModalPengabdian() {
  document.getElementById('modal-pengabdian').classList.add('tersembunyi');
}

async function prosesSimpanPengabdian(e) {
  e.preventDefault();
  const form   = e.target;
  const tombol = form.querySelector('button[type="submit"]');
  const id     = form.pengabdian_id.value;
  setTombolLoading(tombol, true);

  const data = {
    id:    id || undefined,
    judul: form.pengabdian_judul.value.trim(),
    tahun: form.pengabdian_tahun.value.trim(),
    link:  form.pengabdian_link.value.trim()
  };

  if (!data.judul) {
    tampilToast('Judul pengabdian wajib diisi.', 'gagal');
    setTombolLoading(tombol, false, 'Simpan');
    return;
  }

  try {
    const action = id ? 'updatePengabdian' : 'addPengabdian';
    const hasil  = await apiCall(action, { data });

    if (hasil.ok) {
      tampilToast(id ? 'Pengabdian diperbarui.' : 'Pengabdian ditambahkan.', 'sukses');
      tutupModalPengabdian();
      await muatDataAdmin();
    } else {
      if (adalahSesiTidakValid(hasil)) { tanganiSesiKadaluarsa(); return; }
      tampilToast('Gagal: ' + hasil.pesan, 'gagal');
    }
  } catch (err) {
    tampilToast('Terjadi kesalahan. Coba lagi.', 'gagal');
  } finally {
    setTombolLoading(tombol, false, 'Simpan');
  }
}

async function hapusPengabdian(id) {
  if (!confirm('Hapus pengabdian ini? Tindakan tidak dapat dibatalkan.')) return;
  try {
    const hasil = await apiCall('deletePengabdian', { id });
    if (hasil.ok) {
      tampilToast('Pengabdian dihapus.', 'sukses');
      await muatDataAdmin();
    } else {
      if (adalahSesiTidakValid(hasil)) { tanganiSesiKadaluarsa(); return; }
      tampilToast('Gagal: ' + hasil.pesan, 'gagal');
    }
  } catch (err) {
    tampilToast('Terjadi kesalahan.', 'gagal');
  }
}

/* =====================================================
   GALERI
   ===================================================== */

function renderGaleriAdmin(daftar) {
  const el = document.getElementById('galeri-admin-konten');
  if (!el) return;

  if (!daftar.length) {
    el.innerHTML = '<p class="status-kosong">Belum ada foto galeri.</p>';
    return;
  }

  el.innerHTML = `<div class="galeri-admin-grid">${daftar.map(item => `
    <div class="galeri-admin-item">
      <img
        class="galeri-admin-item__gambar"
        src="https://drive.google.com/thumbnail?id=${encodeURIComponent(item.file_id)}&sz=w300"
        alt="${escHtml(item.judul || '')}"
        loading="lazy"
        onerror="this.src='';this.alt='Gagal memuat';"
      >
      <div class="galeri-admin-item__info">
        <div class="galeri-admin-item__judul">${escHtml(item.judul || '—')}</div>
        ${item.keterangan ? `<div class="galeri-admin-item__ket">${escHtml(item.keterangan)}</div>` : ''}
        <div class="galeri-admin-item__aksi">
          <button class="tombol tombol--sekunder tombol--kecil btn-edit-galeri"
            data-id="${escHtml(String(item.id || ''))}">Edit</button>
          <button class="tombol tombol--bahaya tombol--kecil btn-hapus-galeri"
            data-id="${escHtml(String(item.id || ''))}">Hapus</button>
        </div>
      </div>
    </div>`).join('')}</div>`;

  // Event delegation untuk galeri
  el.removeEventListener('click', _delegasiGaleri);
  el.addEventListener('click', _delegasiGaleri);
}

function _delegasiGaleri(e) {
  const tombol = e.target.closest('button');
  if (!tombol) return;
  const id = tombol.dataset.id;
  if (!id) return;

  if (tombol.classList.contains('btn-edit-galeri')) {
    const item = dataGaleri.find(d => String(d.id) === id);
    if (item) bukaModalEditGaleri(item);
  } else if (tombol.classList.contains('btn-hapus-galeri')) {
    hapusGaleri(id);
  }
}

/* =====================================================
   MODAL EDIT GALERI (judul & keterangan saja, tanpa ganti file)
   ===================================================== */

function bukaModalEditGaleri(item) {
  document.getElementById('modal-galeri-edit-judul-header').textContent = 'Edit Foto Galeri';
  document.getElementById('galeri_edit_id').value         = item.id         || '';
  document.getElementById('galeri_edit_judul').value      = item.judul      || '';
  document.getElementById('galeri_edit_keterangan').value = item.keterangan || '';
  document.getElementById('modal-galeri-edit').classList.remove('tersembunyi');
}

function tutupModalEditGaleri() {
  document.getElementById('modal-galeri-edit').classList.add('tersembunyi');
}

async function prosesSimpanEditGaleri(e) {
  e.preventDefault();
  const form   = e.target;
  const tombol = form.querySelector('button[type="submit"]');
  const id     = form.galeri_edit_id.value;

  if (!id) {
    tampilToast('ID galeri tidak ditemukan.', 'gagal');
    return;
  }

  const judul = form.galeri_edit_judul.value.trim();
  if (!judul) {
    tampilToast('Judul foto wajib diisi.', 'gagal');
    return;
  }

  setTombolLoading(tombol, true);
  try {
    const hasil = await apiCall('updateGaleri', {
      data: {
        id,
        judul,
        keterangan: form.galeri_edit_keterangan.value.trim()
      }
    });
    if (hasil.ok) {
      tampilToast('Foto galeri berhasil diperbarui.', 'sukses');
      tutupModalEditGaleri();
      await muatDataAdmin();
    } else {
      if (adalahSesiTidakValid(hasil)) { tanganiSesiKadaluarsa(); return; }
      tampilToast('Gagal: ' + hasil.pesan, 'gagal');
    }
  } catch (err) {
    tampilToast('Terjadi kesalahan. Coba lagi.', 'gagal');
    console.error('[Admin] Error edit galeri:', err);
  } finally {
    setTombolLoading(tombol, false, 'Simpan');
  }
}

async function prosesUploadGaleri(e) {
  e.preventDefault();

  // Guard double-submit
  if (sedangUploadGaleri) {
    tampilToast('Upload sedang berjalan, harap tunggu.', 'info');
    return;
  }

  const form   = e.target;
  const tombol = form.querySelector('button[type="submit"]');
  const judul  = form.galeri_judul.value.trim();
  const input  = form.galeri_file;

  if (!judul) {
    tampilToast('Judul foto wajib diisi.', 'gagal');
    return;
  }
  if (!input.files.length) {
    tampilToast('Pilih file foto terlebih dahulu.', 'gagal');
    return;
  }

  sedangUploadGaleri = true;
  setTombolLoading(tombol, true);

  try {
    const hasilUpload = await uploadMedia(input.files[0], 'Galeri');

    const hasil = await apiCall('addGaleri', {
      data: {
        judul,
        keterangan: form.galeri_keterangan.value.trim(),
        file_id:    hasilUpload.fileId
      }
    });

    if (hasil.ok) {
      tampilToast('Foto galeri berhasil ditambahkan.', 'sukses');
      form.reset();
      await muatDataAdmin();
    } else {
      if (adalahSesiTidakValid(hasil)) { tanganiSesiKadaluarsa(); return; }
      tampilToast('Gagal menyimpan data galeri: ' + hasil.pesan, 'gagal');
    }
  } catch (err) {
    tampilToast('Gagal: ' + err.message, 'gagal');
    console.error('[Admin] Error upload galeri:', err);
  } finally {
    sedangUploadGaleri = false;
    setTombolLoading(tombol, false, 'Unggah Foto');
  }
}

async function hapusGaleri(id) {
  if (!confirm('Hapus foto ini dari galeri? File di Drive juga akan dihapus.')) return;
  try {
    const hasil = await apiCall('deleteGaleri', { id });
    if (hasil.ok) {
      tampilToast('Foto galeri dihapus.', 'sukses');
      await muatDataAdmin();
    } else {
      if (adalahSesiTidakValid(hasil)) { tanganiSesiKadaluarsa(); return; }
      tampilToast('Gagal: ' + hasil.pesan, 'gagal');
    }
  } catch (err) {
    tampilToast('Terjadi kesalahan.', 'gagal');
  }
}

/* =====================================================
   DOKUMEN
   ===================================================== */

function renderDokumenAdmin(daftar) {
  const el = document.getElementById('dokumen-admin-konten');
  if (!el) return;

  if (!daftar.length) {
    el.innerHTML = '<p class="status-kosong">Belum ada dokumen.</p>';
    return;
  }

  el.innerHTML = `<div class="dokumen-list">${daftar.map(item => `
    <div class="dokumen-item">
      <div class="dokumen-item__ikon">&#x1F4C4;</div>
      <div class="dokumen-item__info">
        <div class="dokumen-item__judul">${escHtml(item.judul || '—')}</div>
        <div class="dokumen-item__meta">
          ${item.jenis ? escHtml(item.jenis) + ' · ' : ''}${escHtml(item.nama_file || '')}
          ${item.ukuran ? ' · ' + formatUkuran(item.ukuran) : ''}
        </div>
      </div>
      <button class="tombol tombol--bahaya tombol--kecil btn-hapus-dokumen"
        data-id="${escHtml(String(item.id || ''))}">Hapus</button>
    </div>`).join('')}</div>`;

  // Event delegation untuk dokumen
  el.removeEventListener('click', _delegasiDokumen);
  el.addEventListener('click', _delegasiDokumen);
}

function _delegasiDokumen(e) {
  const tombol = e.target.closest('button');
  if (!tombol) return;
  const id = tombol.dataset.id;
  if (!id) return;

  if (tombol.classList.contains('btn-hapus-dokumen')) {
    hapusDokumen(id);
  }
}

async function prosesUploadDokumen(e) {
  e.preventDefault();

  // Guard double-submit
  if (sedangUploadDokumen) {
    tampilToast('Upload sedang berjalan, harap tunggu.', 'info');
    return;
  }

  const form   = e.target;
  const tombol = form.querySelector('button[type="submit"]');
  const judul  = form.dokumen_judul.value.trim();
  const jenis  = form.dokumen_jenis.value.trim();
  const input  = form.dokumen_file;

  if (!judul) {
    tampilToast('Judul dokumen wajib diisi.', 'gagal');
    return;
  }
  if (!input.files.length) {
    tampilToast('Pilih file PDF terlebih dahulu.', 'gagal');
    return;
  }

  sedangUploadDokumen = true;
  setTombolLoading(tombol, true);

  try {
    const hasilUpload = await uploadMedia(input.files[0], 'Dokumen');

    const hasil = await apiCall('addDokumen', {
      data: {
        judul,
        jenis,
        file_id:   hasilUpload.fileId,
        nama_file: hasilUpload.namaFile,
        ukuran:    hasilUpload.ukuran
      }
    });

    if (hasil.ok) {
      tampilToast('Dokumen berhasil ditambahkan.', 'sukses');
      form.reset();
      await muatDataAdmin();
    } else {
      if (adalahSesiTidakValid(hasil)) { tanganiSesiKadaluarsa(); return; }
      tampilToast('Gagal menyimpan data dokumen: ' + hasil.pesan, 'gagal');
    }
  } catch (err) {
    tampilToast('Gagal: ' + err.message, 'gagal');
    console.error('[Admin] Error upload dokumen:', err);
  } finally {
    sedangUploadDokumen = false;
    setTombolLoading(tombol, false, 'Unggah Dokumen');
  }
}

async function hapusDokumen(id) {
  if (!confirm('Hapus dokumen ini? File di Drive juga akan dihapus.')) return;
  try {
    const hasil = await apiCall('deleteDokumen', { id });
    if (hasil.ok) {
      tampilToast('Dokumen dihapus.', 'sukses');
      await muatDataAdmin();
    } else {
      if (adalahSesiTidakValid(hasil)) { tanganiSesiKadaluarsa(); return; }
      tampilToast('Gagal: ' + hasil.pesan, 'gagal');
    }
  } catch (err) {
    tampilToast('Terjadi kesalahan.', 'gagal');
  }
}

/* =====================================================
   GANTI KREDENSIAL
   ===================================================== */

async function prosesGantiKredensial(e) {
  e.preventDefault();
  const form          = e.target;
  const tombol        = form.querySelector('button[type="submit"]');
  const usernameBaru  = form.username_baru.value.trim();
  const passwordBaru  = form.password_baru.value;
  const konfirmasi    = form.password_konfirmasi.value;

  if (!usernameBaru || !passwordBaru) {
    tampilToast('Username baru dan password baru wajib diisi.', 'gagal');
    return;
  }
  if (passwordBaru !== konfirmasi) {
    tampilToast('Konfirmasi password tidak cocok.', 'gagal');
    return;
  }
  if (passwordBaru.length < 8) {
    tampilToast('Password minimal 8 karakter.', 'gagal');
    return;
  }

  if (!confirm('Yakin ingin mengganti username dan password? Anda akan diminta login ulang.')) return;

  setTombolLoading(tombol, true);

  try {
    const hasil = await apiCall('changeCredentials', { usernameBaru, passwordBaru });
    if (hasil.ok) {
      tampilToast('Kredensial berhasil diubah. Silakan login ulang.', 'sukses');
      hapusToken();
      setTimeout(tampilkanLogin, 2000);
    } else {
      if (adalahSesiTidakValid(hasil)) { tanganiSesiKadaluarsa(); return; }
      tampilToast('Gagal: ' + hasil.pesan, 'gagal');
    }
  } catch (err) {
    tampilToast('Terjadi kesalahan.', 'gagal');
    console.error('[Admin] Error ganti kredensial:', err);
  } finally {
    setTombolLoading(tombol, false, 'Simpan Kredensial');
  }
}

/* =====================================================
   PREVIEW FOTO PROFIL
   ===================================================== */

function previewFotoProfil(e) {
  const file    = e.target.files[0];
  const preview = document.getElementById('profil-foto-preview');
  if (!file || !preview) return;

  if (file.size > BATAS_UKURAN_BYTES) {
    tampilToast(`File terlalu besar. Maksimal ${BATAS_UKURAN_MB} MB.`, 'gagal');
    e.target.value = '';
    return;
  }
  if (!file.type.startsWith('image/')) {
    tampilToast('Hanya file gambar yang diizinkan.', 'gagal');
    e.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (ev) => {
    preview.src = ev.target.result;
    preview.classList.add('tampil');
  };
  reader.readAsDataURL(file);
}

/* =====================================================
   INISIALISASI
   ===================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Cek konfigurasi API_URL
  if (typeof API_URL === 'undefined' || API_URL === 'GANTI_DENGAN_URL_WEB_APP_GAS') {
    document.body.innerHTML = `<div style="padding:2rem;font-family:sans-serif;color:#721c24;background:#f8d7da;border:1px solid #f5c6cb;border-radius:8px;margin:2rem auto;max-width:600px;">
      <strong>Konfigurasi belum lengkap:</strong> URL API belum diatur.
      Buka file <code>js/config.js</code> dan isi <code>API_URL</code> dengan URL Web App Google Apps Script Anda.
    </div>`;
    return;
  }

  // Cek apakah sudah login
  if (sudahLogin()) {
    tampilkanDashboard();
    muatDataAdmin();
  } else {
    tampilkanLogin();
  }

  // Form login
  const formLogin = document.getElementById('form-login');
  if (formLogin) formLogin.addEventListener('submit', prosesLogin);

  // Form profil
  const formProfil = document.getElementById('form-profil');
  if (formProfil) formProfil.addEventListener('submit', prosesSimpanProfil);

  // Preview foto profil
  const inputFoto = document.getElementById('profil_foto_file');
  if (inputFoto) inputFoto.addEventListener('change', previewFotoProfil);

  // Form penelitian
  const formPenelitian = document.getElementById('form-penelitian');
  if (formPenelitian) formPenelitian.addEventListener('submit', prosesSimpanPenelitian);

  // Form pengabdian
  const formPengabdian = document.getElementById('form-pengabdian');
  if (formPengabdian) formPengabdian.addEventListener('submit', prosesSimpanPengabdian);

  // Form galeri (tambah baru)
  const formGaleri = document.getElementById('form-galeri');
  if (formGaleri) formGaleri.addEventListener('submit', prosesUploadGaleri);

  // Form edit galeri (modal edit judul/keterangan)
  const formEditGaleri = document.getElementById('form-galeri-edit');
  if (formEditGaleri) formEditGaleri.addEventListener('submit', prosesSimpanEditGaleri);

  // Form dokumen
  const formDokumen = document.getElementById('form-dokumen');
  if (formDokumen) formDokumen.addEventListener('submit', prosesUploadDokumen);

  // Form ganti kredensial
  const formKredensial = document.getElementById('form-kredensial');
  if (formKredensial) formKredensial.addEventListener('submit', prosesGantiKredensial);

  // Tombol logout
  const tombolLogout = document.getElementById('tombol-logout');
  if (tombolLogout) tombolLogout.addEventListener('click', prosesLogout);

  // Navigasi tab
  inisialisasiTab();
});
