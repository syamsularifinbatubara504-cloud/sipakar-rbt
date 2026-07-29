const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { pool } = require('../config/db');

const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'materi-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // Max 30MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || path.extname(file.originalname).toLowerCase() === '.pdf') {
      cb(null, true);
    } else {
      cb(new Error('Hanya file PDF yang diizinkan.'));
    }
  }
});

router.use(authenticateToken);

// POST /api/materials/upload-pdf — Upload file PDF materi
router.post('/upload-pdf', requireRole('gadik', 'manajemen'), upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Tidak ada file PDF yang diunggah.' });
  }
  const protocol = req.protocol;
  const host = req.get('host');
  const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
  res.json({
    success: true,
    message: 'File PDF berhasil diunggah.',
    url: fileUrl,
    filename: req.file.originalname
  });
});

// GET /api/materials — List semua materi
router.get('/', async (req, res, next) => {
  try {
    const [materials] = await pool.execute(
      `SELECT m.*, u.name AS gadik_name 
       FROM materials m 
       LEFT JOIN users u ON m.gadik_id = u.id 
       ORDER BY m.created_at DESC`
    );
    res.json({ success: true, data: materials });
  } catch (err) {
    next(err);
  }
});

// POST /api/materials — Buat materi baru (gadik / manajemen)
router.post('/', requireRole('gadik', 'manajemen'), async (req, res, next) => {
  try {
    const { judul, unit_spesialisasi, isi_materi, lampiran, outcomes } = req.body;
    if (!judul || !unit_spesialisasi) {
      return res.status(400).json({ success: false, message: 'Judul dan unit spesialisasi wajib diisi.' });
    }
    const [result] = await pool.execute(
      `INSERT INTO materials (gadik_id, judul, unit_spesialisasi, isi_materi, lampiran, outcomes, status)
       VALUES (?, ?, ?, ?, ?, ?, 'approved')`,
      [req.user.userId, judul, unit_spesialisasi, isi_materi || '', lampiran || '', outcomes || '']
    );
    res.json({ success: true, message: 'Materi berhasil dibuat.', data: { id: result.insertId } });
  } catch (err) {
    next(err);
  }
});

// PUT /api/materials/:id — Update materi
router.put('/:id', async (req, res, next) => {
  try {
    const { judul, unit_spesialisasi, isi_materi, lampiran, outcomes, status } = req.body;
    await pool.execute(
      `UPDATE materials SET judul=?, unit_spesialisasi=?, isi_materi=?, lampiran=?, outcomes=?, status=?, updated_at=NOW() WHERE id=?`,
      [judul, unit_spesialisasi, isi_materi || '', lampiran || '', outcomes || '', status || 'draft', req.params.id]
    );
    res.json({ success: true, message: 'Materi berhasil diperbarui.' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/materials/:id/approve — Approve materi (manajemen only)
router.put('/:id/approve', requireRole('manajemen'), async (req, res, next) => {
  try {
    await pool.execute(
      `UPDATE materials SET status='approved', updated_at=NOW() WHERE id=?`,
      [req.params.id]
    );
    res.json({ success: true, message: 'Materi berhasil disetujui.' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/materials/:id — Hapus materi
router.delete('/:id', async (req, res, next) => {
  try {
    await pool.execute('DELETE FROM materials WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Materi berhasil dihapus.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
