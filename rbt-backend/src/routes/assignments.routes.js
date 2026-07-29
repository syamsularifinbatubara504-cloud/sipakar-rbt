const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { pool } = require('../config/db');

// Multer Storage Configuration for Assignment File Uploads (.pdf, .docx, .doc, .pptx, .ppt)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'tugas-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // Max 50MB
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.pdf', '.docx', '.doc', '.pptx', '.ppt', '.png', '.jpg', '.jpeg', '.zip'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file PDF, DOCX, PPT, Gambar, atau ZIP yang diizinkan.'));
    }
  }
});

router.use(authenticateToken);

// POST /api/assignments/upload-file — Upload file tugas (PDF, DOCX, PPT)
router.post('/upload-file', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Tidak ada file yang diunggah.' });
    }
    const protocol = req.protocol;
    const host = req.get('host');
    const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

    res.json({
      success: true,
      message: 'File tugas berhasil diunggah.',
      data: {
        file_url: fileUrl,
        file_name: req.file.originalname,
        file_size: req.file.size
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Gagal mengunggah file.' });
  }
});

// GET /api/assignments — Get list of all assignments
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(`
      SELECT a.*, m.judul AS material_title, m.unit_spesialisasi, u.name AS gadik_name,
        (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id) AS submission_count
      FROM assignments a
      LEFT JOIN materials m ON a.material_id = m.id
      LEFT JOIN users u ON m.gadik_id = u.id
      ORDER BY a.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/assignments/my-submissions — List student's own submissions
router.get('/my-submissions', requireRole('siswa'), async (req, res, next) => {
  try {
    const [rows] = await pool.execute(`
      SELECT * FROM submissions WHERE siswa_id = ?
    `, [req.user.userId]);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/assignments — Create new assignment (Gadik / Manajemen)
router.post('/', requireRole('gadik', 'manajemen'), async (req, res, next) => {
  try {
    const { material_id, deskripsi_tugas, tenggat, poin_maksimal } = req.body;
    if (!deskripsi_tugas) {
      return res.status(400).json({ success: false, message: 'Deskripsi tugas wajib diisi.' });
    }

    const matId = material_id ? parseInt(material_id) : null;
    const tenggatVal = tenggat ? new Date(tenggat) : null;

    const [result] = await pool.execute(`
      INSERT INTO assignments (material_id, deskripsi_tugas, tenggat, created_at)
      VALUES (?, ?, ?, NOW())
    `, [matId, deskripsi_tugas, tenggatVal]);

    res.json({ success: true, message: 'Tugas berhasil dibuat.', data: { id: result.insertId } });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/assignments/:id — Delete assignment
router.delete('/:id', requireRole('gadik', 'manajemen'), async (req, res, next) => {
  try {
    await pool.execute('DELETE FROM assignments WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Tugas berhasil dihapus.' });
  } catch (err) {
    next(err);
  }
});

// GET /api/assignments/:id/submissions — List submissions for an assignment
router.get('/:id/submissions', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(`
      SELECT s.*, u.name AS siswa_name, u.email AS siswa_email
      FROM submissions s
      LEFT JOIN users u ON s.siswa_id = u.id
      WHERE s.assignment_id = ?
      ORDER BY s.submitted_at DESC
    `, [req.params.id]);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/assignments/:id/submit — Submit or Edit/Re-upload assignment (Siswa)
router.post('/:id/submit', requireRole('siswa'), async (req, res, next) => {
  try {
    const { file_url, file_name, catatan } = req.body;
    const assignmentId = req.params.id;
    const siswaId = req.user.userId;

    // Check if submission already exists (for Edit / Re-upload)
    const [existing] = await pool.execute(`
      SELECT * FROM submissions WHERE assignment_id = ? AND siswa_id = ?
    `, [assignmentId, siswaId]);

    if (existing && existing.length > 0) {
      // Update existing submission
      await pool.execute(`
        UPDATE submissions 
        SET file_url = ?, file_name = ?, catatan = ?, submitted_at = NOW()
        WHERE id = ?
      `, [file_url || existing[0].file_url, file_name || existing[0].file_name, catatan || existing[0].catatan, existing[0].id]);
      
      res.json({ success: true, message: 'Tugas berhasil diperbarui & diunggah ulang!' });
    } else {
      // Create new submission
      await pool.execute(`
        INSERT INTO submissions (assignment_id, siswa_id, file_url, file_name, catatan, submitted_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `, [assignmentId, siswaId, file_url || '', file_name || '', catatan || '']);

      res.json({ success: true, message: 'Tugas berhasil dikumpulkan!' });
    }
  } catch (err) {
    next(err);
  }
});

// PUT /api/assignments/submissions/:id/grade — Grade a submission
router.put('/submissions/:id/grade', requireRole('gadik', 'manajemen'), async (req, res, next) => {
  try {
    const { nilai } = req.body;
    await pool.execute(`
      UPDATE submissions SET nilai = ? WHERE id = ?
    `, [parseInt(nilai) || 0, req.params.id]);
    res.json({ success: true, message: 'Nilai tugas berhasil disimpan.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
