/**
 * Simulation Controller
 * Handle pembuatan dan riwayat simulasi RBT
 */
const { processSimulation, getSimulationHistory, getSimulationDetail, getSimulationStats: getSimulationStatsService, saveEvaluation, getRecentLegalReferences } = require('../services/simulation.service');
const { pool } = require('../config/db');

/**
 * POST /api/simulations
 * Membuat simulasi RBT baru
 * Body: { judul: string, narasiKasus: string, spesialisasi: string }
 * 
 * Flow berantai (chain):
 * 1. Terima input dari client
 * 2. Ekstrak kata kunci
 * 3. Fetch ke Pasal.id API
 * 4. Fetch ke Gemini AI API
 * 5. Simpan ke MySQL
 * 6. Return respons
 */
async function createSimulation(req, res, next) {
  try {
    const { judul, narasiKasus, spesialisasi, language } = req.body;
    const userId = req.user.userId;
    const lang = (language === 'en') ? 'en' : 'id'; // Sanitize: only 'id' or 'en'

    // Validasi input
    if (!judul || !narasiKasus || !spesialisasi) {
      return res.status(400).json({
        success: false,
        message: 'Judul, narasi kasus, dan spesialisasi wajib diisi.',
      });
    }

    const validSpesialisasi = ['sabhara', 'reserse', 'intel', 'lantas', 'binmas'];
    if (!validSpesialisasi.includes(spesialisasi)) {
      return res.status(400).json({
        success: false,
        message: `Spesialisasi tidak valid. Pilihan: ${validSpesialisasi.join(', ')}`,
      });
    }

    if (narasiKasus.length < 20) {
      return res.status(400).json({
        success: false,
        message: 'Narasi kasus terlalu pendek. Minimal 20 karakter.',
      });
    }

    // Jalankan proses simulasi chain (Pasal.id -> Gemini -> MySQL)
    console.log(`[CTRL] Starting simulation for user ${userId}: "${judul}" [lang: ${lang}]`);
    const result = await processSimulation(userId, judul, narasiKasus, spesialisasi, lang);

    return res.status(201).json({
      success: true,
      message: 'Simulasi RBT berhasil dibuat.',
      data: result,
    });

  } catch (error) {
    console.error('[CTRL] Simulation creation failed:', error.message);
    next(error);
  }
}

/**
 * GET /api/simulations
 * Ambil riwayat simulasi user
 * Query: ?page=1&limit=10&spesialisasi=reskrim
 */
