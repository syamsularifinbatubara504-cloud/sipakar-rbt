const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });
const bcrypt = require('bcrypt');

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!dbUrl) {
  console.error('Error: DATABASE_URL is missing in .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function runSeed() {
  try {
    console.log('Connecting to database...');
    
    // 1. Alter users table if needed
    try {
      await pool.query(`ALTER TABLE users ALTER COLUMN google_id DROP NOT NULL;`);
      console.log('Updated google_id to be nullable.');
    } catch (e) {
      if (e.code === '42701') console.log('google_id is already nullable.'); // 42701 means already exists or similar, but actually dropping NOT NULL doesn't error if it's already nullable in some pg versions, or throws. We just ignore.
    }
    
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);`);
      console.log('Added password column.');
    } catch (e) {
      console.log('Password column already exists or error:', e.message);
    }

    // 2. Define users
    const defaultPassword = 'password123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    const accounts = [
      { email: 'admin@spn.com', name: 'Administrator SPN', role: 'manajemen', spesialisasi: null },
      { email: 'gadik@spn.com', name: 'Instruktur Gadik', role: 'gadik', spesialisasi: 'reserse' },
      { email: 'siswa@spn.com', name: 'Siswa Prolat', role: 'siswa', spesialisasi: 'reserse' }
    ];

    for (const acc of accounts) {
      // Check if exists
      const res = await pool.query('SELECT id FROM users WHERE email = $1', [acc.email]);
      if (res.rows.length === 0) {
        await pool.query(
          `INSERT INTO users (email, name, password, role, spesialisasi) VALUES ($1, $2, $3, $4, $5)`,
          [acc.email, acc.name, hashedPassword, acc.role, acc.spesialisasi]
        );
        console.log(`Created account: ${acc.email} | Role: ${acc.role}`);
      } else {
        await pool.query(
          `UPDATE users SET password = $1, role = $2 WHERE email = $3`,
          [hashedPassword, acc.role, acc.email]
        );
        console.log(`Updated account: ${acc.email} | Role: ${acc.role}`);
      }
    }

    console.log('✅ Seeding completed successfully!');
    console.log('Use password "password123" for all local accounts.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
}

runSeed();
