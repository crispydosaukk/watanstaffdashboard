import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function seed() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('Restoring essential permissions and roles...');
        
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        
        // 1. Seed the 5 essential permissions (titles must match slugs used in sidebar)
        const permissionTitles = [
            'dashboard',
            'restaurant',
            'customer_info',
            'customer_details',
            'access'
        ];

        console.log('Seeding permissions...');
        const permissionIds = [];
        for (const title of permissionTitles) {
            const [res] = await connection.query(
                'INSERT INTO permissions (title) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)',
                [title]
            );
            permissionIds.push(res.insertId);
        }

        // 2. Create a "Super Admin" role
        console.log('Creating Super Admin role...');
        const [roleRes] = await connection.query(
            'INSERT INTO roles (title) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)',
            ['Super Admin']
        );
        const roleId = roleRes.insertId;

        // 3. Link role to permissions
        console.log('Linking role to permissions...');
        await connection.query('DELETE FROM permission_role WHERE role_id = ?', [roleId]);
        for (const pId of permissionIds) {
            await connection.query(
                'INSERT INTO permission_role (role_id, permission_id) VALUES (?, ?)',
                [roleId, pId]
            );
        }

        // 4. Assign this role to ALL users for now to ensure they can log in and see modules
        console.log('Assigning role to all users...');
        await connection.query('UPDATE users SET role_id = ?', [roleId]);

        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        
        console.log('Successfully restored 5 essential modules/permissions');
    } catch (err) {
        console.error('Seeding failed:', err);
    } finally {
        await connection.end();
    }
}

seed();
