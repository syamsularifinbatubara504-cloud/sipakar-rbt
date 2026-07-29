/**
 * Gemini AI Service
 * Generasi skenario Reality-Based Training (RBT) menggunakan Google Gemini
 *
 * TIDAK ADA mock hardcoded — semua output dihasilkan oleh AI berdasarkan input nyata.
 * Jika Gemini tidak tersedia, akan throw error agar status simulasi menjadi 'failed'
 * dan user mendapat pesan error yang jelas (bukan data fiktif yang menyesatkan).
 */
const { getModel, tryFallbackModel, getActiveModel } = require('../config/gemini');

// ============================================================
// JSON EXTRACTION HELPER
// ============================================================

/**
 * Ekstrak JSON secara robust dari teks respons Gemini.
 * Menangani: markdown code blocks, teks sebelum/sesudah JSON, karakter escape.
 */
function extractJSON(text) {
  // 1. Hapus markdown code blocks (```json ... ``` atau ``` ... ```)
  let cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // 2. Cari JSON object paling luar (dari { pertama sampai } terakhir)
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error(`Tidak ada JSON object yang valid. Teks respons (100 char pertama): "${cleaned.substring(0, 100)}"`);
  }

  const jsonStr = cleaned.substring(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(jsonStr);
  } catch (parseErr) {
    // Coba perbaiki JSON yang umum rusak: trailing comma, single quote
    const fixedJson = jsonStr
      .replace(/,\s*([}\]])/g, '$1')   // hapus trailing comma
      .replace(/:\s*'([^']*)'/g, ': "$1"');  // ubah single quote ke double quote
    return JSON.parse(fixedJson);
  }
}

// ============================================================
// PROMPT BUILDER
// ============================================================

/**
 * Bangun prompt yang sangat spesifik untuk Gemini AI
 * agar output mencerminkan kasus yang diberikan, bukan skenario generik
 *
 * @param {string} narasiKasus
 * @param {object[]} legalReferences
 * @param {string} spesialisasi
 * @param {string} [language='id'] - 'id' (Bahasa Indonesia) | 'en' (English)
 */
