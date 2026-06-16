/**
 * PUBLIC.JS — Logika halaman publik (index.html)
 * ================================================
 * Mengambil data dari GAS API dan merender ke halaman.
 *
 * CATATAN CORS:
 *   Semua request ke GAS menggunakan POST dengan Content-Type: text/plain;charset=utf-8
 *   dan body berupa JSON.stringify(payload). Pola ini wajib untuk menghindari
 *   preflight OPTIONS yang tidak didukung GAS.
 *   WAJIB DIUJI MANUAL dari URL GitHub Pages asli.
 */

'use strict';

/* =====================================================
   HELPER API
   ===================================================== */

/**
 * Panggil GAS API.
 * POLA CORS WAJIB: POST, Content-Type text/plain, body = JSON string.
 * Token (jika ada) dikirim DI DALAM body, bukan sebagai header.
 *
 * @param {string} action - Nama aksi
 * @param {Object} payload - Data tambahan
 * @returns {Promise<{ok:boolean, pesan:string, data:*}>}
 */
async function apiCall(action, payload = {}) {
  const body = JSON.stringify({ action, ...payload });
  const res = await fetch(API_URL, {
    method: 'POST',
    // Content-Type text/plain agar tidak memicu preflight OPTIONS di GAS
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
   RENDER FUNGSI
   ===================================================== */

/**
 * Render hero/header profil.
 * Foto profil menggunakan thumbnail Drive dengan fallback emoji jika gagal load.
 * ASUMSI: URL thumbnail Drive https://drive.google.com/thumbnail?id=ID&sz=w400
 *         berfungsi untuk file publik. WAJIB DIUJI MANUAL.
 */
function renderHero(profil) {
  const el = document.getElementById('hero-profil');
  if (!el) return;

  const namaLengkap = profil.nama_lengkap || '';
  const gelarDepan  = profil.gelar_depan   || '';
  const gelarBelakang = profil.gelar_belakang || '';
  const namaLengkapGelar = [gelarDepan, namaLengkap, gelarBelakang]
    .filter(Boolean).join(' ') || '—';

  const profesi   = profil.profesi   || '';
  const jabatan   = profil.jabatan   || '';
  const institusi = profil.institusi || '';
  const nuptk     = profil.nuptk     || '';
  const fotoId    = profil.foto_profil_id || '';

  // Buat elemen foto
  let fotoHtml = '';
  if (fotoId) {
    fotoHtml = `<img
      class="hero__foto"
      src="https://drive.google.com/thumbnail?id=${encodeURIComponent(fotoId)}&sz=w400"
      alt="Foto ${namaLengkap}"
      loading="lazy"
      onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
    ><div class="hero__foto-placeholder" style="display:none;">&#128100;</div>`;
  } else {
    fotoHtml = `<div class="hero__foto-placeholder">&#128100;</div>`;
  }

  // Ikon sosmed
  // Catatan: &#xfb; (sebelumnya) menghasilkan karakter "û", bukan ikon Facebook.
  // Diganti dengan badge teks yang konsisten untuk semua platform.
  const sosmedDef = [
    { key: 'sosmed_facebook',  label: 'Facebook',       badge: 'FB' },
    { key: 'sosmed_instagram', label: 'Instagram',      badge: 'IG' },
    { key: 'sosmed_tiktok',    label: 'TikTok',         badge: 'TT' },
    { key: 'sosmed_linkedin',  label: 'LinkedIn',       badge: 'in' },
    { key: 'sosmed_youtube',   label: 'YouTube',        badge: 'YT' },
    { key: 'sosmed_scholar',   label: 'Google Scholar', badge: 'GS' },
    { key: 'sosmed_garuda',    label: 'Garuda',         badge: 'Garuda' }
  ];

  const sosmedHtml = sosmedDef
    .filter(s => profil[s.key])
    .map(s => `<a href="${escHtml(profil[s.key])}" target="_blank" rel="noopener noreferrer"
      class="sosmed-bar__tautan">
      <span class="sosmed-bar__badge">${s.badge}</span><span>${escHtml(s.label)}</span>
    </a>`)
    .join('');

  // Email publik — tampilkan sebagai link mailto: bila terisi
  const emailPublik = profil.email_publik || '';
  const emailHtml = emailPublik
    ? `<p class="hero__email"><a href="mailto:${escHtml(emailPublik)}">${escHtml(emailPublik)}</a></p>`
    : '';

  el.innerHTML = `
    <div class="container">
      <div class="hero__inner">
        <div class="hero__foto-wrap">${fotoHtml}</div>
        <div class="hero__info">
          <h1 class="hero__nama">${escHtml(namaLengkapGelar)}</h1>
          ${profesi  ? `<p class="hero__profesi">${escHtml(profesi)}${jabatan ? ' · ' + escHtml(jabatan) : ''}</p>` : ''}
          ${institusi ? `<p class="hero__institusi">&#x1F3EB; ${escHtml(institusi)}</p>` : ''}
          ${nuptk     ? `<p class="hero__nuptk">NUPTK: ${escHtml(nuptk)}</p>` : ''}
          ${emailHtml}
          ${sosmedHtml ? `<div class="sosmed-bar">${sosmedHtml}</div>` : ''}
        </div>
      </div>
    </div>`;
}

/**
 * Render bio dosen.
 */
function renderBio(profil) {
  const el  = document.getElementById('seksi-bio');
  const bio = profil.bio || '';
  if (!el) return;

  if (!bio.trim()) {
    el.style.display = 'none';
    return;
  }

  el.style.display = '';
  document.getElementById('konten-bio').textContent = bio;
}

/**
 * Render daftar penelitian.
 * Sembunyikan seluruh seksi bila kosong (di halaman publik).
 */
function renderPenelitian(daftar) {
  renderDaftarKarya('konten-penelitian', 'seksi-penelitian', daftar);
}

/**
 * Render daftar pengabdian.
 * Sembunyikan seluruh seksi bila kosong (di halaman publik).
 */
function renderPengabdian(daftar) {
  renderDaftarKarya('konten-pengabdian', 'seksi-pengabdian', daftar);
}

/**
 * Render daftar karya generik (penelitian / pengabdian).
 * Bila kosong, sembunyikan seksi induknya agar halaman publik tetap rapi.
 */
function renderDaftarKarya(elId, seksiId, daftar) {
  const el    = document.getElementById(elId);
  const seksi = document.getElementById(seksiId);
  if (!el) return;

  if (!daftar || daftar.length === 0) {
    if (seksi) seksi.style.display = 'none';
    return;
  }

  if (seksi) seksi.style.display = '';
  el.innerHTML = daftar.map(item => `
    <div class="kartu">
      <div class="kartu__judul">${escHtml(item.judul || '—')}</div>
      ${item.tahun ? `<div class="kartu__meta">Tahun: ${escHtml(String(item.tahun))}</div>` : ''}
      ${item.link  ? `<a class="kartu__tautan" href="${escHtml(item.link)}" target="_blank" rel="noopener noreferrer">
        &#x1F517; Lihat Dokumen
      </a>` : ''}
    </div>`).join('');
}

/**
 * Render galeri foto.
 * Sembunyikan seluruh seksi bila kosong.
 * ASUMSI: thumbnail Drive bisa diakses via URL thumbnail. WAJIB DIUJI MANUAL.
 */
function renderGaleri(daftar) {
  const el    = document.getElementById('konten-galeri');
  const seksi = document.getElementById('seksi-galeri');
  if (!el) return;

  if (!daftar || daftar.length === 0) {
    if (seksi) seksi.style.display = 'none';
    return;
  }

  if (seksi) seksi.style.display = '';
  el.innerHTML = `<div class="galeri-grid">${daftar.map(item => `
    <div class="galeri-item">
      <img
        class="galeri-item__gambar"
        src="https://drive.google.com/thumbnail?id=${encodeURIComponent(item.file_id)}&sz=w400"
        alt="${escHtml(item.judul || 'Foto galeri')}"
        loading="lazy"
        onerror="this.src='';this.alt='Gambar tidak tersedia';"
      >
      <div class="galeri-item__info">
        <div class="galeri-item__judul">${escHtml(item.judul || '')}</div>
        ${item.keterangan ? `<div class="galeri-item__keterangan">${escHtml(item.keterangan)}</div>` : ''}
      </div>
    </div>`).join('')}</div>`;
}

/**
 * Render daftar dokumen dengan link unduh.
 * Sembunyikan seluruh seksi bila kosong.
 */
function renderDokumen(daftar) {
  const el    = document.getElementById('konten-dokumen');
  const seksi = document.getElementById('seksi-dokumen');
  if (!el) return;

  if (!daftar || daftar.length === 0) {
    if (seksi) seksi.style.display = 'none';
    return;
  }

  if (seksi) seksi.style.display = '';
  el.innerHTML = `<div class="dokumen-list">${daftar.map(item => `
    <div class="dokumen-item">
      <div class="dokumen-item__ikon">&#x1F4C4;</div>
      <div class="dokumen-item__info">
        <div class="dokumen-item__judul">${escHtml(item.judul || '—')}</div>
        <div class="dokumen-item__meta">
          ${item.jenis ? escHtml(item.jenis) + ' · ' : ''}
          ${item.nama_file ? escHtml(item.nama_file) : ''}
          ${item.ukuran  ? ' · ' + formatUkuran(item.ukuran) : ''}
        </div>
      </div>
      <a
        class="dokumen-item__unduh tombol tombol--sekunder tombol--kecil"
        href="https://drive.google.com/uc?export=download&id=${encodeURIComponent(item.file_id)}"
        target="_blank"
        rel="noopener noreferrer"
      >&#x2B07; Unduh</a>
    </div>`).join('')}</div>`;
}

/* =====================================================
   UTILITAS
   ===================================================== */

/** Escape HTML untuk mencegah XSS. */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Format ukuran file ke KB/MB. */
function formatUkuran(bytes) {
  if (!bytes || isNaN(bytes)) return '';
  const n = Number(bytes);
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / (1024 * 1024)).toFixed(1) + ' MB';
}

/** Tampilkan state loading pada sebuah elemen. */
function tampilLoading(elId) {
  const el = document.getElementById(elId);
  if (el) el.innerHTML = `<div class="status-loading"><div class="spinner"></div>Memuat data...</div>`;
}

/* =====================================================
   INISIALISASI
   ===================================================== */

/**
 * Muat dan render semua data publik saat halaman dibuka.
 */
async function init() {
  // Cek konfigurasi API_URL
  if (typeof API_URL === 'undefined' || API_URL === 'GANTI_DENGAN_URL_WEB_APP_GAS') {
    const hero = document.getElementById('hero-profil');
    if (hero) {
      hero.innerHTML = `<div class="container"><div style="padding:1.5rem;color:#721c24;background:#f8d7da;border-radius:8px;">
        <strong>Konfigurasi belum lengkap:</strong> URL API belum diatur.
        Isi <code>API_URL</code> di file <code>js/config.js</code> dengan URL Web App Google Apps Script Anda.
      </div></div>`;
    }
    return;
  }

  // Tampilkan loading di setiap seksi
  ['konten-bio', 'konten-penelitian', 'konten-pengabdian', 'konten-galeri', 'konten-dokumen']
    .forEach(tampilLoading);

  try {
    const hasil = await apiCall('getPublic');

    if (!hasil.ok) {
      tampilToast('Gagal memuat data: ' + (hasil.pesan || 'Kesalahan tidak diketahui.'), 'gagal');
      return;
    }

    const { profil, penelitian, pengabdian, galeri, dokumen } = hasil.data;

    renderHero(profil || {});
    renderBio(profil || {});
    renderPenelitian(penelitian || []);
    renderPengabdian(pengabdian || []);
    renderGaleri(galeri || []);
    renderDokumen(dokumen || []);

  } catch (err) {
    tampilToast('Tidak dapat terhubung ke server. Periksa koneksi Anda.', 'gagal');
    console.error('[Profil] Error memuat data publik:', err);
  }
}

document.addEventListener('DOMContentLoaded', init);
