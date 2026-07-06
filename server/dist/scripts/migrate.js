import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { pool } from '../db.js';
dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, '../../../db/migrations');
async function migrate() {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
    const files = fs
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort();
    for (const file of files) {
        const applied = await pool.query('SELECT 1 FROM schema_migrations WHERE filename = $1', [file]);
        if (applied.rowCount) {
            console.log(`Skipping ${file} (already applied)`);
            continue;
        }
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(sql);
            await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
            await client.query('COMMIT');
            console.log(`Applied ${file}`);
        }
        catch (err) {
            await client.query('ROLLBACK');
            throw err;
        }
        finally {
            client.release();
        }
    }
    console.log('Migrations complete');
    await pool.end();
}
migrate().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