function buildRBTPrompt(narasiKasus, legalReferences, spesialisasi, language = 'id') {
  const spesialisasiLabel = {
    sabhara:      'Sabhara (Samapta Bhayangkara) — Penanganan Ketertiban Umum, Pengamanan, SAR, dan Penguraian Massa',
    reserse:      'Reserse (Kriminal) — Penyelidikan dan Penyidikan Tindak Pidana',
    intel:        'Intelijen Keamanan (Intelkam) — Deteksi Dini, Analisis Potensi Gangguan, dan Produk Intelijen',
    lantas:       'Lalu Lintas (Lantas) — Keamanan, Keselamatan, Ketertiban, dan Kelancaran Lalu Lintas',
    binmas:       'Pembinaan Masyarakat (Binmas) — Pemolisian Komunitas, Mediasi, dan Penyuluhan Masyarakat',
  }[spesialisasi] || spesialisasi.toUpperCase();

  // Language directive — injected as first line so Gemini treats it as a system-level rule
  const languageDirective = language === 'en'
    ? `⚠️  CRITICAL LANGUAGE INSTRUCTION: You MUST write ALL values in the JSON response in ENGLISH. ` +
      `This includes: judul, ringkasan, tujuan_pelatihan, peralatan, all fase names, all aktivitas entries, ` +
      `all kriteria names and deskripsi, and durasi_estimasi. ` +
      `Do NOT use Bahasa Indonesia in any value field. JSON key names must remain exactly as specified in the schema. ` +
      `The output language is: ENGLISH (EN).\n\n`
    : `INSTRUKSI BAHASA: Tulis semua nilai dalam JSON dalam Bahasa Indonesia yang profesional dan formal.\n\n`;

  let pasalSection;
  if (legalReferences.length > 0) {
    pasalSection = legalReferences.map((ref, i) => {
      const nomor  = ref.pasal || ref.pasal_number || `Pasal ${i + 1}`;
      const uu     = ref.undangUndang || ref.undang_undang || '-';
      const desk   = ref.deskripsi || '-';
      const ancam  = ref.ancamanPidana || ref.ancaman_pidana || 'Sesuai ketentuan UU';
      return `${i + 1}. ${nomor}\n   Dasar Hukum: ${uu}\n   Isi/Relevansi: ${desk}\n   Ancaman Pidana: ${ancam}`;
    }).join('\n\n');
  } else {
    pasalSection = '[Tidak ada referensi pasal spesifik — identifikasi sendiri pasal yang relevan berdasarkan kasus]';
  }

  return `${languageDirective}Anda adalah instruktur senior Sekolah Polisi Negara (SPN) Polda Sumatera Utara, berpengalaman lebih dari 20 tahun merancang program Reality-Based Training (RBT) untuk anggota Polri program Prolat (Pendidikan Pengembangan Spesialisasi).

╔══════════════════════════════════════════
║  INFORMASI KASUS YANG HARUS DISIMULASIKAN
╚══════════════════════════════════════════

UNIT SPESIALISASI TARGET: ${spesialisasiLabel}

NARASI KASUS NYATA (ini adalah kasus yang harus dijadikan skenario):
─────────────────────────────────────────
${narasiKasus}
─────────────────────────────────────────

PASAL HUKUM YANG BERLAKU DALAM KASUS INI:
${pasalSection}

╔══════════════════════════════════════════
║  INSTRUKSI PEMBUATAN SKENARIO RBT
╚══════════════════════════════════════════

Buat skenario simulasi RBT yang SANGAT SPESIFIK untuk melatih anggota ${spesialisasiLabel} menangani kasus di atas.

PERSYARATAN WAJIB (CRITICAL — jika dilanggar skenario tidak valid):
✦ Judul dan ringkasan HARUS mencerminkan detail spesifik kasus ini (menyebut jenis kejadian, lokasi jika disebut, dll.)
✦ Setiap aktivitas dalam setiap fase HARUS relevan dengan jenis kasus yang dinarasikan
✦ Referensi ke pasal hukum di atas HARUS muncul dalam langkah-langkah penyidikan/penanganan
✦ Peralatan yang dibutuhkan HARUS sesuai dengan jenis kasus dan unit spesialisasi
✦ Prosedur HARUS mengikuti SOP Polri untuk unit ${spesialisasiLabel}
✦ Tingkat kesulitan ditentukan berdasarkan kompleksitas kasus yang dinarasikan
✦ JANGAN membuat skenario generik — setiap detail harus mencerminkan kasus ini
─────────
REFERENSI FORMAT KASUS (Gunakan gaya bahasa profesional seperti contoh di bawah ini):

${spesialisasi === 'sabhara' ? 'Contoh Sabhara: Pada hari Selasa, 10 Maret 2026, di kawasan pemukiman padat... pecah aksi tawuran massal... Personel Satuan Sabhara segera membentuk formasi sekat berlapis...' : ''}
${spesialisasi === 'reserse' ? 'Contoh Reserse: Terjadi tindak pidana pencurian dengan pemberatan di sebuah toko emas... Unit Reserse melakukan olah TKP, mengumpulkan barang bukti, dan pengejaran pelaku...' : ''}
${spesialisasi === 'intel' ? 'Contoh Intel: Deteksi dini terhadap rencana unjuk rasa besar-besaran... Unit Intelkam melakukan penggalangan tokoh masyarakat dan pemetaan potensi anarkis...' : ''}
${spesialisasi === 'lantas' ? 'Contoh Lantas: Pengamanan darurat armada pemadam kebakaran terjebak kemacetan parah... Unit Turjawali Satlantas segera mengambil alih situasi dengan melakukan diskresi kepolisian...' : ''}
${spesialisasi === 'binmas' ? 'Contoh Binmas: Mediasi dan pembinaan remaja terlibat tawuran... Petugas Bhabinkamtibmas dan anggota Satbinmas segera tiba di lokasi untuk menenangkan kerumunan massa...' : ''}
─────────

FORMAT OUTPUT:
Respons HANYA berisi JSON valid. Mulai dengan karakter { dan akhiri dengan karakter }. TIDAK BOLEH ada teks, penjelasan, komentar, atau markdown di luar JSON.

{
  "skenario_rbt": {
    "judul": "[Judul spesifik yang mencerminkan jenis dan konteks kasus ini, bukan judul generik]",
    "ringkasan": "[Ringkasan 3-4 kalimat yang mendeskripsikan skenario simulasi spesifik ini: apa yang terjadi, di mana, siapa yang terlibat, dan apa yang akan dilatihkan]"
  },
  "tujuan_pelatihan": "[Minimal 5 tujuan pelatihan yang relevan dengan kasus dan unit ini, dalam format bernomor: 1. ... 2. ... dst.]",
  "peralatan": "[Daftar peralatan spesifik yang dibutuhkan simulasi ini, pisahkan dengan koma, relevan dengan jenis kasus]",
  "langkah_langkah": [
    {
      "fase": "[Nama fase yang spesifik dan bermakna untuk kasus ini, misal: 'Fase 1: Penerimaan Laporan & Verifikasi Identitas Pelaku']",
      "durasi": "[Estimasi durasi realistis, misal: '15 menit']",
      "aktivitas": [
        "[Aktivitas konkret dan spesifik 1 — sesuai kasus ini]",
        "[Aktivitas konkret dan spesifik 2 — sesuai kasus ini]",
        "[Aktivitas konkret dan spesifik 3 — sesuai kasus ini]",
        "[Aktivitas konkret dan spesifik 4 — sesuai kasus ini]"
      ]
    }
  ],
  "evaluasi_kriteria": [
    {
      "kriteria": "[Nama kriteria penilaian yang relevan dengan kasus ini]",
      "bobot": 20,
      "deskripsi": "[Cara menilai kriteria ini dalam konteks kasus spesifik ini]"
    }
  ],
  "durasi_estimasi": "[Total estimasi durasi seluruh simulasi, misal: '90 menit (1 jam 30 menit)']",
  "tingkat_kesulitan": "[dasar/menengah/lanjutan — sesuai kompleksitas kasus]"
}`;
}

