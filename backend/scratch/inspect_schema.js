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
  const [cols] = await pool.query("DESCRIBE categories");
  console.log("Categories Columns:", cols);
  
  const [fks] = await pool.query(`
    SELECT 
      COLUMN_NAME, 
      CONSTRAINT_NAME, 
      REFERENCED_TABLE_NAME, 
      REFERENCED_COLUMN_NAME
    FROM
      INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE
      TABLE_NAME = 'categories' AND TABLE_SCHEMA = 'zingbite'
  `);
  console.log("Foreign Keys:", fks);
    
  process.exit(0);
}
check();
