import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function run() {
  try {
    const [rows] = await pool.query('SELECT * FROM notifications WHERE user_type = "admin" AND is_read = 0');
    console.log('Unread Admin Notifications:', JSON.stringify(rows, null, 2));
    
    // Check if any notifications exist at all
    const [all] = await pool.query('SELECT COUNT(*) as count FROM notifications');
    console.log('Total Notifications in DB:', all[0].count);
    
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
