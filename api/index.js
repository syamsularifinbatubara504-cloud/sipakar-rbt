const mysql = require('mysql2/promise');
const { Client } = require('pg');

module.exports = async function(req, res) {
  try {
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';

    // Deteksi jika menggunakan Neon Database / PostgreSQL
    if (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://')) {
      const client = new Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
      });

      await client.connect();
      const result = await client.query('SELECT \'Koneksi ke Neon Database (PostgreSQL) Berhasil!\' AS pesan');
      await client.end();

      return res.status(200).json({ 
        status: 'Sukses', 
        provider: 'Neon Database (PostgreSQL)',
        hasil: result.rows[0] 
      });
    }

    // Default ke MySQL (Aiven atau MySQL lokal)
    const connection = await mysql.createConnection({
      uri: dbUrl,
      ssl: { rejectUnauthorized: false }
    });
    
    const [rows] = await connection.execute('SELECT "Koneksi ke MySQL Database Berhasil!" AS pesan');
    await connection.end();
    
    return res.status(200).json({ 
      status: 'Sukses', 
      provider: 'MySQL Database',
      hasil: rows[0] 
    });

  } catch (error) {
    return res.status(500).json({ status: 'Error', pesan: error.message });
  }
};
