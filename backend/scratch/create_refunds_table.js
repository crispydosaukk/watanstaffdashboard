// d:\zingbitedashboard\backend\scratch\create_refunds_table.js
import mysql from 'mysql2/promise';

(async () => {
    try {
        const conn = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            database: 'zingbite'
        });
        
        await conn.query(`
            CREATE TABLE IF NOT EXISTS order_refunds (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_number VARCHAR(50) NOT NULL,
                payment_intent_id VARCHAR(100),
                refund_id VARCHAR(100),
                amount DECIMAL(10,2) NOT NULL,
                status VARCHAR(20) DEFAULT 'processed',
                refunded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log("Order refunds table created or already exists.");
        await conn.end();
    } catch (error) {
        console.error("Error creating table:", error);
    }
})();
