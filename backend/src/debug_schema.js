import pool from "./config/db.js";

async function checkSchema() {
  try {
    console.log("Checking restaurant_details schema details...");
    const [cols] = await pool.query("DESCRIBE restaurant_details");
    console.log("Details for restaurant_details:");
    console.table(cols);

    process.exit(0);
  } catch (err) {
    console.error("SCHEMA CHECK FAILED:", err.message);
    process.exit(1);
  }
}

checkSchema();
