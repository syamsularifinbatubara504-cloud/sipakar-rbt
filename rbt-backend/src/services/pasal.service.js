/**
 * Pasal.id API Service
 * Integrasi dengan REST API Pasal.id untuk analisis hukum Indonesia
 *
 * Strategi 2-lapisan:
 * 1. Coba Pasal.id REST API (jika token tersedia)
 * 2. Fallback: Gunakan Gemini AI untuk identifikasi pasal relevan dari narasi
 */
require('dotenv').config();

// PENTING: trim() untuk menghapus trailing whitespace dari .env
const PASAL_API_BASE_URL = (process.env.PASAL_API_BASE_URL || 'https://pasal.id/api/v1').trim();
const PASAL_API_TOKEN = (process.env.PASAL_API_TOKEN || '').trim();

// ============================================================
// 1. PASAL.ID REST API
// ============================================================

/**
 * Panggil Pasal.id REST API untuk mencari pasal berdasarkan query
 * @param {string} searchQuery - String query pencarian
 * @returns {object[]} Array referensi hukum atau [] jika gagal/kosong
 */
async function fetchFromPasalId(searchQuery) {
  if (!PASAL_API_TOKEN || PASAL_API_TOKEN === 'your_pasal_id_bearer_token') {
    console.log('[PASAL] Token Pasal.id tidak dikonfigurasi, lewati API call.');
    return [];
  }

  try {
    const url = `${PASAL_API_BASE_URL}/search?q=${encodeURIComponent(searchQuery)}&limit=5`;
    console.log(`[PASAL] 🔍 Memanggil Pasal.id API: ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn(`[PASAL] ⏳ Trigger timeout untuk Pasal.id API (3s limit)...`);
      controller.abort();
    }, 3000);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PASAL_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      console.warn(`[PASAL] API error ${response.status}: ${errBody.substring(0, 200)}`);
      return [];
    }

    const data = await response.json();
    console.log(`[PASAL] 📦 Struktur data diterima:`, Object.keys(data));

    // Pasal.id bisa mengembalikan data di beberapa format berbeda
    const rawItems = data.data || data.results || data.items || data.articles || (Array.isArray(data) ? data : []);

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      console.warn('[PASAL] Pasal.id API mengembalikan hasil kosong.');
      return [];
    }

    const results = rawItems.slice(0, 5).map(item => ({
      pasal:        item.title || item.pasal || item.article || item.name || 'N/A',
      undangUndang: item.law_name || item.regulation || item.undang_undang || item.law || 'N/A',
      deskripsi:    item.content || item.description || item.deskripsi || item.body || item.text || '',
      ancamanPidana: item.penalty || item.sanction || item.ancaman_pidana || '',
    })).filter(r => r.pasal !== 'N/A' && r.deskripsi.length > 0);

    console.log(`[PASAL] Pasal.id API berhasil: ${results.length} pasal ditemukan`);
    return results;

  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn('[PASAL] Pasal.id API timeout (>8 detik).');
    } else {
      console.warn('[PASAL] Pasal.id API tidak dapat diakses:', err.message);
    }
    return [];
  }
}

// ============================================================
// 2. GEMINI AI FALLBACK — Identifikasi Pasal Berdasarkan Narasi
// ============================================================

/**
 * Gunakan Gemini AI untuk mengidentifikasi pasal hukum Indonesia
 * yang relevan berdasarkan narasi kasus (dipakai saat Pasal.id gagal)
 * @param {string} narasiKasus - Narasi kasus lengkap
 * @returns {object[]} Array referensi hukum yang dihasilkan AI
 */
async function generateLegalRefsWithGemini(narasiKasus) {
  // Lazy require untuk menghindari circular dependency
  const { getModel } = require('../config/gemini');
  const model = getModel();

  if (!model) {
    console.warn('[PASAL] Gemini tidak tersedia untuk fallback identifikasi pasal.');
    return [];
  }

  const prompt = `Anda adalah ahli hukum pidana Indonesia yang sangat berpengalaman dengan pengetahuan mendalam tentang KUHP, KUHAP, dan peraturan perundang-undangan Indonesia.

Berdasarkan narasi kasus berikut, identifikasi PASAL-PASAL HUKUM INDONESIA yang paling RELEVAN dan TEPAT:

NARASI KASUS:
${narasiKasus}

INSTRUKSI:
1. Analisis tindak pidana, pelanggaran, atau konteks hukum yang terjadi dalam narasi.
2. Identifikasi 3-5 pasal hukum Indonesia yang PALING RELEVAN dan TERBARU. 
3. PENTING: Prioritaskan penggunaan **KUHP TERBARU (UU No. 1 Tahun 2023)** jika relevan dengan kasus, namun tetap sebutkan padanannya di KUHP lama jika perlu untuk referensi transisi.
4. Pastikan pasal tersebut benar-benar berlaku di Indonesia pada tahun 2026.
5. Berikan deskripsi yang SANGAT LENGKAP dan DETAIL (minimal 3-5 kalimat) mencakup unsur-unsur pasal dan bagaimana unsur tersebut terpenuhi dalam narasi kasus.
6. Sertakan ancaman hukuman spesifik dan terbaru.

FORMAT OUTPUT (hanya JSON array yang valid, tanpa teks apapun di luar array):
[
  {
    "pasal": "Pasal [nomor]",
    "judulPasal": "[Judul/Nama Pasal, misal: Pencurian atau Penganiayaan]",
    "undangUndang": "[Nama lengkap Undang-Undang/Peraturan]",
    "deskripsi": "[Isi detail pasal dan analisis relevansinya dengan narasi]",
    "ancamanPidana": "[Sanksi pidana spesifik]"
  }
]

PENTING: Respons HANYA berisi JSON array. Mulai dengan [ dan akhiri dengan ]. Tidak ada teks, penjelasan, atau markdown.`;

  try {
    console.log('[PASAL] Menggunakan Gemini AI untuk identifikasi pasal hukum...');
    const result = await model.generateContent(prompt);
    
    if (!result || !result.response) {
      throw new Error('Respons Gemini tidak valid');
    }

    const text = result.response.text().trim();
    console.log(`[PASAL] Gemini RAW result length: ${text.length}`);

    // Ekstrak JSON array dengan regex yang lebih kuat
    let jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
    let jsonText = '';

    if (jsonMatch) {
      jsonText = jsonMatch[0];
    } else {
      // Fallback extraction
      const arrayStart = text.indexOf('[');
      const arrayEnd = text.lastIndexOf(']');
      if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
        jsonText = text.substring(arrayStart, arrayEnd + 1);
      }
    }

    if (!jsonText) {
      console.warn('[PASAL] Gagal menemukan JSON array dalam respons Gemini. Text:', text.substring(0, 500));
      return [];
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (parseErr) {
      // Coba bersihkan JSON dari baris komentar atau karakter aneh
      const cleaned = jsonText.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      parsed = JSON.parse(cleaned);
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [];
    }

    // Validasi dan standarisasi nama properti
    const valid = parsed.map(item => ({
      pasal:         item.pasal || item.pasal_number || item.title || 'N/A',
      judulPasal:    item.judulPasal || item.judul_pasal || item.name || '',
      undangUndang:  item.undangUndang || item.undang_undang || item.law_name || item.regulation || 'N/A',
      deskripsi:     item.deskripsi || item.description || item.content || '',
      ancamanPidana: item.ancamanPidana || item.ancaman_pidana || item.penalty || '',
    })).filter(item => item.pasal !== 'N/A' && item.deskripsi.length > 5);

    console.log(`[PASAL] Gemini fallback berhasil: ${valid.length} pasal hukum`);
    return valid;

  } catch (err) {
    console.error('[PASAL] Gagal mengidentifikasi pasal via Gemini:', err.message);
    return [];
  }
}

// ============================================================
// MAIN FUNCTION
/**
 * Fallback generator referensi hukum Indonesia berdasarkan analisis narasi kasus & unit spesialisasi.
 * Menjamin Dasar Hukum selalu tersedia 100% lengkap (KUHP, KUHAP, UU SPN, Perkap Polri).
 */
function generateFallbackLegalRefs(narasiKasus = '', spesialisasi = 'lantas') {
  const text = (narasiKasus || '').toLowerCase();
  const spec = (spesialisasi || 'lantas').toLowerCase();

  const refs = [];

  // 1. Deteksi kasus Perampokan / Pencurian / Kekerasan / Residivis / Persekusi / Reskrim
  if (text.includes('rampok') || text.includes('curi') || text.includes('begal') || text.includes('kekerasan') || text.includes('residivis') || text.includes('pelumpuhan') || spec.includes('reserse') || spec.includes('reskrim')) {
    refs.push({
      pasal: 'Pasal 365 KUHP (UU No. 1/2023 Pasal 479)',
      judulPasal: 'Pencurian dengan Kekerasan (Curas)',
      undangUndang: 'Kitab Undang-Undang Hukum Pidana (KUHP)',
      deskripsi: 'Diancam dengan pidana penjara paling lama sembilan tahun, pencurian yang didahului, disertai, atau diikuti dengan kekerasan atau ancaman kekerasan terhadap orang, dengan maksud untuk mempersiapkan atau mempermudah pencurian.',
      ancamanPidana: 'Pidana Penjara Maksimal 9 - 12 Tahun (atau Pidana Mati/Seumur Hidup jika mengakibatkan luka berat/kematian).'
    });
    refs.push({
      pasal: 'Pasal 1 (2) & Pasal 48 KUHP',
      judulPasal: 'Residivis / Pengulangan Tindak Pidana & Noodweer (Daya Paksa)',
      undangUndang: 'Kitab Undang-Undang Hukum Pidana (KUHP)',
      deskripsi: 'Pengulangan kejahatan oleh residivis yang memperberat ancaman hukuman pidana dasar, serta ketentuan mengenai tindakan tegas terukur petugas dalam situasi daya paksa/pembelaan terpaksa.',
      ancamanPidana: 'Penambahan 1/3 dari ancaman pidana maksimal kejahatan pokok.'
    });
    refs.push({
      pasal: 'Perkap No. 1 Tahun 2009',
      judulPasal: 'Penggunaan Kekuatan Dalam Tindakan Kepolisian',
      undangUndang: 'Peraturan Kepala Kepolisian Negara Republik Indonesia',
      deskripsi: 'Prinsip legalitas, nesesitas, dan proporsionalitas dalam penggunaan kekuatan serta tindakan tegas terukur (pelumpuhan) oleh personel Polri terhadap ancaman seketika yang membahayakan jiwa.',
      ancamanPidana: 'Standar Operasional Prosedur (SOP) Penindakan Taktis Kepolisian.'
    });
  }
  // 2. Deteksi kasus Kecelakaan / Lalu Lintas / Turunan / Bus / Tabrakan / Polantas
  else if (text.includes('rem') || text.includes('bus') || text.includes('tabrak') || text.includes('macet') || text.includes('jalan') || text.includes('korban') || spec.includes('lantas') || spec.includes('polantas')) {
    refs.push({
      pasal: 'Pasal 310 ayat (4) UU No. 22/2009',
      judulPasal: 'Kelalaian Mengemudikan Kendaraan Bermotor Menyebabkan Orang Lain Meninggal Dunia',
      undangUndang: 'UU No. 22 Tahun 2009 tentang Lalu Lintas dan Angkutan Jalan',
      deskripsi: 'Setiap orang yang mengemudikan Kendaraan Bermotor yang karena kelalaiannya mengakibatkan Kecelakaan Lalu Lintas yang mengakibatkan orang lain meninggal dunia.',
      ancamanPidana: 'Pidana penjara paling lama 6 (enam) tahun dan/atau denda paling banyak Rp12.000.000,00 (dua belas juta rupiah).'
    });
    refs.push({
      pasal: 'Pasal 311 UU No. 22/2009',
      judulPasal: 'Mengemudikan Kendaraan Bermotor dengan Cara atau Keadaan yang Membahayakan',
      undangUndang: 'UU No. 22 Tahun 2009 tentang Lalu Lintas dan Angkutan Jalan',
      deskripsi: 'Setiap orang yang dengan sengaja mengemudikan Kendaraan Bermotor dengan cara atau keadaan yang membahayakan bagi nyawa atau barang.',
      ancamanPidana: 'Pidana penjara paling lama 1 (satu) tahun sampai 12 (dua belas) tahun bergantung dampak kecelakaan.'
    });
    refs.push({
      pasal: 'Pasal 227 & Pasal 228 UU No. 22/2009',
      judulPasal: 'Kewajiban Pengemudi & Pertolongan Pertama Korban Laka Lantas (TPTKP)',
      undangUndang: 'UU No. 22 Tahun 2009 tentang Lalu Lintas dan Angkutan Jalan',
      deskripsi: 'Kewajiban petugas dan pengemudi untuk segera memberikan pertolongan pertama, mengamankan TKP, dan melaporkan kejadian kepada petugas Kepolisian terdekat.',
      ancamanPidana: 'Ketentuan Prosedur Penanganan Tempat Kejadian Perkara Lantas.'
    });
  }
  // 3. Fallback Umum / Sabhara / Binmas / Intel / SPN
  else {
    refs.push({
      pasal: 'Pasal 13 UU No. 2 Tahun 2002',
      judulPasal: 'Tugas Pokok Kepolisian Negara Republik Indonesia',
      undangUndang: 'UU No. 2 Tahun 2002 tentang Kepolisian Negara Republik Indonesia',
      deskripsi: 'Tugas pokok Kepolisian Negara Republik Indonesia adalah memelihara keamanan dan ketertiban masyarakat, menegakkan hukum, serta memberikan perlindungan, pengayoman, dan pelayanan kepada masyarakat.',
      ancamanPidana: 'Dasar Wewenang & Mandat Kewajiban Hukum Personel Polri.'
    });
    refs.push({
      pasal: 'Pasal 111 & Pasal 112 KUHAP',
      judulPasal: 'Tindakan Pertama di Tempat Kejadian Perkara (TPTKP)',
      undangUndang: 'UU No. 8 Tahun 1981 tentang Hukum Acara Pidana (KUHAP)',
      deskripsi: 'Wewenang penyelidik/penyidik dalam melakukan tindakan pertama di tempat kejadian perkara, mengamankan lokasi insiden, serta menyita barang bukti.',
      ancamanPidana: 'Prosedur Hukum Acara Pidana Resmi Republik Indonesia.'
    });
    refs.push({
      pasal: 'Perkap No. 6 Tahun 2019',
      judulPasal: 'Penyidikan Tindak Pidana & Standar TPTKP',
      undangUndang: 'Peraturan Kepala Kepolisian Negara Republik Indonesia',
      deskripsi: 'Prosedur standar pelaksanaan Tindakan Pertama di Tempat Kejadian Perkara (TPTKP), olah TKP, serta administrasi penyidikan kepolisian.',
      ancamanPidana: 'Standar Operasional Prosedur (SOP) Penanganan Kasus Polri.'
    });
  }

  return refs;
}

/**
 * Cari/generate referensi hukum yang relevan dengan kasus
 *
 * Strategi:
 * 1. Coba Pasal.id API dengan searchQuery
 * 2. Jika kosong/gagal → Gemini AI dengan narasi lengkap
 * 3. Jika Gemini juga gagal → Fallback generator pasal terstruktur
 *
 * @param {string} searchQuery - Query kata kunci
 * @param {string} narasiKasus - Narasi kasus lengkap (untuk Gemini fallback)
 * @param {string[]} categories - Daftar kategori tindak pidana (opsional)
 * @param {string} spesialisasi - Spesialisasi unit
 * @returns {object[]} Array referensi hukum
 */
async function searchLegalArticles(searchQuery, narasiKasus = '', categories = [], spesialisasi = 'lantas') {
  console.log(`[PASAL] Mencari referensi hukum untuk: "${searchQuery.substring(0, 80)}"`);

  // Langkah 1: Coba Pasal.id REST API (Query Lengkap)
  let results = await fetchFromPasalId(searchQuery);
  if (results && results.length > 0) return results;

  // Langkah 2: Fallback langsung ke Gemini AI
  if (narasiKasus && narasiKasus.length >= 20) {
    try {
      console.log('[PASAL] Memanggil Gemini AI fallback untuk ekstrak pasal hukum...');
      results = await generateLegalRefsWithGemini(narasiKasus);
      if (results && results.length > 0) return results;
    } catch (e) {
      console.warn('[PASAL] Gemini AI fallback pasal error:', e.message);
    }
  }

  // Langkah 3: Smart Fallback Generator (100% selalu ada hasil)
  console.log('[PASAL] Menggunakan Fallback Engine Referensi Hukum...');
  return generateFallbackLegalRefs(narasiKasus, spesialisasi);
}

module.exports = { searchLegalArticles, generateFallbackLegalRefs };
