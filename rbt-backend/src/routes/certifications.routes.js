const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { pool } = require('../config/db');

// Multer Storage Configuration for Certificate Template PNG Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'cert-template-' + uniqueSuffix + (ext || '.png'));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // Max 20MB
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.png', '.jpg', '.jpeg', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file gambar PNG, JPG, atau WEBP yang diizinkan untuk template sertifikat.'));
    }
  }
});

router.use(authenticateToken);

// Default position template settings if not created yet
const DEFAULT_POSITIONS = {
  nama: { x: 50, y: 45, fontSize: 32, fontWeight: 'bold', color: '#1e293b', align: 'center' },
  nrp: { x: 50, y: 53, fontSize: 20, fontWeight: 'normal', color: '#475569', align: 'center' },
  jabatan: { x: 50, y: 60, fontSize: 22, fontWeight: 'semibold', color: '#d97706', align: 'center' },
  spesialisasi: { x: 50, y: 67, fontSize: 24, fontWeight: 'bold', color: '#1e40af', align: 'center' }
};

// GET /api/certifications — Get all certification applications (Gadik/Manajemen) or student's own (Siswa)
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    let query = `
      SELECT c.*, u.name AS siswa_name, u.email AS siswa_email, 
             COALESCE(u.nrp, 'NRP-2026001') AS siswa_nrp,
             COALESCE(u.jabatan, 'Siswa Prolat RBT') AS siswa_jabatan,
             g.name AS gadik_name
      FROM certifications c
      LEFT JOIN users u ON c.siswa_id = u.id
      LEFT JOIN users g ON c.gadik_id = g.id
    `;
    let params = [];

    if (userRole === 'siswa') {
      query += ` WHERE c.siswa_id = ? ORDER BY c.created_at DESC`;
      params.push(userId);
    } else {
      query += ` ORDER BY c.created_at DESC`;
    }

    const [rows] = await pool.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/certifications/apply — Submit certification application (siswa, gadik, manajemen)
