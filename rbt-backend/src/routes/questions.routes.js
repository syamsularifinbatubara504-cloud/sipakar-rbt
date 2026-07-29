const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { pool } = require('../config/db');

// Multer memory storage for Excel parsing
const uploadMemory = multer({ storage: multer.memoryStorage() });

// PUBLIC ROUTE: GET /api/questions/template-excel — Download file template Excel soal (.xlsx)
router.get('/template-excel', (req, res) => {
  try {
    const templateData = [
      {
        'Soal': 'Apa tindakan pertama petugas saat mendatangi TKP (Tempat Kejadian Perkara)?',
        'Spesialisasi': 'reserse',
        'Poin': 15,
        'Opsi A': 'Menutup dan mengamankan TKP dengan Police Line',
        'Opsi B': 'Langsung memindahkan barang bukti ke kantor',
        'Opsi C': 'Menghubungi wartawan media massa',
        'Opsi D': 'Meninggalkan lokasi dan menunggu atasan',
        'Jawaban Benar': 'A'
      },
      {
        'Soal': 'Apa fungsi utama Satuan Sabhara Polri dalam menjaga ketertiban umum?',
        'Spesialisasi': 'sabhara',
        'Poin': 10,
        'Opsi A': 'Pengaturan, Penjagaan, Pengawalan, dan Patroli (Turjavali)',
        'Opsi B': 'Penyidikan tindak pidana korupsi',
        'Opsi C': 'Pengumpulan bahan keterangan intelijen',
        'Opsi D': 'Penyuluhan hukum masyarakat',
        'Jawaban Benar': 'A'
      },
      {
        'Soal': 'Apa kewajiban pengemudi kendaraan bermotor saat mendekati perlintasan sebidang kereta api?',
        'Spesialisasi': 'lantas',
        'Poin': 10,
        'Opsi A': 'Mendahulukan kereta api dan berhenti bila sinyal berbunyi',
        'Opsi B': 'Memacu kecepatan agar mendahului kereta api',
        'Opsi C': 'Membunyikan klakson panjang tanpa berhenti',
        'Opsi D': 'Mengabaikan palang pintu jika sepi',
        'Jawaban Benar': 'A'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Soal');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Template_Soal_SIPAKAR_SPN.xlsx"');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal membuat template Excel.' });
  }
});

// Authenticated routes below
router.use(authenticateToken);

// GET /api/questions — List semua soal
router.get('/', async (req, res, next) => {
  try {
    const [questions] = await pool.execute(
      `SELECT q.*, u.name AS gadik_name 
       FROM questions q 
       LEFT JOIN users u ON q.gadik_id = u.id 
       ORDER BY q.created_at DESC`
    );
    res.json({ success: true, data: questions });
  } catch (err) {
    next(err);
  }
});

// POST /api/questions — Buat soal baru (gadik / manajemen)
router.post('/', requireRole('gadik', 'manajemen'), async (req, res, next) => {
  try {
    const { soal, unit_spesialisasi, tingkat_kesulitan, poin, opsi_jawaban, jawaban_benar } = req.body;
    if (!soal || !unit_spesialisasi) {
      return res.status(400).json({ success: false, message: 'Soal dan unit spesialisasi wajib diisi.' });
    }
    const opsiStr = typeof opsi_jawaban === 'string' ? opsi_jawaban : JSON.stringify(opsi_jawaban || []);
    const initialStatus = 'approved';
    const numPoin = parseInt(poin) || 10;

    const [result] = await pool.execute(
      `INSERT INTO questions (gadik_id, soal, unit_spesialisasi, tingkat_kesulitan, poin, opsi_jawaban, jawaban_benar, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.userId, soal, unit_spesialisasi, tingkat_kesulitan || 'sedang', numPoin, opsiStr, jawaban_benar || 0, initialStatus]
    );
    res.json({ success: true, message: 'Soal berhasil dibuat.', data: { id: result.insertId } });
  } catch (err) {
    next(err);
  }
});

// POST /api/questions/batch — Input Batch Soal (JSON Array)
router.post('/batch', requireRole('gadik', 'manajemen'), async (req, res, next) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'Array questions wajib diisi dan tidak boleh kosong.' });
    }

    let insertedCount = 0;
    const initialStatus = 'approved';

    for (const q of questions) {
      if (!q.soal || !q.unit_spesialisasi) continue;
      const opsiStr = typeof q.opsi_jawaban === 'string' ? q.opsi_jawaban : JSON.stringify(q.opsi_jawaban || []);
      const numPoin = parseInt(q.poin) || 10;
      await pool.execute(
        `INSERT INTO questions (gadik_id, soal, unit_spesialisasi, tingkat_kesulitan, poin, opsi_jawaban, jawaban_benar, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.user.userId, q.soal, q.unit_spesialisasi, q.tingkat_kesulitan || 'sedang', numPoin, opsiStr, q.jawaban_benar || 0, initialStatus]
      );
      insertedCount++;
    }

    res.json({
      success: true,
      message: `Berhasil mengimpor ${insertedCount} soal.`,
      count: insertedCount
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/questions/upload-excel — Input Batch Soal via File Excel (.xlsx / .xls)
router.post('/upload-excel', requireRole('gadik', 'manajemen'), uploadMemory.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File Excel wajib diunggah.' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!sheetData || sheetData.length === 0) {
      return res.status(400).json({ success: false, message: 'Lembar kerja Excel kosong atau tidak dapat dibaca.' });
    }

    let insertedCount = 0;
    const initialStatus = 'approved';

    for (const row of sheetData) {
      // Flexibly find column names
      const soal = row['Soal'] || row['soal'] || row['Pertanyaan'] || row['pertanyaan'];
      const spec = (row['Spesialisasi'] || row['spesialisasi'] || row['unit_spesialisasi'] || 'reserse').toString().toLowerCase();
      const diff = 'sedang';
      const poin = parseInt(row['Poin'] || row['poin'] || row['Poin Soal'] || 10) || 10;

      if (!soal) continue;

      // Extract options
      let opsiArray = [];
      if (row['Opsi A'] !== undefined) opsiArray.push(`A. ${row['Opsi A']}`);
      if (row['Opsi B'] !== undefined) opsiArray.push(`B. ${row['Opsi B']}`);
      if (row['Opsi C'] !== undefined) opsiArray.push(`C. ${row['Opsi C']}`);
      if (row['Opsi D'] !== undefined) opsiArray.push(`D. ${row['Opsi D']}`);

      if (opsiArray.length === 0 && row['opsi_jawaban']) {
        if (Array.isArray(row['opsi_jawaban'])) opsiArray = row['opsi_jawaban'];
        else opsiArray = row['opsi_jawaban'].toString().split('\n').filter((l) => l.trim());
      }

      // Convert letter answer (A/B/C/D) to index (0/1/2/3)
      let jawabanBenar = 0;
      const rawAns = (row['Jawaban Benar'] || row['jawaban_benar'] || row['Jawaban'] || 0).toString().trim().toUpperCase();
      if (rawAns === 'A') jawabanBenar = 0;
      else if (rawAns === 'B') jawabanBenar = 1;
      else if (rawAns === 'C') jawabanBenar = 2;
      else if (rawAns === 'D') jawabanBenar = 3;
      else if (!isNaN(parseInt(rawAns))) jawabanBenar = parseInt(rawAns);

      const opsiStr = JSON.stringify(opsiArray);

      await pool.execute(
        `INSERT INTO questions (gadik_id, soal, unit_spesialisasi, tingkat_kesulitan, poin, opsi_jawaban, jawaban_benar, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.user.userId, soal, spec, diff, poin, opsiStr, jawabanBenar, initialStatus]
      );
      insertedCount++;
    }

    res.json({
      success: true,
      message: `Berhasil mengimpor ${insertedCount} soal dari Excel!`,
      count: insertedCount
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/questions/:id/approve — Approve soal (manajemen only)
router.put('/:id/approve', requireRole('manajemen'), async (req, res, next) => {
  try {
    await pool.execute(
      `UPDATE questions SET status='approved', approved_by=? WHERE id=?`,
      [req.user.userId, req.params.id]
    );
    res.json({ success: true, message: 'Soal berhasil disetujui.' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/questions/:id — Hapus soal
router.delete('/:id', async (req, res, next) => {
  try {
    await pool.execute('DELETE FROM questions WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Soal berhasil dihapus.' });
  } catch (err) {
    next(err);
  }
});
// POST /api/questions/generate-ai — Generate soal otomatis via Gemini AI (berdasarkan Pasal & Simulasi)
router.post('/generate-ai', requireRole('gadik', 'manajemen'), async (req, res, next) => {
  try {
    const { spesialisasi, jumlahSoal, topik } = req.body;
    const count = parseInt(jumlahSoal) || 5;
    const spec = spesialisasi || 'reserse';

    if (count < 1 || count > 20) {
      return res.status(400).json({ success: false, message: 'Jumlah soal harus antara 1 dan 20.' });
    }

    // Build Gemini AI prompt
    const specLabels = {
      reserse: 'Reserse (Penyidikan Tindak Pidana)',
      sabhara: 'Sabhara (Pengaturan, Penjagaan, Pengawalan, Patroli)',
      intel: 'Intelkam (Intelijen Keamanan)',
      lantas: 'Lalu Lintas (Polisi Lantas)',
      binmas: 'Binmas (Pembinaan Masyarakat)'
    };
    const specLabel = specLabels[spec] || spec;
    const topikContext = topik && topik.trim().length > 5
      ? `\n\nKonteks/Topik Spesifik: "${topik.trim()}"`
      : '';

    const prompt = `Anda adalah pakar hukum kepolisian Indonesia dan instruktur profesional Sekolah Polisi Negara (SPN) Polda Sumatera Utara.

Buatkan ${count} soal ujian pilihan ganda (A, B, C, D) berkualitas tinggi untuk bidang spesialisasi: **${specLabel}**.

Soal-soal HARUS berbasis pada:
1. **Pasal-pasal hukum yang berlaku** di Indonesia (KUHP, KUHAP, UU Polri No. 2/2002, UU Lalu Lintas No. 22/2009, Perkap, dll.)
2. **Simulasi kasus/skenario operasional** yang realistis di lapangan
3. **Prosedur tetap (Protap/SOP)** kepolisian yang sesuai spesialisasi

Setiap soal harus mencantumkan referensi pasal atau undang-undang yang relevan di dalam soalnya atau opsi jawabannya.${topikContext}

Format output WAJIB berupa JSON valid:
{
  "questions": [
    {
      "soal": "Pertanyaan soal lengkap...",
      "opsi_a": "Teks jawaban pilihan A",
      "opsi_b": "Teks jawaban pilihan B",
      "opsi_c": "Teks jawaban pilihan C",
      "opsi_d": "Teks jawaban pilihan D",
      "jawaban_benar": "A",
      "poin": 10,
      "penjelasan": "Penjelasan singkat kenapa jawaban tersebut benar beserta referensi pasal"
    }
  ]
}

Pastikan:
- Soal bervariasi (narasi kasus, teori hukum, prosedur, analisis situasi)
- Jawaban salah (distraktor) tetap masuk akal dan tidak terlalu jelas
- Distribusikan jawaban benar merata antara A, B, C, D
- Poin bernilai 10-20
- HANYA kembalikan JSON, tanpa teks lain`;

    console.log(`[AI-SOAL] Generating ${count} questions for ${spec}...`);

    const { getModel, tryFallbackModel, getActiveModel } = require('../config/gemini');
    let model = getModel();
    if (!model) {
      return res.status(503).json({ success: false, message: 'Gemini AI tidak tersedia saat ini. Periksa API Key.' });
    }

    let result;
    try {
      result = await model.generateContent(prompt);
    } catch (err) {
      console.warn(`[AI-SOAL] Primary model failed (${err.message}), trying fallback...`);
      model = tryFallbackModel(getActiveModel());
      if (!model) throw err;
      result = await model.generateContent(prompt);
    }

    const text = result.response.text();

    // Extract JSON from response
    let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace <= firstBrace) {
      return res.status(500).json({ success: false, message: 'AI tidak mengembalikan format JSON yang valid.' });
    }
    const jsonStr = cleaned.substring(firstBrace, lastBrace + 1);
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      const fixed = jsonStr.replace(/,\s*([}\]])/g, '$1').replace(/:\s*'([^']*)'/g, ': "$1"');
      parsed = JSON.parse(fixed);
    }

    const generatedQuestions = parsed.questions || [];
    console.log(`[AI-SOAL] Generated ${generatedQuestions.length} questions successfully`);

    // Format for frontend consumption
    const formattedQuestions = generatedQuestions.map((q, idx) => {
      const ansMap = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
      const jawaban = ansMap[(q.jawaban_benar || 'A').toString().trim().toUpperCase()] ?? 0;

      return {
        soal: q.soal || `Soal ${idx + 1}`,
        unit_spesialisasi: spec,
        poin: parseInt(q.poin) || 10,
        opsi_jawaban: [
          `A. ${q.opsi_a || ''}`,
          `B. ${q.opsi_b || ''}`,
          `C. ${q.opsi_c || ''}`,
          `D. ${q.opsi_d || ''}`
        ],
        jawaban_benar: jawaban,
        penjelasan: q.penjelasan || ''
      };
    });

    return res.status(200).json({
      success: true,
      message: `Berhasil men-generate ${formattedQuestions.length} soal AI untuk ${specLabel}.`,
      data: formattedQuestions
    });
  } catch (err) {
    console.error('[AI-SOAL] Generation failed:', err.message);
    return res.status(500).json({ success: false, message: `Gagal generate soal AI: ${err.message}` });
  }
});

module.exports = router;
