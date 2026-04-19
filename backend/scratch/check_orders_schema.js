import pool from "../src/config/db.js";

async function checkOrdersSchema() {
  try {
    const [cols] = await pool.query("DESCRIBE orders");
    console.table(cols);
    process.exit(0);
  } catch (err) {
    console.error("SCHEMA CHECK FAILED:", err.message);
    process.exit(1);
  }
}

checkOrdersSchema();
