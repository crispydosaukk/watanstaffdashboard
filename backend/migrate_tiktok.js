import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../../.env") });

async function migrate() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "zingbite",
  });

  try {
    console.log("Renaming column...");
    await pool.query("ALTER TABLE restaurant_details CHANGE COLUMN restaurant_linkedin restaurant_tiktok VARCHAR(255)");
    console.log("Success!");
  } catch (err) {
    console.error("Migration failed:", err.message);
  } finally {
    process.exit();
  }
}

migrate();
