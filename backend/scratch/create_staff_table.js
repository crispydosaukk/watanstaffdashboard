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
        console.log('Creating staff_members table...');
        
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS staff_members (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                restaurant_id BIGINT UNSIGNED NOT NULL,
                full_name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                phone_number VARCHAR(20) NULL,
                designation VARCHAR(100) NULL,
                gender ENUM('Male', 'Female', 'Other') NULL,
                dob DATE NULL,
                profile_image VARCHAR(255) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP NULL,
                INDEX (restaurant_id),
                INDEX (email)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;

        await connection.query(createTableQuery);
        console.log('Successfully created staff_members table');

        // Also add the permission for Staff Management
        console.log('Adding Staff Management permission...');
        await connection.query(
            "INSERT INTO permissions (title) VALUES (?) ON DUPLICATE KEY UPDATE title=title",
            ['staff_management']
        );
        
        // Link it to Super Admin role
        const [roles] = await connection.query("SELECT id FROM roles WHERE title = 'Super Admin' LIMIT 1");
        if (roles.length > 0) {
            const roleId = roles[0].id;
            const [perms] = await connection.query("SELECT id FROM permissions WHERE title = 'staff_management' LIMIT 1");
            if (perms.length > 0) {
                const permId = perms[0].id;
                await connection.query(
                    "INSERT INTO permission_role (role_id, permission_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE role_id=role_id",
                    [roleId, permId]
                );
                console.log('Linked staff_management permission to Super Admin');
            }
        }

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await connection.end();
    }
}

migrate();
