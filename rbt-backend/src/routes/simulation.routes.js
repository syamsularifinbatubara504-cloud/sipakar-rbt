/**
 * Simulation Routes
 * /api/simulations/*
 */
const express = require('express');
const router = express.Router();
const { 
  createSimulation, 
  listSimulations, 
  getSimulation, 
  getSimulationStats, 
  evaluateSimulation,
  getLegalReferences,
  testPasalIntegration,
  getCertProgress
} = require('../controllers/simulation.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// Semua route simulasi memerlukan autentikasi
router.use(authenticateToken);

// GET    /api/simulations/cert-progress - Progres real kelayakan sertifikasi siswa
router.get('/cert-progress', getCertProgress);

// POST   /api/simulations      - Buat simulasi baru (chain: Pasal.id -> Gemini -> MySQL)
router.post('/', createSimulation);

// GET    /api/simulations/stats - Statistik dashboard simulasi
router.get('/stats', getSimulationStats);

// GET    /api/simulations/legal-references - Referensi hukum terbaru dari Pasal.id
router.get('/legal-references', getLegalReferences);

// GET    /api/simulations/test-pasal - Test integrasi Pasal.id API secara langsung
router.get('/test-pasal', testPasalIntegration);

// GET    /api/simulations      - Riwayat simulasi user
router.get('/', listSimulations);

// GET    /api/simulations/:id  - Detail simulasi
router.get('/:id', getSimulation);

// PUT    /api/simulations/:id/evaluate - Simpan evaluasi 
router.put('/:id/evaluate', evaluateSimulation);

module.exports = router;
