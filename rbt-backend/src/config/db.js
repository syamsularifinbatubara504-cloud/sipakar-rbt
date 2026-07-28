/**
 * Multi-database Connection Pool (Support MySQL & Neon PostgreSQL)
 */
const mysql = require('mysql2/promise');
const { Pool: PgPool } = require('pg');
require('dotenv').config();

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');

let pool;

if (isPostgres) {
  const pgPool = new PgPool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  // Adapter untuk menyelaraskan sintaks pool.execute([rows]) ala mysql2
  pool = {
    async execute(sql, params = []) {
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
      const client = await pgPool.connect();
      return {
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
 * Inisialisasi tabel untuk PostgreSQL (Neon DB) jika belum ada
 */
async function initPostgresTables() {
  if (!isPostgres) return;
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        google_id VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        picture_url TEXT,
        role VARCHAR(50) DEFAULT 'gadik',
        spesialisasi VARCHAR(50) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.execute(`
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
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS legal_references (
        id SERIAL PRIMARY KEY,
        simulation_id INT NOT NULL,
        pasal_number VARCHAR(100) NOT NULL,
        undang_undang VARCHAR(500) NOT NULL,
        deskripsi TEXT,
        ancaman_pidana TEXT,
        raw_response TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.execute(`
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
      )
    `);

    console.log('✅ Neon PostgreSQL tables initialized successfully');
  } catch (err) {
    console.warn('⚠️  PostgreSQL Table Init Notice:', err.message);
  }
}

/**
 * Test koneksi database saat startup
 */
async function testConnection() {
  try {
    await pool.execute('SELECT 1 AS connected');
    console.log(`✅ Database (${isPostgres ? 'Neon PostgreSQL' : 'MySQL'}) connected successfully`);
    if (isPostgres) {
      await initPostgresTables();
    }
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

module.exports = { pool, testConnection };
