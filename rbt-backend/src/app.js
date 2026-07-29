/**
 * ============================================
 * RBT Simulation Backend Server
 * Sekolah Polisi Negara (SPN) - Prolat Polri
 * ============================================
 * 
 * Tech Stack: Node.js + Express.js + MySQL (mysql2) 
 * 
 * Entry point untuk backend server.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { testConnection } = require('./config/db');
const { initGemini } = require('./config/gemini');
const authRoutes = require('./routes/auth.routes');
const simulationRoutes = require('./routes/simulation.routes');
const { notFound, errorHandler } = require('./middleware/error.middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// Middleware Global
// ============================================

app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS - izinkan frontend Angular & Vercel
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.) or any localhost / vercel domain
    if (!origin || origin.includes('localhost') || origin.includes('vercel.app') || origin === process.env.FRONTEND_URL) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Request logging
app.use(morgan('dev'));

const path = require('path');
const fs = require('fs');

// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure uploads folder exists (safely handle read-only Vercel serverless filesystem)
const uploadsDir = path.join(__dirname, '../uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (err) {
  console.warn('⚠️ Read-only filesystem warning (Vercel serverless):', err.message);
}
app.use('/uploads', express.static(uploadsDir));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak permintaan. Coba lagi setelah 15 menit.',
  },
});
app.use('/api/', limiter);

// ============================================
// API Routes
// ============================================

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'RBT Simulation API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

const usersRoutes = require('./routes/users.routes');
const materialsRoutes = require('./routes/materials.routes');
const assignmentsRoutes = require('./routes/assignments.routes');
const questionsRoutes = require('./routes/questions.routes');
const certificationsRoutes = require('./routes/certifications.routes');

// Auth routes
app.use('/api/auth', authRoutes);

// Simulation routes
app.use('/api/simulations', simulationRoutes);

// New role-based feature routes
app.use('/api/users', usersRoutes);
app.use('/api/materials', materialsRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/api/certifications', certificationsRoutes);

// ============================================
// Error Handling
// ============================================
app.use(notFound);
app.use(errorHandler);

// ============================================
// Server Startup
// ============================================
// Inisialisasi DB dan Gemini saat modul dimuat
testConnection();
initGemini();

// Start standalone server jika dijalankan secara langsung
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 API base URL: http://localhost:${PORT}/api`);
    console.log(`🔐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:4200'}`);
  });
}

module.exports = app;
