import pool from "../../config/db.js";
import { sendNotification } from "../../utils/sendNotification.js";

export const getTableReservations = async (req, res) => {
  try {
    const userId = req.user.id;
    const roleId = req.user.role_id;
    const roleName = req.user.role || req.user.role_title || null;
    const isSuperAdmin = (Number(roleId) === 6) || (typeof roleName === "string" && roleName.toLowerCase() === "super admin");

    let query = `SELECT * FROM table_reservations ORDER BY created_at DESC`;
    let params = [];

    if (!isSuperAdmin) {
      query = `SELECT * FROM table_reservations WHERE user_id = ? ORDER BY created_at DESC`;
      params = [userId];
    }

    const [rows] = await pool.query(query, params);
    res.json({ status: 1, data: rows });
  } catch (error) {
    console.error("Error in getTableReservations:", error);
    res.status(500).json({ status: 0, message: "Internal server error." });
  }
};

export const updateReservationStatus = async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  if (!status) {
    return res.status(400).json({ status: 0, message: "Status is required." });
  }

  try {
    // 1️⃣ Get Customer & Reservation Info for Notification
    const [[resData]] = await pool.query(
      "SELECT customer_id, customer_name, table_number, reservation_date, reservation_time FROM table_reservations WHERE id = ?",
      [id]
    );

    // 2️⃣ Update Status
    await pool.query(
      `UPDATE table_reservations SET status = ?, notes = ? WHERE id = ?`,
      [status, notes || null, id]
    );

    // 3️⃣ Notify Customer
    if (resData?.customer_id) {
      const formattedDate = resData.reservation_date ? new Date(resData.reservation_date).toLocaleDateString() : "";
      const formattedTime = (resData.reservation_time || "").slice(0, 5);

      const statusMap = {
        confirmed: {
          title: "✅ Table Confirmed",
          body: `Your reservation for table ${resData.table_number || "request"} on ${formattedDate} at ${formattedTime} is confirmed!`
        },
        seated: { title: "🍴 You're Seated", body: "Welcome to ZingBite! Enjoy your meal." },
        completed: { title: "✨ Thank You", body: "We hope you enjoyed your visit. See you again soon!" },
        cancelled: { title: "❌ Table Cancelled", body: "Your reservation has been cancelled." },
        no_show: { title: "⚠️ No Show", body: "We missed you today!" }
      };

      if (statusMap[status]) {
        const notif = statusMap[status];
        try {
          await sendNotification({
            userType: "customer",
            userId: resData.customer_id,
            title: notif.title,
            body: notif.body,
            data: {
              type: "RESERVATION_UPDATE",
              res_id: String(id),
              status
            }
          });
        } catch (e) {
          console.error("Customer notification failed:", e.message);
        }
      }
    }

    res.json({ status: 1, message: "Reservation status updated." });
  } catch (error) {
    console.error("Error in updateReservationStatus:", error);
    res.status(500).json({ status: 0, message: "Internal server error." });
  }
};

export const deleteReservation = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM table_reservations WHERE id = ?", [id]);
    res.json({ status: 1, message: "Reservation deleted successfully." });
  } catch (error) {
    console.error("Error in deleteReservation:", error);
    res.status(500).json({ status: 0, message: "Internal server error." });
  }
};

export const getReservationSettings = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1️⃣ Ensure settings row exists for this merchant user
    // (Using an atomic query or checking first)
    const [rows] = await pool.query(
      "SELECT * FROM table_reservation_settings WHERE user_id = ?",
      [userId]
    );

    if (rows.length === 0) {
      // Default: disabled, all days off
      await pool.query(
        "INSERT IGNORE INTO table_reservation_settings (user_id, is_enabled, monday, tuesday, wednesday, thursday, friday, saturday, sunday) VALUES (?, 0, 0, 0, 0, 0, 0, 0, 0)",
        [userId]
      );
      const [newRows] = await pool.query(
        "SELECT * FROM table_reservation_settings WHERE user_id = ?",
        [userId]
      );
      return res.json({ status: 1, data: newRows[0] || {} });
    }

    res.json({ status: 1, data: rows[0] });
  } catch (error) {
    // If table doesn't exist, create it once and retry (safe one-time migration)
    if (error.code === 'ER_NO_SUCH_TABLE') {
      try {
        await pool.query(`
          CREATE TABLE table_reservation_settings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            is_enabled TINYINT(1) DEFAULT 1,
            monday TINYINT(1) DEFAULT 1,
            tuesday TINYINT(1) DEFAULT 1,
            wednesday TINYINT(1) DEFAULT 1,
            thursday TINYINT(1) DEFAULT 1,
            friday TINYINT(1) DEFAULT 1,
            saturday TINYINT(1) DEFAULT 1,
            sunday TINYINT(1) DEFAULT 1,
            UNIQUE(user_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        return getReservationSettings(req, res); // Recurse once
      } catch (err2) {
        console.error("Failed to create settings table:", err2);
      }
    }
    console.error("Error in getReservationSettings:", error);
    res.status(500).json({ status: 0, message: "Failed to fetch reservation settings." });
  }
};

export const updateReservationSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { is_enabled, monday, tuesday, wednesday, thursday, friday, saturday, sunday } = req.body;

    const [result] = await pool.query(
      `UPDATE table_reservation_settings 
       SET is_enabled = ?, monday = ?, tuesday = ?, wednesday = ?, thursday = ?, friday = ?, saturday = ?, sunday = ?
       WHERE user_id = ?`,
      [
        is_enabled ? 1 : 0,
        monday ? 1 : 0,
        tuesday ? 1 : 0,
        wednesday ? 1 : 0,
        thursday ? 1 : 0,
        friday ? 1 : 0,
        saturday ? 1 : 0,
        sunday ? 1 : 0,
        userId
      ]
    );

    res.json({ status: 1, message: "Reservation settings updated successfully!" });
  } catch (error) {
    console.error("Error in updateReservationSettings:", error);
    res.status(500).json({ status: 0, message: "Internal server error." });
  }
};
