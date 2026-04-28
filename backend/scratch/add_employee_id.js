import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function update() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('Adding employee_id to staff_members...');
        
        // 1. Add employee_id column
        await connection.query(`
            ALTER TABLE staff_members 
            ADD COLUMN employee_id VARCHAR(50) UNIQUE AFTER restaurant_id
        `);
        console.log('Added employee_id column');

        // 2. Generate IDs for existing staff (if any)
        const [rows] = await connection.query('SELECT id FROM staff_members');
        for (const row of rows) {
            const empId = `WS-${Math.floor(1000 + Math.random() * 9000)}-${row.id}`;
            await connection.query('UPDATE staff_members SET employee_id = ? WHERE id = ?', [empId, row.id]);
        }
        console.log(`Updated ${rows.length} existing staff members with IDs`);

    } catch (err) {
        console.error('Update failed:', err);
    } finally {
        await connection.end();
    }
}

update();