router.post('/apply', async (req, res, next) => {
  try {
    let targetSiswaId = req.user.userId;
    const { unit_spesialisasi, nrp, jabatan, is_demo } = req.body;

    // If Gadik/Manajemen is creating a demo application, assign to the first student account
    if (req.user.role !== 'siswa') {
      const [students] = await pool.execute("SELECT id FROM users WHERE role = 'siswa' ORDER BY id ASC LIMIT 1");
      if (students && students.length > 0) {
        targetSiswaId = students[0].id;
      }
    }

    // Optional: update student NRP & Jabatan in users table if provided
    if (nrp || jabatan) {
      await pool.execute(`
        UPDATE users SET nrp = COALESCE(?, nrp), jabatan = COALESCE(?, jabatan) WHERE id = ?
      `, [nrp || null, jabatan || null, targetSiswaId]);
    }

    // If not demo request, check existing active application
    if (!is_demo) {
      const [existing] = await pool.execute(`
        SELECT * FROM certifications WHERE siswa_id = ? AND status IN ('pending', 'issued') ORDER BY created_at DESC LIMIT 1
      `, [targetSiswaId]);

      if (existing && existing.length > 0) {
        return res.json({
          success: true,
          message: 'Pengajuan sertifikat sudah tersimpan dan sedang diproses!',
          data: existing[0]
        });
      }
    }

    const spec = unit_spesialisasi || 'Sabhara';
    const [result] = await pool.execute(`
      INSERT INTO certifications (siswa_id, unit_spesialisasi, syarat_terpenuhi, total_syarat, status, created_at)
      VALUES (?, ?, 5, 5, 'pending', NOW())
    `, [targetSiswaId, spec]);

    res.json({
      success: true,
      message: 'Pengajuan sertifikat berhasil dibuat dan tersimpan!',
      data: { id: result.insertId, status: 'pending' }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/certifications/template — Get current saved template config
router.get('/template', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(`
      SELECT * FROM cert_templates ORDER BY id DESC LIMIT 1
    `);

    if (rows && rows.length > 0) {
      let pos = rows[0].positions;
      if (typeof pos === 'string') {
        try { pos = JSON.parse(pos); } catch(e) {}
      }
      res.json({
        success: true,
        data: {
          id: rows[0].id,
          template_url: rows[0].template_url,
          positions: pos || DEFAULT_POSITIONS
        }
      });
    } else {
      res.json({
        success: true,
        data: {
          id: null,
          template_url: '',
          positions: DEFAULT_POSITIONS
        }
      });
    }
  } catch (err) {
    next(err);
  }
});

// POST /api/certifications/upload-template — Upload PNG Certificate Template Image
router.post('/upload-template', requireRole('gadik', 'manajemen'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File gambar template wajib diunggah.' });
    }
    const protocol = req.protocol;
    const host = req.get('host');
    const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

    // Get current template positions or fallback
    const [existing] = await pool.execute(`SELECT * FROM cert_templates ORDER BY id DESC LIMIT 1`);
    let pos = DEFAULT_POSITIONS;
    if (existing && existing.length > 0 && existing[0].positions) {
      pos = typeof existing[0].positions === 'string' ? JSON.parse(existing[0].positions) : existing[0].positions;
    }

    const [result] = await pool.execute(`
      INSERT INTO cert_templates (template_url, positions, created_at)
      VALUES (?, ?, NOW())
    `, [fileUrl, JSON.stringify(pos)]);

    res.json({
      success: true,
      message: 'Template sertifikat PNG berhasil diunggah!',
      data: {
        id: result.insertId,
        template_url: fileUrl,
        positions: pos
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/certifications/save-template — Save custom position coordinates & text styling
router.post('/save-template', requireRole('gadik', 'manajemen'), async (req, res, next) => {
  try {
    const { template_url, positions } = req.body;
    if (!positions) {
      return res.status(400).json({ success: false, message: 'Data posisi koordinat teks wajib diisi.' });
    }

    const [existing] = await pool.execute(`SELECT * FROM cert_templates ORDER BY id DESC LIMIT 1`);
    const currentUrl = template_url || (existing && existing.length > 0 ? existing[0].template_url : '');

    const [result] = await pool.execute(`
      INSERT INTO cert_templates (template_url, positions, created_at)
      VALUES (?, ?, NOW())
    `, [currentUrl, JSON.stringify(positions)]);

    res.json({
      success: true,
      message: 'Posisi tata letak Nama, NRP, dan Jabatan pada sertifikat berhasil disimpan!',
      data: {
        id: result.insertId,
        template_url: currentUrl,
        positions
      }
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/certifications/:id/approve — Approve & Issue Certificate
router.put('/:id/approve', requireRole('gadik', 'manajemen'), async (req, res, next) => {
  try {
    const certId = req.params.id;
    const gadikId = req.user.userId;
    const certNumber = `SPN/RBT/${new Date().getFullYear()}/${Math.floor(10000 + Math.random() * 90000)}`;

    await pool.execute(`
      UPDATE certifications 
      SET status = 'issued', gadik_id = ?, cert_number = ?, issued_at = NOW()
      WHERE id = ?
    `, [gadikId, certNumber, certId]);

    res.json({
      success: true,
      message: `Sertifikat resmi berhasil disetujui & diterbitkan dengan Nomor: ${certNumber}`,
      data: { id: certId, status: 'issued', cert_number: certNumber }
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/certifications/:id/reject — Reject Certificate
router.put('/:id/reject', requireRole('gadik', 'manajemen'), async (req, res, next) => {
  try {
    const certId = req.params.id;
    await pool.execute(`
      UPDATE certifications SET status = 'rejected' WHERE id = ?
    `, [certId]);

    res.json({
      success: true,
      message: 'Pengajuan sertifikat telah ditolak.',
      data: { id: certId, status: 'rejected' }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
