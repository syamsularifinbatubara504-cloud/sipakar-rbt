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
      // Ubah placeholder MySQL (?) menjadi PostgreSQL ($1, $2, ...)
      let paramIndex = 1;
      const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
      const res = await pgPool.query(pgSql, params);
      return [res.rows, res.fields];
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
