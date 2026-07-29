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
// ============================================================

/**
 * Cari/generate referensi hukum yang relevan dengan kasus
 *
 * Strategi:
 * 1. Coba Pasal.id API dengan searchQuery
 * 2. Jika kosong/gagal → Gemini AI dengan narasi lengkap
 * 3. Jika Gemini juga gagal → kembalikan array kosong (Gemini skenario RBT akan handle tanpa pasal spesifik)
 *
 * @param {string} searchQuery - Query kata kunci
 * @param {string} narasiKasus - Narasi kasus lengkap (untuk Gemini fallback)
 * @param {string[]} categories - Daftar kategori tindak pidana (opsional)
 * @returns {object[]} Array referensi hukum
 */
async function searchLegalArticles(searchQuery, narasiKasus = '', categories = []) {
  console.log(`[PASAL] Mencari referensi hukum untuk: "${searchQuery.substring(0, 80)}"`);

  // Langkah 1: Coba Pasal.id REST API (Query Lengkap)
  let results = await fetchFromPasalId(searchQuery);
  if (results.length > 0) return results;

  // Langkah 2: Fallback langsung ke Gemini AI (Super Cepat & Akurat)
  if (narasiKasus && narasiKasus.length >= 20) {
    console.log('[PASAL] Memanggil Gemini AI fallback untuk ekstrak pasal hukum...');
    results = await generateLegalRefsWithGemini(narasiKasus);
    if (results.length > 0) return results;
  }

  // Langkah 4: Tidak ada hasil (Kembalikan kosong)
  console.warn('[PASAL] Tidak ada referensi hukum yang berhasil ditemukan.');
  return [];
}

module.exports = { searchLegalArticles };
