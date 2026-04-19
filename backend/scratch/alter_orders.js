import pool from "../src/config/db.js";

async function addTakeawayTime() {
  try {
    await pool.query("ALTER TABLE orders ADD COLUMN takeaway_time varchar(50) DEFAULT NULL AFTER allergy_note");
    console.log("Column added successfully!");
    process.exit(0);
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log("Column already exists.");
      process.exit(0);
    }
    console.error("ALTER TABLE FAILED:", err.message);
    process.exit(1);
  }
}

addTakeawayTime();
