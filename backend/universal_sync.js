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
    console.log('--- STARTING NOTIFICATION SYNC ---');

    // 1. Get ALL Super Admins
    const [admins] = await pool.query(`
      SELECT u.id, u.name 
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE LOWER(r.title) = 'super admin'
    `);
    console.log('Admins found:', admins.map(a => `${a.id}(${a.name})`).join(', '));

    if (admins.length === 0) {
      console.log('ERROR: No Super Admins found. Check roles table.');
      return;
    }

    // 2. Get ALL Pending Merchant Profiles
    const [profiles] = await pool.query('SELECT id, first_name, surname, store_name FROM merchant_store_profiles WHERE status = 0');
    console.log(`Pending profiles: ${profiles.length}`);

    // 3. Delete existing registration notifications to avoid mess
    await pool.query('DELETE FROM notifications WHERE order_number LIKE "#ZBR-%"');
    console.log('Cleared old registration notifications.');

    // 4. Create new ones for EVERY admin
    for (const profile of profiles) {
      const refId = `#ZBR-${profile.id.toString().padStart(4, '0')}`;
      const title = '🏪 New Restaurant Registration';
      const body = `Registration request for ${profile.store_name} by ${profile.first_name} ${profile.surname}.`;

      for (const admin of admins) {
          await pool.query(
            'INSERT INTO notifications (user_id, user_type, title, body, is_read, order_number, created_at) VALUES (?, "admin", ?, ?, 0, ?, NOW())',
            [admin.id, title, body, refId]
          );
          console.log(`Created notification for Admin ${admin.id} - ${refId}`);
      }
    }
    
    console.log('--- SYNC COMPLETE ---');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
