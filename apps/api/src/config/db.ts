import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || '';
const isCloudDB = connectionString.includes('render.com') || process.env.DB_SSL === 'true';

export const pool = new Pool({
  connectionString,
  ssl: isCloudDB ? { rejectUnauthorized: false } : false
});