// ============================================================
// MAIN FUNCTION
// ============================================================

/**
 * Generate skenario RBT menggunakan Gemini AI
 *
 * @param {string} narasiKasus - Narasi kasus lengkap dari user
 * @param {object[]} legalReferences - Referensi hukum (dari Pasal.id atau Gemini fallback)
 * @param {string} spesialisasi - Unit spesialisasi (reskrim/brimob/lantas/binmas/samapta)
 * @param {string} [language='id'] - Language for AI output ('id' | 'en')
 * @returns {object} Skenario RBT terstruktur
 * @throws {Error} Jika Gemini tidak tersedia atau gagal menghasilkan respons
 */
async function generateRBTScenario(narasiKasus, legalReferences, spesialisasi, language = 'id') {
  const model = getModel();

  if (!model) {
    console.warn('[GEMINI] ⚠️ Gemini API key tidak dikonfigurasi / tidak valid. Menggunakan Fallback Skenario RBT.');
    const fallbackData = buildFallbackRBTScenario(narasiKasus, legalReferences, spesialisasi, language);
    return {
      ...fallbackData,
      rawGeminiResponse: 'Fallback RBT Scenario Engine',
    };
  }

  const prompt = buildRBTPrompt(narasiKasus, legalReferences, spesialisasi, language);
  console.log(`[GEMINI] Language mode: ${language.toUpperCase()}`);

  // === PANGGIL GEMINI API (retry untuk 429/quota DAN 503/overload) ===
  let rawText      = '';
  let usedModel    = getActiveModel();
  let lastApiError = null;

  const MAX_RETRIES  = 5;   // Max total percobaan
  const RETRY_DELAY  = [5000, 8000, 12000, 15000, 20000]; // Exponential backoff ms

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const currentModel = attempt === 0 ? model : getModel();
    if (!currentModel) break;

    try {
      console.log(`[GEMINI] Attempt ${attempt + 1}/${MAX_RETRIES} — model: ${getActiveModel()}`);
      const result = await currentModel.generateContent(prompt);
      rawText      = result.response.text();
      usedModel    = getActiveModel();
      lastApiError = null;
      console.log(`[GEMINI] ✅ Respons diterima (${rawText.length} karakter) via ${usedModel}`);
      break; // Sukses, keluar dari loop

    } catch (apiErr) {
      lastApiError = apiErr;
      const msg = apiErr.message || '';

      const isQuotaError   = msg.includes('429') || msg.includes('quota') || msg.includes('Too Many Requests');
      const isOverloadError = msg.includes('503') || msg.includes('Service Unavailable') || msg.includes('high demand') || msg.includes('overloaded');
      const isRetriable    = isQuotaError || isOverloadError;

      if (isRetriable && attempt < MAX_RETRIES - 1) {
        const delay = RETRY_DELAY[attempt] || 15000;

        if (isQuotaError) {
          // Quota habis — pindah ke model berikutnya
          console.warn(`[GEMINI] ⚠️ Quota habis untuk ${getActiveModel()}, fallback model...`);
          const fallback = tryFallbackModel(getActiveModel());
          if (!fallback) {
            console.error('[GEMINI] Semua fallback model habis.');
            break;
          }
        } else {
          // 503 overload — retry model yang sama setelah delay
          console.warn(`[GEMINI] ⏳ Model ${getActiveModel()} overloaded (503), retry dalam ${delay/1000}s...`);
        }

        await new Promise(resolve => setTimeout(resolve, delay));

      } else {
        console.error(`[GEMINI] ❌ Gagal setelah ${attempt + 1} percobaan:`, msg.substring(0, 150));
        break;
      }
    }
  }

  if (!rawText && lastApiError) {
    console.warn(`[GEMINI] ⚠️ Gemini API error (${lastApiError.message}). Menggunakan Fallback Skenario RBT.`);
    const fallbackData = buildFallbackRBTScenario(narasiKasus, legalReferences, spesialisasi, language);
    return {
      ...fallbackData,
      rawGeminiResponse: `Fallback Engine: ${lastApiError.message}`,
    };
  }

  // === PARSE JSON ===
  let parsedScenario;
  try {
    parsedScenario = extractJSON(rawText);
    console.log('[GEMINI] ✅ JSON berhasil diparsing pada percobaan pertama');
  } catch (parseErr) {
    // === PERCOBAAN KEDUA (RETRY) jika JSON rusak ===
    console.warn(`[GEMINI] ⚠️  Parse pertama gagal (${parseErr.message}). Mencoba retry...`);

    const retryPrompt = buildRBTPrompt(narasiKasus, legalReferences, spesialisasi, language) +
      '\n\nPERINGATAN KRITIS: Respons sebelumnya BUKAN JSON valid. ' +
      'Respons HANYA boleh berisi karakter JSON. ' +
      'Mulai LANGSUNG dengan karakter { dan akhiri dengan }. ' +
      'Tidak boleh ada satu karakter pun di luar JSON.';

    try {
      console.log('[GEMINI] Mengirim retry prompt...');
      const retryResult = await model.generateContent(retryPrompt);
      rawText = retryResult.response.text();
      parsedScenario = extractJSON(rawText);
      console.log('[GEMINI] ✅ JSON berhasil diparsing pada percobaan kedua (retry)');
    } catch (retryErr) {
      // === FALLBACK TERAKHIR: Bangun struktur minimal dari raw text ===
      console.error('[GEMINI] ❌ Retry juga gagal:', retryErr.message);
      console.warn('[GEMINI] Membangun struktur minimal dari raw text...');

      // Coba ambil teks bermakna dari respons untuk ditampilkan
      const meaningfulText = rawText.length > 50 ? rawText : 'Respons AI tidak valid.';
      parsedScenario = {
        skenario_rbt: {
          judul: `Simulasi RBT — ${spesialisasi.toUpperCase()}: ${narasiKasus.substring(0, 60).trim()}...`,
          ringkasan: `Skenario simulasi berdasarkan kasus: ${narasiKasus.substring(0, 300).trim()}`,
        },
        tujuan_pelatihan: 'Melatih peserta menangani kasus sesuai narasi yang diberikan berdasarkan SOP Polri.',
        peralatan: 'Sesuai kebutuhan simulasi dan unit spesialisasi.',
        langkah_langkah: [
          {
            fase: 'Lihat Respons AI Mentah',
            durasi: '-',
            aktivitas: [meaningfulText.substring(0, 500)],
          }
        ],
        evaluasi_kriteria: [
          { kriteria: 'Ketepatan Prosedur', bobot: 100, deskripsi: 'Sesuai SOP unit spesialisasi.' }
        ],
        durasi_estimasi: '-',
        tingkat_kesulitan: 'menengah',
        _parseWarning: 'JSON tidak bisa diparsing dari respons Gemini. Tampilan mungkin tidak sempurna.',
      };
    }
  }

  // === VALIDASI & NORMALISASI FIELD ===
  if (!parsedScenario.skenario_rbt || typeof parsedScenario.skenario_rbt !== 'object') {
    parsedScenario.skenario_rbt = { judul: '', ringkasan: '' };
  }
  if (!Array.isArray(parsedScenario.langkah_langkah)) {
    parsedScenario.langkah_langkah = [];
  }
  if (!Array.isArray(parsedScenario.evaluasi_kriteria)) {
    parsedScenario.evaluasi_kriteria = [];
  }
  if (!['dasar', 'menengah', 'lanjutan'].includes(parsedScenario.tingkat_kesulitan)) {
    parsedScenario.tingkat_kesulitan = 'menengah';
  }

  return {
    ...parsedScenario,
    rawGeminiResponse: rawText,
  };
}

