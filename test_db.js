import pool from "./backend/src/config/db.js";

async function test() {
  try {
    const [rows] = await pool.query(`
      SELECT rd.*, u.full_name as owner_name, u.email as owner_email 
       FROM restaurant_details rd 
       JOIN users u ON rd.user_id = u.id 
    `);
    console.log("Restaurant Rows Count:", rows.length);
    console.log("First Row Sample:", rows[0]);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

test();
