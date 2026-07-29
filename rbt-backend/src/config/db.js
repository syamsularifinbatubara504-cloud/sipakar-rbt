/**
 * Multi-database Connection Pool (Support MySQL & Neon PostgreSQL)
 */
const mysql = require('mysql2/promise');
const { Pool: PgPool } = require('pg');
require('dotenv').config();

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');

let pool;
let tablesInitialized = false;
let initPromise = null;

if (isPostgres) {
  const pgPool = new PgPool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  async function ensurePostgresTables() {
    if (tablesInitialized) return;
    if (!initPromise) {
      initPromise = (async () => {
        try {
          await pgPool.query(`
            CREATE TABLE IF NOT EXISTS users (
              id SERIAL PRIMARY KEY,
              google_id VARCHAR(255) UNIQUE NULL,
              email VARCHAR(255) UNIQUE NOT NULL,
              name VARCHAR(255) NOT NULL,
              password VARCHAR(255) NULL,
              picture_url TEXT,
              role VARCHAR(50) DEFAULT 'gadik',
              spesialisasi VARCHAR(50) NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
          `);

          await pgPool.query(`
            CREATE TABLE IF NOT EXISTS simulations (
              id SERIAL PRIMARY KEY,
              user_id INT NOT NULL,
              judul VARCHAR(500) NOT NULL,
              narasi_kasus TEXT NOT NULL,
              kata_kunci TEXT,
              spesialisasi VARCHAR(50) NOT NULL,
              status VARCHAR(50) DEFAULT 'processing',
              error_message TEXT NULL,
              language VARCHAR(10) DEFAULT 'id',
              judul_en VARCHAR(500) DEFAULT NULL,
              narasi_kasus_en TEXT DEFAULT NULL,
              kata_kunci_en TEXT DEFAULT NULL,
              legal_references_en TEXT DEFAULT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
          `);

          await pgPool.query(`
            CREATE TABLE IF NOT EXISTS legal_references (
              id SERIAL PRIMARY KEY,
              simulation_id INT NOT NULL,
              pasal_number VARCHAR(100) NOT NULL,
              undang_undang VARCHAR(500) NOT NULL,
              deskripsi TEXT,
              ancaman_pidana TEXT,
              raw_response TEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
          `);

          await pgPool.query(`
            CREATE TABLE IF NOT EXISTS simulation_results (
              id SERIAL PRIMARY KEY,
              simulation_id INT NOT NULL,
              skenario_rbt TEXT NOT NULL,
              tujuan_pelatihan TEXT,
              peralatan TEXT,
              langkah_langkah TEXT,
              evaluasi_kriteria TEXT,
              durasi_estimasi VARCHAR(100),
              tingkat_kesulitan VARCHAR(50) DEFAULT 'menengah',
              raw_gemini_response TEXT,
              result_en TEXT DEFAULT NULL,
              skor_akhir INT NULL,
              penilaian_tambahan INT NULL,
              evaluasi_mandiri TEXT NULL,
              checked_evaluations TEXT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
          `);

          await pgPool.query(`
            CREATE TABLE IF NOT EXISTS materials (
              id SERIAL PRIMARY KEY,
              gadik_id INT NOT NULL,
              judul VARCHAR(500) NOT NULL,
              unit_spesialisasi VARCHAR(50) NOT NULL,
              isi_materi TEXT,
              lampiran TEXT,
              outcomes TEXT,
              status VARCHAR(50) DEFAULT 'draft',
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
          `);

          await pgPool.query(`
            CREATE TABLE IF NOT EXISTS assignments (
              id SERIAL PRIMARY KEY,
              material_id INT NOT NULL,
              deskripsi_tugas TEXT,
              tenggat TIMESTAMP,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
          `);

          await pgPool.query(`
            CREATE TABLE IF NOT EXISTS submissions (
              id SERIAL PRIMARY KEY,
              assignment_id INT NOT NULL,
              siswa_id INT NOT NULL,
              file_url TEXT,
              file_name VARCHAR(500),
              catatan TEXT,
              submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              nilai INT NULL
            );
            ALTER TABLE submissions ADD COLUMN IF NOT EXISTS file_name VARCHAR(500);
            ALTER TABLE submissions ADD COLUMN IF NOT EXISTS catatan TEXT;
          `);

          await pgPool.query(`
            CREATE TABLE IF NOT EXISTS questions (
              id SERIAL PRIMARY KEY,
              gadik_id INT NOT NULL,
              soal TEXT NOT NULL,
              unit_spesialisasi VARCHAR(50) NOT NULL,
              tingkat_kesulitan VARCHAR(50) DEFAULT 'sedang',
              poin INT DEFAULT 10,
              opsi_jawaban TEXT,
              jawaban_benar INT,
              tingkat_kegagalan DECIMAL(5,2) DEFAULT 0,
              status VARCHAR(50) DEFAULT 'pending',
              approved_by INT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
          `);

          try {
            await pgPool.query(`ALTER TABLE questions ADD COLUMN IF NOT EXISTS poin INT DEFAULT 10;`);
          } catch (e) {}

          await pgPool.query(`
            CREATE TABLE IF NOT EXISTS exam_sessions (
              id SERIAL PRIMARY KEY,
              gadik_id INT NOT NULL,
              judul VARCHAR(500) NOT NULL,
              question_set_id INT,
              durasi_menit INT DEFAULT 60,
              peserta TEXT,
              status VARCHAR(50) DEFAULT 'scheduled',
              scheduled_at TIMESTAMP,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
          `);

          await pgPool.query(`
            CREATE TABLE IF NOT EXISTS rankings (
              id SERIAL PRIMARY KEY,
              siswa_id INT NOT NULL,
              total_points INT DEFAULT 0,
              simulation_points INT DEFAULT 0,
              quiz_points INT DEFAULT 0,
              exam_points INT DEFAULT 0,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
          `);

          await pgPool.query(`
            CREATE TABLE IF NOT EXISTS certifications (
              id SERIAL PRIMARY KEY,
              siswa_id INT NOT NULL,
              gadik_id INT,
              unit_spesialisasi VARCHAR(50),
              syarat_terpenuhi INT DEFAULT 0,
              total_syarat INT DEFAULT 5,
              status VARCHAR(50) DEFAULT 'pending',
              cert_number VARCHAR(100),
              cert_url TEXT,
              issued_at TIMESTAMP NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
          `);

          // Run safe column migrations
          await pgPool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS nrp VARCHAR(100);`);
          await pgPool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS jabatan VARCHAR(255);`);
          await pgPool.query(`ALTER TABLE certifications ADD COLUMN IF NOT EXISTS cert_number VARCHAR(100);`);
          await pgPool.query(`ALTER TABLE certifications ADD COLUMN IF NOT EXISTS cert_url TEXT;`);
          await pgPool.query(`
            CREATE TABLE IF NOT EXISTS cert_templates (
              id SERIAL PRIMARY KEY,
              template_url TEXT NOT NULL,
              positions JSONB NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
          `);

          tablesInitialized = true;
          console.log('✅ Neon PostgreSQL tables initialized and ready');
        } catch (err) {
          console.warn('⚠️ Postgres Table Init Warning:', err.message);
        }
      })();
    }
    await initPromise;
  }

  // Adapter untuk menyelaraskan sintaks pool.execute([rows]) ala mysql2
  pool = {
    async execute(sql, params = []) {
      await ensurePostgresTables();

      let paramIndex = 1;
      let pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
      
      // Jika query adalah INSERT dan belum ada RETURNING, tambahkan RETURNING id
      if (/^\s*INSERT\s+INTO/i.test(pgSql) && !/RETURNING/i.test(pgSql)) {
        pgSql += ' RETURNING id';
      }

      const res = await pgPool.query(pgSql, params);
      const rows = res.rows || [];
      
      // Sediakan insertId agar kompatibel dengan mysql2
      const insertResult = rows;
      if (rows.length > 0 && rows[0].id !== undefined) {
        insertResult.insertId = rows[0].id;
      } else if (res.oid) {
        insertResult.insertId = res.oid;
      }

      return [insertResult, res.fields];
    },
    async query(sql, params = []) {
      return this.execute(sql, params);
    },
    async getConnection() {
      await ensurePostgresTables();
      const client = await pgPool.connect();
      return {
        async execute(sql, params = []) {
          let paramIndex = 1;
          let pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
          
          if (/^\s*INSERT\s+INTO/i.test(pgSql) && !/RETURNING/i.test(pgSql)) {
            pgSql += ' RETURNING id';
          }

          const res = await client.query(pgSql, params);
          const rows = res.rows || [];
          
          const insertResult = rows;
          if (rows.length > 0 && rows[0].id !== undefined) {
            insertResult.insertId = rows[0].id;
          } else if (res.oid) {
            insertResult.insertId = res.oid;
          }

          return [insertResult, res.fields];
        },
        async query(sql, params = []) {
          return this.execute(sql, params);
        },
        async beginTransaction() {
          await client.query('BEGIN');
        },
        async commit() {
          await client.query('COMMIT');
        },
        async rollback() {
          try {
            await client.query('ROLLBACK');
          } catch (e) {}
        },
        release: () => client.release()
      };
    }
  };
} else {
  pool = mysql.createPool(
    dbUrl
      ? { uri: dbUrl, ssl: { rejectUnauthorized: false }, waitForConnections: true, connectionLimit: 10 }
      : {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT) || 3306,
          user: process.env.DB_USER || 'root',
          password: process.env.DB_PASSWORD || '',
          database: process.env.DB_NAME || 'rbt_simulation',
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
          enableKeepAlive: true,
          timezone: '+07:00'
        }
  );
}

/**
 * Test koneksi database saat startup
 */
async function testConnection() {
  try {
    const [rows] = await pool.execute('SELECT 1 AS connected');
    console.log(`✅ Database (${isPostgres ? 'Neon PostgreSQL' : 'MySQL'}) connected successfully`);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

module.exports = { pool, testConnection };