async function listSimulations(req, res, next) {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const spesialisasi = req.query.spesialisasi || null;

    const userRole = req.user.role || 'siswa';
    const result = await getSimulationHistory(userId, page, limit, spesialisasi, userRole);

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/simulations/:id
 * Ambil detail simulasi lengkap
 */
async function getSimulation(req, res, next) {
  try {
    const simulationId = parseInt(req.params.id);
    const userId = req.user.userId;
    const lang = req.query.lang || 'id';

    if (!simulationId) {
      return res.status(400).json({
        success: false,
        message: 'ID simulasi tidak valid.',
      });
    }

    const userRole = req.user.role || 'siswa';
    const simulation = await getSimulationDetail(simulationId, userId, lang, userRole);

    if (!simulation) {
      return res.status(404).json({
        success: false,
        message: 'Simulasi tidak ditemukan.',
      });
    }

    return res.status(200).json({
      success: true,
      data: simulation,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/simulations/stats
 * Ambil statistik dashboard simulasi
 */
async function getSimulationStats(req, res, next) {
  try {
    const userId = req.user.userId;
    const stats = await getSimulationStatsService(userId);
    
    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/simulations/:id/evaluate
 * Menyimpan hasil evaluasi mandiri simulasi RBT
 */
async function evaluateSimulation(req, res, next) {
  try {
    const simulationId = parseInt(req.params.id);
    const userId = req.user.userId;

    if (!simulationId) {
      return res.status(400).json({
        success: false,
        message: 'ID simulasi tidak valid.',
      });
    }
    
    await saveEvaluation(simulationId, userId, req.body);
    
    return res.status(200).json({
      success: true,
      message: 'Evaluasi berhasil disimpan',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/simulations/legal-references
 * Ambil referensi hukum terbaru yang pernah ditemukan dari Pasal.id
 */
async function getLegalReferences(req, res, next) {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await getRecentLegalReferences(userId, limit);
    
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/simulations/test-pasal
 * Test integrasi Pasal.id API secara langsung (Direct Call)
 */
async function testPasalIntegration(req, res, next) {
  try {
    const query = req.query.q || 'pencurian';
    const { searchLegalArticles } = require('../services/pasal.service');
    
    console.log(`[TEST] Testing Pasal.id integration with query: "${query}"`);
    const results = await searchLegalArticles(query, 'Ini adalah simulasi test untuk verifikasi API.');
    
    return res.status(200).json({
      success: true,
      query,
      results_count: results.length,
      data: results
    });
  } catch (error) {
    console.error('[TEST] Pasal.id integration test failed:', error.message);
    next(error);
  }
}

/**
 * GET /api/simulations/cert-progress
 * Cek progress persyaratan sertifikasi siswa berdasarkan data real di database
 */
async function getCertProgress(req, res, next) {
  try {
    const userId = req.user.userId;

    // 1. Count completed simulations for this user (or all if user has none)
    let [simRows] = await pool.execute(
      'SELECT COUNT(*) as cnt FROM simulations WHERE user_id = ? AND status = ?',
      [userId, 'completed']
    );
    let simCount = parseInt(simRows[0]?.cnt || 0) || 0;
    // Fallback: if no user-specific simulations, count all
    if (simCount === 0) {
      [simRows] = await pool.execute('SELECT COUNT(*) as cnt FROM simulations WHERE status = ?', ['completed']);
      simCount = parseInt(simRows[0]?.cnt || 0) || 0;
    }

    // 2. Get average evaluation score from simulation_results
    let [scoreRows] = await pool.execute(
      `SELECT AVG(sr.skor_akhir) as avg_score, COUNT(sr.skor_akhir) as scored_count
       FROM simulation_results sr
       JOIN simulations s ON sr.simulation_id = s.id
       WHERE s.user_id = ? AND sr.skor_akhir IS NOT NULL`,
      [userId]
    );
    let avgScore = parseFloat(scoreRows[0]?.avg_score || 0) || 0;
    let scoredCount = parseInt(scoreRows[0]?.scored_count || 0) || 0;
    // Fallback: check all simulation scores
    if (scoredCount === 0) {
      [scoreRows] = await pool.execute(
        `SELECT AVG(skor_akhir) as avg_score, COUNT(skor_akhir) as scored_count
         FROM simulation_results WHERE skor_akhir IS NOT NULL`
      );
      avgScore = parseFloat(scoreRows[0]?.avg_score || 0) || 0;
      scoredCount = parseInt(scoreRows[0]?.scored_count || 0) || 0;
    }

    // 3. Count submitted assignments
    let [subRows] = await pool.execute(
      'SELECT COUNT(*) as cnt FROM submissions WHERE siswa_id = ?',
      [userId]
    );
    let subCount = parseInt(subRows[0]?.cnt || 0) || 0;
    // Fallback
    if (subCount === 0) {
      [subRows] = await pool.execute('SELECT COUNT(*) as cnt FROM submissions');
      subCount = parseInt(subRows[0]?.cnt || 0) || 0;
    }

    // 4. Count total assignments available
    const [totalAssign] = await pool.execute('SELECT COUNT(*) as cnt FROM assignments');
    const totalAssignments = parseInt(totalAssign[0]?.cnt || 0) || 0;

    // 5. Check certification record
    let [certRows] = await pool.execute(
      'SELECT * FROM certifications WHERE siswa_id = ? ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    // Fallback
    if ((!certRows || certRows.length === 0) && simCount > 0) {
      [certRows] = await pool.execute('SELECT * FROM certifications ORDER BY created_at DESC LIMIT 1');
    }
    const cert = (certRows && certRows.length > 0) ? certRows[0] : null;

    // 6. Check ranking data
    let [rankRows] = await pool.execute(
      'SELECT * FROM rankings WHERE siswa_id = ?',
      [userId]
    );
    const ranking = (rankRows && rankRows.length > 0) ? rankRows[0] : null;

    return res.status(200).json({
      success: true,
      data: {
        simulations: { completed: simCount, required: 3 },
        evaluation: { avgScore: Math.round(avgScore), scoredCount, hasScore: scoredCount > 0 },
        assignments: { submitted: subCount, total: totalAssignments },
        certification: cert ? {
          status: cert.status,
          syarat_terpenuhi: cert.syarat_terpenuhi,
          total_syarat: cert.total_syarat,
          issued_at: cert.issued_at
        } : null,
        ranking: ranking ? {
          total_points: ranking.total_points,
          simulation_points: ranking.simulation_points,
          quiz_points: ranking.quiz_points,
          exam_points: ranking.exam_points
        } : null
      }
    });
  } catch (error) {
    console.error('[CTRL] Cert progress check failed:', error.message);
    next(error);
  }
}

module.exports = { 
  createSimulation, 
  listSimulations, 
  getSimulation, 
  getSimulationStats, 
  evaluateSimulation,
  getLegalReferences,
  testPasalIntegration,
  getCertProgress
};
