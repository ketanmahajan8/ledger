import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/ledger';
const isLocal = connectionString.includes('localhost');

export const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

export async function query(text, params) {
  return pool.query(text, params);
}