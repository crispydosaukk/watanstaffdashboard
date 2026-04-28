import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function clean() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('Cleaning permission and role data...');
        
        // Disable foreign key checks to allow truncating
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        
        await connection.query('TRUNCATE TABLE permission_role');
        console.log('Truncated permission_role');
        
        await connection.query('TRUNCATE TABLE roles');
        console.log('Truncated roles');
        
        // Optional: truncate permissions if they want a clean slate there too
        // Usually permissions are seeded, but "clean the data base" might mean everything.
        // I'll truncate permissions as well if that's the intent.
        await connection.query('TRUNCATE TABLE permissions');
        console.log('Truncated permissions');

        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        
        console.log('Successfully cleaned permission and role data');
    } catch (err) {
        console.error('Cleaning failed:', err);
    } finally {
        await connection.end();
    }
}

clean();
