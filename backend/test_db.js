import pool from "./src/config/db.js";

async function test() {
  try {
    const [rows] = await pool.query(`
      SELECT rd.*, u.full_name as owner_name, u.email as owner_email 
       FROM restaurant_details rd 
       JOIN users u ON rd.user_id = u.id 
    `);
    console.log("Restaurant Rows Count:", rows.length);
    if (rows.length > 0) {
      console.log("First Row Sample (Keys):", Object.keys(rows[0]));
      console.log("Sample Data: ", JSON.stringify(rows[0], null, 2));
    } else {
      console.log("No restaurants found with owner join.");
      // Check if they exist without owner join
      const [all_rd] = await pool.query("SELECT * FROM restaurant_details");
      console.log("Total restaurant_details records:", all_rd.length);
      if (all_rd.length > 0) {
        console.log("First record user_id:", all_rd[0].user_id);
        const [u] = await pool.query("SELECT * FROM users WHERE id = ?", [all_rd[0].user_id]);
        console.log("User for first record exists?", u.length > 0);
      }
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

test();
