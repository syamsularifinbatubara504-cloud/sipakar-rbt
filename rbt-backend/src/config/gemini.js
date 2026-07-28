/**
 * Google Gemini AI Client Configuration
 * Menggunakan @google/generative-ai SDK
 *
 * PENTING:
 * - Menggunakan apiVersion: 'v1' (bukan v1beta default SDK)
 * - Model yang terkonfirmasi tersedia: gemini-2.5-flash, gemini-2.0-flash, gemini-2.5-flash-lite
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// PENTING: trim() untuk menghapus trailing whitespace dari .env
const GEMINI_API_KEY  = (process.env.GEMINI_API_KEY  || '').trim();
const GEMINI_MODEL    = (process.env.GEMINI_MODEL    || 'gemini-2.5-flash').trim();

// Urutan fallback model terkonfirmasi
const FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
];

// Request options dengan API v1beta (default SDK)
const REQUEST_OPTIONS = { apiVersion: 'v1beta' };

let genAI       = null;
let model       = null;
let activeModel = GEMINI_MODEL;

/**
 * Buat instance model Gemini dengan konfigurasi tertentu
 */
function createModel(modelName) {
  return genAI.getGenerativeModel(
    {
      model: modelName,
      generationConfig: {
        temperature:     0.7,
        topP:            0.9,
        topK:            40,
        maxOutputTokens: 8192,
      },
    },
    REQUEST_OPTIONS   // <-- KUNCI: pakai v1 bukan v1beta
  );
}

/**
 * Inisialisasi Gemini AI client
 */
function initGemini() {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_gemini_api_key') {
    console.warn('⚠️  Gemini API Key belum dikonfigurasi. Periksa GEMINI_API_KEY di .env');
    return null;
  }

  try {
    genAI       = new GoogleGenerativeAI(GEMINI_API_KEY);
    activeModel = GEMINI_MODEL;
    model       = createModel(activeModel);
    console.log(`✅ Gemini AI initialized (model: ${activeModel}, api: v1beta)`);
    return model;
  } catch (err) {
    console.error('❌ Gagal inisialisasi Gemini AI:', err.message);
    return null;
  }
}

/**
 * Dapatkan instance model Gemini (dengan lazy init)
 */
function getModel() {
  if (!model) return initGemini();
  return model;
}

/**
 * Coba fallback ke model berikutnya jika terjadi quota/availability error.
 * @param {string} failedModel - Nama model yang gagal
 * @returns {object|null} Model baru atau null jika semua habis
 */
function tryFallbackModel(failedModel) {
  if (!genAI) return null;

  const failedIdx  = FALLBACK_MODELS.indexOf(failedModel);
  const candidates = failedIdx >= 0
    ? FALLBACK_MODELS.slice(failedIdx + 1)
    : FALLBACK_MODELS.filter(m => m !== failedModel);

  for (const candidate of candidates) {
    console.log(`[GEMINI] Trying fallback model: ${candidate}`);
    try {
      activeModel = candidate;
      model       = createModel(candidate);
      console.log(`[GEMINI] ✅ Switched to fallback: ${candidate}`);
      return model;
    } catch (err) {
      console.warn(`[GEMINI] Fallback ${candidate} failed:`, err.message);
    }
  }

  console.error('[GEMINI] All fallback models exhausted.');
  model = null;
  return null;
}

/**
 * Dapatkan nama model yang sedang aktif
 */
function getActiveModel() {
  return activeModel;
}

module.exports = { initGemini, getModel, tryFallbackModel, getActiveModel };
