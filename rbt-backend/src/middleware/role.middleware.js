/**
 * Middleware untuk validasi hak akses berdasarkan role
 * @param  {...string} roles - Daftar role yang diizinkan ('gadik', 'siswa', 'manajemen')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Akses ditolak. Informasi role tidak ditemukan.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Role Anda tidak memiliki izin untuk resource ini.',
      });
    }

    next();
  };
}

module.exports = { requireRole };
