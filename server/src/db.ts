import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

pool.on('error', (err) => {
  console.error('Unexpected database error:', err)
})

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
) {
  return pool.query<T>(text, params)
}