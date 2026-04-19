import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "zingbite",
});

async function check() {
  const [users] = await pool.query("SELECT id, name, email FROM users");
  console.log("Users:", users);
  const [details] = await pool.query("SELECT id, user_id, restaurant_name FROM restaurant_details");
  console.log("Restaurants:", details);
  process.exit(0);
}
check();
