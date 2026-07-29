const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { pool } = require('../config/db');

router.use(authenticateToken);

// GET /api/users/dashboard-stats — Realtime dashboard statistics
router.get('/dashboard-stats', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Total Users
    const [userCount] = await pool.execute('SELECT COUNT(*) as count FROM users');
    const totalUsers = parseInt(userCount[0]?.count || 0);

    // Active Students Count
    const [siswaCount] = await pool.execute("SELECT COUNT(*) as count FROM users WHERE role = 'siswa'");
    const totalSiswa = parseInt(siswaCount[0]?.count || 0);

    // Total Questions
    let totalQuestions = 0;
    try {
      const [qCount] = await pool.execute('SELECT COUNT(*) as count FROM questions');
      totalQuestions = parseInt(qCount[0]?.count || 0);
    } catch(e) {}

    // Total Verified Questions
    let verifiedQuestions = 0;
    try {
      const [vqCount] = await pool.execute("SELECT COUNT(*) as count FROM questions WHERE status = 'approved'");
      verifiedQuestions = parseInt(vqCount[0]?.count || 0);
    } catch(e) {}

    // Certifications Count
    let totalCertifications = 0;
    try {
      const [certCount] = await pool.execute("SELECT COUNT(*) as count FROM certifications WHERE status = 'approved'");
      totalCertifications = parseInt(certCount[0]?.count || 0);
    } catch(e) {}

    // Average OBE Score
    let avgObeScore = '0.0';
    try {
      const [scoreRes] = await pool.execute("SELECT AVG(skor_akhir) as avg_score FROM simulation_results WHERE skor_akhir IS NOT NULL");
      const val = parseFloat(scoreRes[0]?.avg_score || 0);
      if (val > 0) avgObeScore = val.toFixed(1);
    } catch(e) {}

    // Student Specific Stats
    let studentRank = '#1';
    let studentAverage = '0%';
    let studentCertRequirements = '0/5';
    let studentFocusRecommendation = 'Lakukan Simulasi RBT pertama Anda untuk mengukur capaian kompetensi.';

    if (userRole === 'siswa') {
      try {
        const [myCerts] = await pool.execute('SELECT syarat_terpenuhi, total_syarat FROM certifications WHERE siswa_id = ? ORDER BY created_at DESC LIMIT 1', [userId]);
        if (myCerts && myCerts.length > 0) {
          const reqMet = myCerts[0].syarat_terpenuhi || 0;
          const totalReq = myCerts[0].total_syarat || 5;
          studentCertRequirements = `${reqMet}/${totalReq}`;
        }

        const [mySims] = await pool.execute(`
          SELECT sr.skor_akhir 
          FROM simulations s 
          JOIN simulation_results sr ON s.id = sr.simulation_id 
          WHERE s.user_id = ? AND sr.skor_akhir IS NOT NULL
        `, [userId]);

        if (mySims && mySims.length > 0) {
          const sum = mySims.reduce((acc, curr) => acc + (curr.skor_akhir || 0), 0);
          const avg = Math.round(sum / mySims.length);
          studentAverage = `${avg}%`;
          if (avg >= 70) {
            studentFocusRecommendation = `Capaian Anda sangat baik (${avg}%). Pertahankan performa untuk sertifikasi!`;
          } else {
            studentFocusRecommendation = `Fokuskan latihan simulasi RBT Anda untuk mencapai target minimum 70% (Saat ini: ${avg}%).`;
          }
        }
      } catch(e) {}
    }

    res.json({
      success: true,
      data: {
        totalUsers,
        totalSiswa,
        totalQuestions,
        verifiedQuestions,
        totalCertifications,
        avgObeScore,
        activeApiIntegrations: '2/2',
        studentRank,
        studentAverage,
        studentCertRequirements,
        studentFocusRecommendation
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/users — List semua user (manajemen only)
router.get('/', requireRole('manajemen'), async (req, res, next) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, email, name, picture_url, role, spesialisasi, nrp, jabatan, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
});

// POST /api/users — Tambah 1 akun baru secara manual (manajemen only)
router.post('/', requireRole('manajemen'), async (req, res, next) => {
  try {
    const { name, email, password, role, spesialisasi, nrp, jabatan } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Nama dan Email wajib diisi.' });
    }

    const userRole = role || 'siswa';
    const validRoles = ['gadik', 'siswa', 'manajemen'];
    if (!validRoles.includes(userRole)) {
      return res.status(400).json({ success: false, message: 'Role tidak valid.' });
    }

    // Check email uniqueness
    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing && existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email sudah terdaftar dalam sistem.' });
    }

    const plainPass = password || '123456';
    const hashedPassword = await bcrypt.hash(plainPass, 10);

    const [result] = await pool.execute(`
      INSERT INTO users (name, email, password, role, spesialisasi, nrp, jabatan, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `, [name, email, hashedPassword, userRole, spesialisasi || null, nrp || null, jabatan || null]);

    res.json({
      success: true,
      message: `Akun ${name} (${userRole}) berhasil dibuat!`,
      data: { id: result.insertId, name, email, role: userRole }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/users/batch — Tambah akun secara batch dari Excel/CSV JSON array
router.post('/batch', requireRole('manajemen'), async (req, res, next) => {
  try {
    const { users } = req.body;
    if (!users || !Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ success: false, message: 'Data array pengguna batch wajib diisi.' });
    }

    let insertedCount = 0;
    let skippedCount = 0;

    for (const u of users) {
      const name = (u.name || u.Nama || '').trim();
      const email = (u.email || u.Email || '').trim().toLowerCase();
      const role = (u.role || u.Role || 'siswa').toLowerCase().trim();
      const spesialisasi = (u.spesialisasi || u.Spesialisasi || '').toLowerCase().trim() || null;
      const nrp = u.nrp || u.NRP || null;
      const jabatan = u.jabatan || u.Jabatan || null;
      const pass = u.password || u.Password || '123456';

      if (!name || !email) {
        skippedCount++;
        continue;
      }

      // Check duplicate
      const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
      if (existing && existing.length > 0) {
        skippedCount++;
        continue;
      }

      const validRoles = ['gadik', 'siswa', 'manajemen'];
      const finalRole = validRoles.includes(role) ? role : 'siswa';
      const hashedPassword = await bcrypt.hash(pass, 10);

      await pool.execute(`
        INSERT INTO users (name, email, password, role, spesialisasi, nrp, jabatan, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `, [name, email, hashedPassword, finalRole, spesialisasi, nrp, jabatan]);

      insertedCount++;
    }

    res.json({
      success: true,
      message: `Impor batch selesai! ${insertedCount} akun berhasil ditambahkan, ${skippedCount} dilewati/duplikat.`,
      data: { insertedCount, skippedCount }
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/:id — Edit data profil user lengkap (manajemen only)
router.put('/:id', requireRole('manajemen'), async (req, res, next) => {
  try {
    const { name, email, role, spesialisasi, nrp, jabatan, password } = req.body;
    const userId = req.params.id;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Nama dan Email wajib diisi.' });
    }

    let updateQuery = `
      UPDATE users 
      SET name = ?, email = ?, role = ?, spesialisasi = ?, nrp = ?, jabatan = ?, updated_at = NOW()
    `;
    let params = [name, email, role || 'siswa', spesialisasi || null, nrp || null, jabatan || null];

    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery += `, password = ?`;
      params.push(hashedPassword);
    }

    updateQuery += ` WHERE id = ?`;
    params.push(userId);

    await pool.execute(updateQuery, params);

    res.json({
      success: true,
      message: `Data akun ${name} berhasil diperbarui!`
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/:id/role — Ubah role user
router.put('/:id/role', requireRole('manajemen'), async (req, res, next) => {
  try {
    const { role } = req.body;
    const validRoles = ['gadik', 'siswa', 'manajemen'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Role tidak valid.' });
    }
    await pool.execute('UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?', [role, req.params.id]);
    res.json({ success: true, message: 'Role berhasil diperbarui.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/users/cleanup — Clean demo data, keep only main Admin, Gadik, Siswa accounts
router.post('/cleanup', requireRole('manajemen'), async (req, res, next) => {
  try {
    await pool.execute(`DELETE FROM users WHERE email NOT IN ('admin@spn.com', 'gadik@spn.com', 'siswa@spn.com')`);
    try { await pool.execute(`DELETE FROM certifications`); } catch(e) {}
    try { await pool.execute(`DELETE FROM assignment_submissions`); } catch(e) {}

    res.json({
      success: true,
      message: 'Database berhasil dibersihkan! Hanya menyisakan 3 akun utama: Admin, Gadik, dan Siswa.'
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/:id — Hapus user
router.delete('/:id', requireRole('manajemen'), async (req, res, next) => {
  try {
    await pool.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'User berhasil dihapus.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
