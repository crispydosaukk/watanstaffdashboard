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
    // 1. Get all pending profiles
    const [profiles] = await pool.query('SELECT id, first_name, surname, store_name FROM merchant_store_profiles WHERE status = 0');
    console.log(`Found ${profiles.length} pending profiles.`);

    // 2. Get all Super Admins
    const [admins] = await pool.query(`
      SELECT u.id 
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE LOWER(r.title) = 'super admin'
    `);
    console.log(`Found ${admins.length} Super Admins:`, admins.map(a => a.id));

    // 3. Ensure notification exists for each combination
    for (const profile of profiles) {
      const refId = `#ZBR-${profile.id.toString().padStart(4, '0')}`;
      const title = '🏪 New Restaurant Registration';
      const body = `A new registration request has been submitted by ${profile.first_name} ${profile.surname} for ${profile.store_name}.`;

      for (const admin of admins) {
        const [existing] = await pool.query(
          'SELECT id FROM notifications WHERE user_id = ? AND user_type = "admin" AND order_number = ?',
          [admin.id, refId]
        );

        if (existing.length === 0) {
          await pool.query(
            'INSERT INTO notifications (user_id, user_type, title, body, is_read, order_number) VALUES (?, "admin", ?, ?, 0, ?)',
            [admin.id, title, body, refId]
          );
          console.log(`CREATED notification for Admin ${admin.id} - ${refId}`);
        } else {
          await pool.query(
            'UPDATE notifications SET is_read = 0 WHERE id = ?',
            [existing[0].id]
          );
          console.log(`UPDATED notification for Admin ${admin.id} - ${refId} to UNREAD`);
        }
      }
    }
    console.log('Sync complete.');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
