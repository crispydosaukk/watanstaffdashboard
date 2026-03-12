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
    const [profiles] = await pool.query('SELECT * FROM merchant_store_profiles WHERE status = 0');
    console.log(`Found ${profiles.length} pending profiles.`);

    const [admins] = await pool.query('SELECT id FROM users WHERE role_id = 6');
    console.log(`Found ${admins.length} Super Admins.`);

    for (const profile of profiles) {
      const refId = `#ZBR-${profile.id.toString().padStart(4, '0')}`;
      const title = '🏪 New Restaurant Registration';
      const body = `A new registration request has been submitted by ${profile.first_name} ${profile.surname} for ${profile.store_name}.`;

      for (const admin of admins) {
        // Check if notification already exists to avoid duplicates
        const [existing] = await pool.query(
          'SELECT id FROM notifications WHERE user_id = ? AND user_type = "admin" AND order_number = ?',
          [admin.id, refId]
        );

        if (existing.length === 0) {
          await pool.query(
            'INSERT INTO notifications (user_id, user_type, title, body, is_read, order_number) VALUES (?, "admin", ?, ?, 0, ?)',
            [admin.id, title, body, refId]
          );
          console.log(`Created notification for Admin ${admin.id} - ${refId}`);
        } else {
          console.log(`Skipped existing notification for Admin ${admin.id} - ${refId}`);
        }
      }
    }
    console.log('Migration complete.');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