/**
 * Menerjemahkan data simulasi lengkap (judul, narasi, pasal, skenario) ke bahasa target via Gemini AI
 *
 * @param {object} simulationData - Data lengkap simulasi
 * @param {string} targetLanguage - 'id' | 'en'
 * @returns {object} Data terjemahan
 */
async function translateSimulationData(simulationData, targetLanguage) {
  const model = getModel();
  if (!model) {
    throw new Error('Gemini AI belum dikonfigurasi.');
  }

  const targetLabel = targetLanguage === 'en' ? 'ENGLISH (EN)' : 'BAHASA INDONESIA (ID)';

  // Parsing JSON fields secara aman
  let keywords = simulationData.kata_kunci || [];
  if (typeof keywords === 'string') {
    try { keywords = JSON.parse(keywords); } catch (e) {}
  }
  
  let steps = [];
  if (simulationData.result?.langkah_langkah) {
    try {
      steps = typeof simulationData.result.langkah_langkah === 'string' 
        ? JSON.parse(simulationData.result.langkah_langkah) 
        : simulationData.result.langkah_langkah;
    } catch (e) {}
  }

  let criteria = [];
  if (simulationData.result?.evaluasi_kriteria) {
    try {
      criteria = typeof simulationData.result.evaluasi_kriteria === 'string' 
        ? JSON.parse(simulationData.result.evaluasi_kriteria) 
        : simulationData.result.evaluasi_kriteria;
    } catch (e) {}
  }

  let skenarioRbt = { judul: '', ringkasan: '' };
  if (simulationData.result?.skenario_rbt) {
    try {
      skenarioRbt = typeof simulationData.result.skenario_rbt === 'string' 
        ? JSON.parse(simulationData.result.skenario_rbt) 
        : simulationData.result.skenario_rbt;
    } catch (e) {}
  }

  const cleanInput = {
    judul: simulationData.judul,
    narasi_kasus: simulationData.narasi_kasus,
    kata_kunci: keywords,
    legalReferences: (simulationData.legalReferences || []).map(ref => ({
      pasal_number: ref.pasal_number || ref.pasal || '',
      undang_undang: ref.undang_undang || ref.undangUndang || '',
      deskripsi: ref.deskripsi || '',
      ancaman_pidana: ref.ancaman_pidana || ref.ancamanPidana || ''
    })),
    result: simulationData.result ? {
      skenario_rbt: skenarioRbt,
      tujuan_pelatihan: simulationData.result.tujuan_pelatihan || '',
      peralatan: simulationData.result.peralatan || '',
      langkah_langkah: steps,
      evaluasi_kriteria: criteria,
      durasi_estimasi: simulationData.result.durasi_estimasi || '',
      tingkat_kesulitan: simulationData.result.tingkat_kesulitan || 'menengah'
    } : null
  };

  const prompt = `You are a professional legal and administrative translator for the Indonesian National Police (Polri).
Translate the following JSON object's text values into ${targetLabel}.

CRITICAL INSTRUCTIONS:
1. Translate ALL human-readable text values to ${targetLabel}. This includes:
   - "judul" and "narasi_kasus"
   - "kata_kunci" (translate each keyword to the natural equivalent in ${targetLabel})
   - In "legalReferences": translate "undang_undang", "deskripsi", "ancaman_pidana". Keep number formats, but translate terms like "Pasal" to "Article" if translating to English.
   - In "result": translate "skenario_rbt.judul", "skenario_rbt.ringkasan", "tujuan_pelatihan" (keep numbered list format like "1. ..."), "peralatan", "durasi_estimasi" (e.g. translate "menit" to "minutes"), and "tingkat_kesulitan" (translate basic/intermediate/advanced or dasar/menengah/lanjutan).
   - In "langkah_langkah": translate the "fase" name and all entries in the "aktivitas" array.
   - In "evaluasi_kriteria": translate "kriteria" and "deskripsi". Keep "bobot" as a number.
2. Maintain all JSON key names exactly as they are. Keep the output strictly in the exact same JSON format.
3. Keep legal and police terminology accurate, formal, and professional.
4. Output ONLY the translated JSON. Start directly with { and end with }. No extra text or markdown formatting.

Input JSON:
${JSON.stringify(cleanInput, null, 2)}`;

  console.log(`[GEMINI] Translating full simulation dataset to ${targetLabel}...`);
  
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = extractJSON(text);
    console.log('[GEMINI] ✅ Translation successfully parsed');
    return parsed;
/**
 * Fallback generator ketika Gemini API key tidak tersedia atau API error/quota habis.
 * Menghasilkan skenario RBT terstruktur yang realistis berdasarkan narasi kasus & spesialisasi.
 */
function buildFallbackRBTScenario(narasiKasus, legalReferences = [], spesialisasi = 'lantas', language = 'id') {
  const isEn = language === 'en';
  const unitName = (spesialisasi || 'lantas').toUpperCase();

  const caseSnippet = narasiKasus ? narasiKasus.substring(0, 100).trim() : 'Penanganan Insiden Taktis Lapangan';
  
  const Ref1 = legalReferences[0] ? `Pasal ${legalReferences[0].pasal_number} ${legalReferences[0].undang_undang}` : 'SOP Kepolisian RI & KUHAP';
  const Ref2 = legalReferences[1] ? `Pasal ${legalReferences[1].pasal_number} ${legalReferences[1].undang_undang}` : 'Standar TPTKP & Olah TKP SPN';

  return {
    skenario_rbt: {
      judul: isEn ? `RBT Tactical Simulation — Unit ${unitName}` : `Simulasi RBT Taktis — Unit ${unitName}`,
      ringkasan: isEn 
        ? `Tactical simulation scenario for ${unitName} based on incident report: "${caseSnippet}..."`
        : `Skenario simulasi taktis unit ${unitName} berdasarkan laporan insiden: "${caseSnippet}..."`
    },
    tujuan_pelatihan: isEn 
      ? `1. Apply tactical standard operating procedures (SOP) for ${unitName} in high-priority field scenarios\n2. Execute initial scene securing (TPTKP) and legal documentation in compliance with ${Ref1}\n3. Conduct evidence preservation, victim handling, and operational scene control\n4. Draft comprehensive official police report (LP) and tactical action resume`
      : `1. Menerapkan Prosedur Standar Operasional (SOP) taktis unit ${unitName} dalam penanganan insiden lapangan\n2. Melakukan Tindakan Pertama di Tempat Kejadian Perkara (TPTKP) dan sterilisasi lokasi sesuai ${Ref1}\n3. Melaksanakan evakuasi korban, pengamanan barang bukti fisik, serta olah TKP terstruktur\n4. Menyusun Laporan Polisi (LP) dan Resume Hasil Tindakan awal sesuai ${Ref2}`,
    peralatan: isEn 
      ? '1. Police Line & Emergency Traffic Cones\n2. Tactical Field Evidence Kit & Scale Markers\n3. High-Resolution Scene Documentation Camera & TAA Measuring Set\n4. Radio Communication Set (HT) & Tactical First Aid Kit\n5. Operational Vehicle & Official Incident Log Book'
      : '1. Police Line & Cone Pembatas Jalur Darurat\n2. Kit Takstis Olah TKP & Label Penanda Barang Bukti\n3. Kamera Dokumentasi Visual & Alat Ukur Skala TKP (Traffic Accident Analysis)\n4. Perangkat Komunikasi Radio Handy Talkie (HT) & Kotak Pertolongan Pertama\n5. Kendaraan Dinas Operasional & Buku Log Catatan Kejadian Polrestabes/SPN',
    langkah_langkah: isEn ? [
      {
        fase: 'Phase 1: Emergency Response & Initial Scene Control (0-15 Mins)',
        durasi: '15 Menit',
        aktivitas: [
          `Arrive at scene with full team, deploy police line for site perimeter control`,
          `Execute emergency victim evacuation and coordinate with nearest medical/rescue unit`,
          `Establish initial incident command post and set up emergency traffic/crowd detour`
        ],
        dasar_hukum: Ref1
      },
      {
        fase: 'Phase 2: Tactical Scene Investigation & Evidence Securing (15-45 Mins)',
        durasi: '30 Menit',
        aktivitas: [
          `Perform systematic crime/accident scene investigation and photographic documentation`,
          `Mark all physical evidence markers and secure chain of custody log`,
          `Conduct preliminary interviews with key witnesses and involved parties`
        ],
        dasar_hukum: Ref2
      },
      {
        fase: 'Phase 3: Scene Debrief & Official Documentation (45-90 Mins)',
        durasi: '45 Menit',
        aktivitas: [
          `Secure and transport evidence to precinct command under strict chain of custody`,
          `Conduct tactical team debriefing led by commanding officer`,
          `Compile formal Police Report (LP) and submit incident resume to command`
        ],
        dasar_hukum: 'Standard Police Incident Reporting Regulations'
      }
    ] : [
      {
        fase: 'Fase 1: Tanggap Darurat & TPTKP (0-15 Menit)',
        durasi: '15 Menit',
        aktivitas: [
          `Tiba di lokasi insiden bersama tim gabungan, pasang Police Line untuk sterilisasi TKP`,
          `Lakukan evakuasi darurat korban dan koordinasikan penanganan bersama tim medis/SAR`,
          `Bentuk posko komando lapangan awal dan terapkan rekayasa lalu lintas/jalur darurat`
        ],
        dasar_hukum: Ref1
      },
      {
        fase: 'Fase 2: Olah TKP & Pengamanan Barang Bukti (15-45 Menit)',
        durasi: '30 Menit',
        aktivitas: [
          `Melakukan olah TKP secara sistematis dan dokumentasi foto/video bukti fisik`,
          `Memasang penanda nomor barang bukti serta mencatat registrasi rantai komando bukti`,
          `Melakukan wawancara singkat saksi kunci di lokasi dan identifikasi pihak terlibat`
        ],
        dasar_hukum: Ref2
      },
      {
        fase: 'Fase 3: Konsolidasi & Pembuatan Laporan Resmi (45-90 Menit)',
        durasi: '45 Menit',
        aktivitas: [
          `Pengamanan & pemindahan barang bukti ke Mako Polrestabes/SPN secara sah`,
          `Pelaksanaan debriefing taktis perwira pengendali bersama seluruh personel`,
          `Penyusunan resume Berita Acara / Laporan Polisi (LP) untuk diteruskan ke pimpinan`
        ],
        dasar_hukum: 'Perkap No. 6 Tahun 2019 / SOP Operasional SPN'
      }
    ],
    evaluasi_kriteria: isEn ? [
      { kriteria: 'Initial Response Speed & Perimeter Security', bobot: 25, deskripsi: 'Punctual arrival and effectiveness of initial TPTKP site isolation' },
      { kriteria: 'Evidence Chain of Custody', bobot: 25, deskripsi: 'Precision in physical evidence marking and legal protection handling' },
      { kriteria: 'Legal Basis & SOP Adherence', bobot: 25, deskripsi: 'Compliance of field tactical decisions with active statutory articles' },
      { kriteria: 'Documentation & Official Reporting Accuracy', bobot: 25, deskripsi: 'Clarity, accuracy, and thoroughness of official incident report' }
    ] : [
      { kriteria: 'Kecepatan & Ketepatan TPTKP', bobot: 25, deskripsi: 'Respon tepat waktu dan sterilisasi awal tempat kejadian perkara' },
      { kriteria: 'Prosedur Pengamanan Barang Bukti', bobot: 25, deskripsi: 'Penandaan dan perlindungan bukti fisik sesuai standar legalitas' },
      { kriteria: 'Penerapan Dasar Hukum & SOP', bobot: 25, deskripsi: 'Kepatuhan tindakan taktis lapangan terhadap pasal undang-undang yang berlaku' },
      { kriteria: 'Ketelitian Dokumentasi & Pelaporan', bobot: 25, deskripsi: 'Keakuratan penulisan berita acara dan resume hasil tindakan' }
    ],
    durasi_estimasi: isEn ? '90 Minutes (1 Hour 30 Mins)' : '90 Menit (1 Jam 30 Menit)',
    tingkat_kesulitan: 'menengah'
  };
}

module.exports = { generateRBTScenario, translateSimulationData, buildFallbackRBTScenario };

