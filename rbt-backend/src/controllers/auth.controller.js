/**
 * Auth Controller
 * Handle Google OAuth login dan profil pengguna
 */
const jwt = require('jsonwebtoken');
const { verifyGoogleToken } = require('../config/google-auth');
const { pool } = require('../config/db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * POST /api/auth/google
 * Login dengan Google OAuth 2.0
 * Body: { idToken: string }
 */
async function googleLogin(req, res, next) {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Google ID Token diperlukan.',
      });
    }

    // 1. Verifikasi Google ID token
    const googleUser = await verifyGoogleToken(idToken);

    if (!googleUser.emailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Email Google belum terverifikasi.',
      });
    }

    // 2. Cek/buat user di database
    const [existingUsers] = await pool.execute(
      'SELECT * FROM users WHERE google_id = ?',
      [googleUser.googleId]
    );

    let user;

    if (existingUsers.length > 0) {
      // User sudah ada, update info terbaru
      user = existingUsers[0];
      await pool.execute(
        'UPDATE users SET name = ?, picture_url = ?, updated_at = NOW() WHERE id = ?',
        [googleUser.name, googleUser.picture, user.id]
      );
      user.name = googleUser.name;
      user.picture_url = googleUser.picture;
    } else {
      // Buat user baru
      const [insertResult] = await pool.execute(
        `INSERT INTO users (google_id, email, name, picture_url, role)
         VALUES (?, ?, ?, ?, 'gadik')`,
        [googleUser.googleId, googleUser.email, googleUser.name, googleUser.picture]
      );
      user = {
        id: insertResult.insertId,
        google_id: googleUser.googleId,
        email: googleUser.email,
        name: googleUser.name,
        picture_url: googleUser.picture,
        role: 'gadik',
        spesialisasi: null,
      };
    }

    // 3. Generate JWT
    const jwtPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      spesialisasi: user.spesialisasi,
    };

    const token = jwt.sign(jwtPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // 4. Kirim respons
    return res.status(200).json({
      success: true,
      message: 'Login berhasil',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          picture: user.picture_url,
          role: user.role,
          spesialisasi: user.spesialisasi,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/auth/me
 * Ambil profil user dari JWT
 */
async function getProfile(req, res, next) {
  try {
    const [users] = await pool.execute(
      'SELECT id, email, name, picture_url, role, spesialisasi, created_at FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan.',
      });
    }

    return res.status(200).json({
      success: true,
      data: users[0],
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/auth/profile
 * Update profil user (spesialisasi)
 */
async function updateProfile(req, res, next) {
  try {
    const { spesialisasi } = req.body;
    const validSpesialisasi = ['sabhara', 'reserse', 'intel', 'lantas', 'binmas'];

    if (spesialisasi && !validSpesialisasi.includes(spesialisasi)) {
      return res.status(400).json({
        success: false,
        message: `Spesialisasi tidak valid. Pilihan: ${validSpesialisasi.join(', ')}`,
      });
    }

    await pool.execute(
      'UPDATE users SET spesialisasi = ? WHERE id = ?',
      [spesialisasi, req.user.userId]
    );

    return res.status(200).json({
      success: true,
      message: 'Profil berhasil diperbarui.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/dev-login
 * Development-only mock login (tanpa Google OAuth)
 * HANYA aktif di NODE_ENV=development
 */
async function devLogin(req, res, next) {
  try {
    const mockUser = {
      id: 1,
      email: 'gadik.demo@spn.polri.go.id',
      name: 'Gadik Demo SPN',
      picture: '',
      role: 'gadik',
      spesialisasi: null,
    };

    // Try to create/find user in database, fall back to mock if DB is unavailable
    try {
      const [existingUsers] = await pool.execute(
        'SELECT * FROM users WHERE email = ?',
        [mockUser.email]
      );

      if (existingUsers.length > 0) {
        const dbUser = existingUsers[0];
        mockUser.id = dbUser.id;
        mockUser.name = dbUser.name;
        mockUser.role = dbUser.role;
        mockUser.spesialisasi = dbUser.spesialisasi;
      } else {
        const [insertResult] = await pool.execute(
          `INSERT INTO users (google_id, email, name, picture_url, role)
           VALUES (?, ?, ?, ?, 'gadik')`,
          ['dev_mock_001', mockUser.email, mockUser.name, '']
        );
        mockUser.id = insertResult.insertId || 1;
      }
    } catch (dbError) {
      console.warn('⚠️  DB unavailable for dev login, using mock user:', dbError.message);
    }

    const jwtPayload = {
      userId: mockUser.id,
      email: mockUser.email,
      name: mockUser.name,
      role: mockUser.role,
      spesialisasi: mockUser.spesialisasi,
    };

    const token = jwt.sign(jwtPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.status(200).json({
      success: true,
      message: 'Demo login berhasil',
      data: {
        token,
        user: mockUser,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { googleLogin, getProfile, updateProfile, devLogin };
