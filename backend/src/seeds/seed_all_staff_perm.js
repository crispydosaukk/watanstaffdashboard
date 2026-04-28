import pool from "../config/db.js";

async function run() {
  try {
    // Check if already exists
    const [existing] = await pool.query(
      "SELECT id FROM permissions WHERE title = 'all_staff' LIMIT 1"
    );

    if (existing.length > 0) {
      console.log("✅ 'all_staff' permission already exists with ID:", existing[0].id);
    } else {
      const [result] = await pool.query(
        "INSERT INTO permissions (title, created_at, updated_at) VALUES ('all_staff', NOW(), NOW())"
      );
      console.log("✅ Inserted 'all_staff' permission with ID:", result.insertId);
    }

    // Show all permissions
    const [perms] = await pool.query(
      "SELECT id, title FROM permissions WHERE deleted_at IS NULL ORDER BY id"
    );
    console.log("\n📋 All Permissions:");
    perms.forEach(p => console.log(`  [${p.id}] ${p.title}`));

    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

run();
