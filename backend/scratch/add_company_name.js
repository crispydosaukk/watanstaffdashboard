import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('Checking tables...');
        const [tables] = await connection.query('SHOW TABLES');
        const tableNames = tables.map(t => Object.values(t)[0]);
        console.log('Table Names:', tableNames);

        let tableName = '';
        if (tableNames.includes('restaurant_details')) {
            tableName = 'restaurant_details';
        } else if (tableNames.includes('restuarent_details')) {
            tableName = 'restuarent_details';
        } else if (tableNames.includes('restaurant')) {
            tableName = 'restaurant';
        } else if (tableNames.includes('restuarent')) {
            tableName = 'restuarent';
        }

        if (!tableName) {
            console.error('Could not find restaurant table');
            return;
        }

        console.log(`Using table: ${tableName}`);

        await connection.query(`ALTER TABLE ${tableName} ADD COLUMN company_name VARCHAR(255) AFTER restaurant_name`);
        console.log('Successfully added company_name column');
    } catch (err) {
        if (err.code === 'ER_DUP_COLUMN') {
            console.log('Column already exists');
        } else {
            console.error('Migration failed:', err);
        }
    } finally {
        await connection.end();
    }
}

migrate();
